import { email } from './email/email';
import app from './hono/webs';
import emailService from './service/email-service';
import userService from './service/user-service';

export default {
	async fetch(req, env, ctx) {
		const url = new URL(req.url);
		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '');
			req = new Request(url.toString(), req);
			return app.fetch(req, env, ctx);
		}
		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(event, env, ctx) {
		switch (event.cron) {
			case '0 16 * * *':
				await userService.resetDaySendCount({ env });
				await userService.updateUserForword({ env });
				await emailService.deleteEmailForCron({ env });
				break;
			default:
				console.log('Other cron or local test');
		}
	},
};
