import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc, like, and } from 'drizzle-orm';
import archiver from 'archiver';
import { createReadStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	const url = new URL(event.request.url);
	const usernameFilter = url.searchParams.get('username') || '';

	try {
		// 构建查询条件
		let whereCondition;
		if (usernameFilter) {
			// 如果有用户名筛选，需要 join 用户表
			const tasks = await db
				.select({
					id: table.metaParseTask.id,
					userId: table.metaParseTask.userId,
					parseType: table.metaParseTask.parseType,
					fileName: table.metaParseTask.fileName,
					filePath: table.metaParseTask.filePath,
					pageNum: table.metaParseTask.pageNum,
					status: table.metaParseTask.status,
					createdAt: table.metaParseTask.createdAt,
					updatedAt: table.metaParseTask.updatedAt,
					username: table.user.username
				})
				.from(table.metaParseTask)
				.innerJoin(table.user, eq(table.metaParseTask.userId, table.user.id))
				.where(like(table.user.username, `%${usernameFilter}%`))
				.orderBy(desc(table.metaParseTask.createdAt));
			
			return {
				tasks,
				currentUser: event.locals.user,
				usernameFilter
			};
		} else {
			// 没有筛选条件，获取所有任务
			const tasks = await db
				.select({
					id: table.metaParseTask.id,
					userId: table.metaParseTask.userId,
					parseType: table.metaParseTask.parseType,
					fileName: table.metaParseTask.fileName,
					filePath: table.metaParseTask.filePath,
					pageNum: table.metaParseTask.pageNum,
					status: table.metaParseTask.status,
					createdAt: table.metaParseTask.createdAt,
					updatedAt: table.metaParseTask.updatedAt,
					username: table.user.username
				})
				.from(table.metaParseTask)
				.innerJoin(table.user, eq(table.metaParseTask.userId, table.user.id))
				.orderBy(desc(table.metaParseTask.createdAt));

			return {
				tasks,
				currentUser: event.locals.user,
				usernameFilter
			};
		}
	} catch (error) {
		console.error('获取任务列表失败:', error);
		return {
			tasks: [],
			currentUser: event.locals.user,
			usernameFilter,
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

			// 这里应该创建压缩包并返回下载链接
			// 由于SvelteKit的限制，实际实现可能需要创建一个API端点
			return { 
				success: true, 
				message: '正在准备下载文件...',
				downloadUrl: `/api/download/${taskId}`
			};

		} catch (error) {
			console.error('准备下载失败:', error);
			return fail(500, { message: '准备下载失败' });
		}
	}
};
