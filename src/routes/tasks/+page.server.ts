import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc, like, and, sql } from 'drizzle-orm';
import archiver from 'archiver';
import { createReadStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	try {
		// 获取所有用户信息用于下拉菜单
		const users = await db
			.select({
				id: table.user.id,
				username: table.user.username
			})
			.from(table.user)
			.orderBy(table.user.username);

		// 默认获取所有任务
		const tasks = await db
			.select({
				id: table.metaParseTask.id,
				userId: table.metaParseTask.userId,
				parseType: table.metaParseTask.parseType,
				fileName: table.metaParseTask.fileName,
				filePath: table.metaParseTask.filePath,
				pageNum: table.metaParseTask.pageNum,
				status: table.metaParseTask.status,
				createdAt: sql<string>`DATE_FORMAT(${table.metaParseTask.createdAt}, '%Y-%m-%d %H:%i:%s')`,
				updatedAt: sql<string>`DATE_FORMAT(${table.metaParseTask.updatedAt}, '%Y-%m-%d %H:%i:%s')`,
				username: table.user.username
			})
			.from(table.metaParseTask)
			.innerJoin(table.user, eq(table.metaParseTask.userId, table.user.id))
			.orderBy(desc(table.metaParseTask.createdAt));

		return {
			tasks,
			currentUser: event.locals.user,
			users
		};
	} catch (error) {
		console.error('获取任务列表失败:', error);
		return {
			tasks: [],
			currentUser: event.locals.user,
			users: [],
			error: '获取任务列表失败'
		};
	}
};

export const actions: Actions = {
	delete: async (event) => {
		if (!event.locals.user) {
			return fail(401, { message: '请先登录' });
		}

		const formData = await event.request.formData();
		const taskId = formData.get('taskId');

		if (!taskId || typeof taskId !== 'string') {
			return fail(400, { message: '无效的任务ID' });
		}

		try {
			// 检查任务是否存在且属于当前用户
			const [task] = await db
				.select()
				.from(table.metaParseTask)
				.where(eq(table.metaParseTask.id, parseInt(taskId)))
				.limit(1);

			if (!task) {
				return fail(404, { message: '任务不存在' });
			}

			if (task.userId !== event.locals.user.id && event.locals.user.role !== 'admin') {
				return fail(403, { message: '无权限删除此任务' });
			}

			// 删除相关的OCR和翻译记录
			await db.delete(table.metaOcrOutput).where(eq(table.metaOcrOutput.taskId, parseInt(taskId)));
			await db.delete(table.metaTranslateOutput).where(eq(table.metaTranslateOutput.taskId, parseInt(taskId)));
			
			// 删除任务记录
			await db.delete(table.metaParseTask).where(eq(table.metaParseTask.id, parseInt(taskId)));

			return { success: true, message: '任务删除成功' };
		} catch (error) {
			console.error('删除任务失败:', error);
			return fail(500, { message: '删除任务失败' });
		}
	},

	download: async (event) => {
		if (!event.locals.user) {
			return fail(401, { message: '请先登录' });
		}

		const formData = await event.request.formData();
		const taskId = formData.get('taskId');

		if (!taskId || typeof taskId !== 'string') {
			return fail(400, { message: '无效的任务ID' });
		}

		try {
			// 检查任务是否完成
			const [task] = await db
				.select()
				.from(table.metaParseTask)
				.where(eq(table.metaParseTask.id, parseInt(taskId)))
				.limit(1);

			if (!task) {
				return fail(404, { message: '任务不存在' });
			}

			if (task.status !== 2) {
				return fail(400, { message: '任务尚未完成，无法下载' });
			}

		} catch (error) {
			console.error('检查任务状态失败:', error);
			return fail(500, { message: '检查任务状态失败' });
		}

		// 直接重定向到下载API端点
		console.log(`重定向到下载API: /api/download/${taskId}`);
		throw redirect(302, `/api/download/${taskId}`);
	}
};

