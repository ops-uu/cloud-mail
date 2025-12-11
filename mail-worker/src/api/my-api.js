import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import userService from '../service/user-service';

app.get('/my/loginUserInfo', async (c) => {
	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	return c.json(result.ok(user));
});

app.put('/my/resetPassword', async (c) => {
	await userService.resetPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/my/delete', async (c) => {
	await userService.delete(c, userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/my/updateForwordEmail', async (c) => {
	const params = await c.req.json();
	await userService.setForwordEmailByUser(c, params.emailForward, params.forwardAddr, userContext.getUserId(c));
	return c.json(result.ok());
});
