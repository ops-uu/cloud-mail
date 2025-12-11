import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import PostalMime from 'postal-mime';
import { Resend } from 'resend';
import constant from '../const/constant';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import accountService from '../service/account-service';
import attService from '../service/att-service';
import emailService from '../service/email-service';
import settingService from '../service/setting-service';
import userService from '../service/user-service';
import emailUtils from '../utils/email-utils';
import fileUtils from '../utils/file-utils';

dayjs.extend(utc);
dayjs.extend(timezone);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export async function email(message, env, ctx) {
	try {
		const { receive, tgBotToken, tgChatId, tgBotStatus, forwardStatus, forwardEmail, ruleEmail, ruleType, r2Domain } =
			await settingService.query({ env });

		if (receive === settingConst.receive.CLOSE) {
			return;
		}

		const account = await accountService.selectByEmailIncludeDelNoCase({ env: env }, message.to);

		const reader = message.raw.getReader();
		let content = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			content += new TextDecoder().decode(value);
		}

		const email = await PostalMime.parse(content);

		const toName = email.to.find((item) => item.address === message.to)?.name || '';

		const params = {
			toEmail: message.to,
			toName: toName,
			sendEmail: email.from.address,
			name: email.from.name || emailUtils.getName(email.from.address),
			subject: email.subject,
			content: email.html,
			text: email.text,
			cc: email.cc ? JSON.stringify(email.cc) : '[]',
			bcc: email.bcc ? JSON.stringify(email.bcc) : '[]',
			recipient: JSON.stringify(email.to),
			inReplyTo: email.inReplyTo,
			relation: email.references,
			messageId: email.messageId,
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			isDel: isDel.DELETE,
			status: emailConst.status.SAVING,
		};

		const attachments = [];
		const cidAttachments = [];

		for (let item of email.attachments) {
			let attachment = { ...item };
			attachment.key =
				constant.ATTACHMENT_PREFIX + (await fileUtils.getBuffHash(attachment.content)) + fileUtils.getExtFileName(item.filename);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);
			if (attachment.contentId) {
				cidAttachments.push(attachment);
			}
		}

		let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

		attachments.forEach((attachment) => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		if (attachments.length > 0 && env.r2) {
			await attService.addAtt({ env }, attachments);
		}

		emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);

		if (ruleType === settingConst.ruleType.RULE) {
			const emails = ruleEmail.split(',');

			if (!emails.includes(message.to)) {
				return;
			}
		}

		if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
			const tgMessage = `<b>${params.subject}</b>

<b>发件人：</b>${params.name}		&lt;${params.sendEmail}&gt;
<b>收件人：\u200B</b>${message.to}
<b>时间：</b>${dayjs.utc(emailRow.createTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm')}

${params.text || emailUtils.htmlToText(params.content) || ''}
`;

			const tgChatIds = tgChatId.split(',');

			await Promise.all(
				tgChatIds.map(async (chatId) => {
					try {
						const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								chat_id: chatId,
								parse_mode: 'HTML',
								text: tgMessage,
							}),
						});
						if (!res.ok) {
							console.error(`转发 Telegram 失败: chatId=${chatId}, 状态码=${res.status}`);
						}
					} catch (e) {
						console.error(`转发 Telegram 失败: chatId=${chatId}`, e);
					}
				}),
			);
		}

		if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {
			const emails = forwardEmail.split(',');

			await Promise.all(
				emails.map(async (email) => {
					try {
						await message.forward(email);
					} catch (e) {
						console.error(`转发邮箱 ${email} 失败：`, e);
					}
				}),
			);
		}

		// 获取用户信息,进行邮件转发
		if (params.userId !== 0) {
			const { resendTokens, r2Domain, send } = await settingService.query({ env });
			const domain = emailUtils.getDomain(account.email);
			const resendToken = resendTokens[domain];
			if (resendToken) {
				const userInfo = await userService.selectById({ env }, params.userId);
				if (userInfo.EmailForward == 1) {
					if (userInfo.ForwardAddr != '') {
						const fowardAddrList = userInfo.ForwardAddr.split(';');
						if (userInfo.ToadyForwardCount + fowardAddrList.length <= userInfo.ForwardCount || userInfo.ForwardCount == -1) {
		                    // 逐个发送邮件给每个收件人
		                    for (const forwardAddr of fowardAddrList) {
		                        const sendForm = {
		                            from: `"${email.from.address}" <${account.email}>`,
		                            to: [forwardAddr],  // 每次发送给一个收件人
		                            subject: `${email.subject} (From By ${email.from.address} To ${forwardAddr})`,
		                            text: email.text,
		                            html: email.html,
		                            attachments: email.attachments,
		                        };
		
		                        const resend = new Resend(resendToken);
		                        try {
		                            const resendResult = await resend.emails.send(sendForm);
		                            console.log(`Email sent to ${forwardAddr} successfully:`, resendResult);
		                        } catch (error) {
		                            console.error(`Error sending email to ${forwardAddr}:`, error);
		                        }
								await sleep(500);  // 等待500毫秒
							}
		                    // 更新转发次数
						}
					}
				}
			}
		}
	} catch (e) {
		console.error('邮件接收异常: ', e);
	}
}
