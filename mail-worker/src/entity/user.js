import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
const user = sqliteTable('user', {
	userId: integer('user_id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull(),
	type: integer('type').default(1).notNull(),
	password: text('password').notNull(),
	salt: text('salt').notNull(),
	status: integer('status').default(0).notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`),
	activeTime: text('active_time'),
	createIp: text('create_ip'),
	activeIp: text('active_ip'),
	os: text('os'),
	browser: text('browser'),
	device: text('device'),
	sort: text('sort').default(0),
	sendCount: text('send_count').default(0),
	isDel: integer('is_del').default(0).notNull(),
	EmailForward: integer('email_forward').default(0).notNull(),
	ForwardAddr: text('forward_addr'),
	ForwardCount: integer('forward_count').default(0).notNull(),
	ToadyForwardCount: integer('toady_forward_count').default(0).notNull(),
});
// alter table user add column email_forward INTEGER DEFAULT 0 NOT NULL;
// alter table  user add column forward_addr TEXT;
// alter table user add column forward_count INTEGER DEFAULT 0 NOT NULL;
export default user;
