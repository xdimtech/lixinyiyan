import { mysqlTable, serial, int, varchar, datetime, text, tinyint, bigint } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// 用户表 - 扩展原有用户表
export const user = mysqlTable('user', {
	id: varchar('id', { length: 255 }).primaryKey(),
	username: varchar('username', { length: 32 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	role: varchar('role', { length: 20 }).notNull().default('member'), // member | manager | admin
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
	isDeleted: tinyint('is_deleted').notNull().default(0)
});

// Session表保持不变
export const session = mysqlTable('session', {
	id: varchar('id', { length: 255 }).primaryKey(),
	userId: varchar('user_id', { length: 255 })
		.notNull()
		.references(() => user.id),
	expiresAt: datetime('expires_at').notNull()
});

// 文件解析翻译任务表
export const metaParseTask = mysqlTable('meta_parse_task', {
	id: serial('id').primaryKey(),
	userId: varchar('user_id', { length: 255 })
		.notNull()
		.references(() => user.id),
	parseType: varchar('parse_type', { length: 20 }).notNull(), // "only_ocr" | "translate"
	fileName: varchar('file_name', { length: 255 }).notNull(),
	filePath: varchar('file_path', { length: 500 }).notNull(),
	pageNum: int('page_num').notNull(),
	status: int('status').notNull().default(0), // 0-pending; 1-processing; 2-finished; 3-failed
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
	isDeleted: tinyint('is_deleted').notNull().default(0)
});

// 图片OCR表
export const metaOcrOutput = mysqlTable('meta_ocr_output', {
	id: serial('id').primaryKey(),
	taskId: bigint('task_id', { mode: 'number' })
		.notNull()
		.references(() => metaParseTask.id),
	inputFilePath: varchar('input_file_path', { length: 500 }).notNull(),
	outputTxtPath: varchar('output_txt_path', { length: 500 }),
	status: int('status').notNull().default(0), // 0-pending; 1-processing; 2-finished; 3-failed
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
	isDeleted: tinyint('is_deleted').notNull().default(0)
});

// TXT翻译表
export const metaTranslateOutput = mysqlTable('meta_translate_output', {
	id: serial('id').primaryKey(),
	taskId: bigint('task_id', { mode: 'number' })
		.notNull()
		.references(() => metaParseTask.id),
	inputFilePath: varchar('input_file_path', { length: 500 }).notNull(),
	outputTxtPath: varchar('output_txt_path', { length: 500 }),
	status: int('status').notNull().default(0), // 0-pending; 1-processing; 2-finished; 3-failed
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
	isDeleted: tinyint('is_deleted').notNull().default(0)
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type MetaParseTask = typeof metaParseTask.$inferSelect;
export type MetaOcrOutput = typeof metaOcrOutput.$inferSelect;
export type MetaTranslateOutput = typeof metaTranslateOutput.$inferSelect;
