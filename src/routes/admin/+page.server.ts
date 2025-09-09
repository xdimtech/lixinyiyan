import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	// 只有管理员可以访问
	if (event.locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}

	try {
		// 获取统计数据
		const [totalUsers] = await db.select({ count: count() }).from(table.user);
		const [totalTasks] = await db.select({ count: count() }).from(table.metaParseTask);
		const [pendingTasks] = await db
			.select({ count: count() })
			.from(table.metaParseTask)
			.where(eq(table.metaParseTask.status, 0));
		const [processingTasks] = await db
			.select({ count: count() })
			.from(table.metaParseTask)
			.where(eq(table.metaParseTask.status, 1));
		const [completedTasks] = await db
			.select({ count: count() })
			.from(table.metaParseTask)
			.where(eq(table.metaParseTask.status, 2));
		const [failedTasks] = await db
			.select({ count: count() })
			.from(table.metaParseTask)
			.where(eq(table.metaParseTask.status, 3));

		return {
			stats: {
				totalUsers: totalUsers.count,
				totalTasks: totalTasks.count,
				pendingTasks: pendingTasks.count,
				processingTasks: processingTasks.count,
				completedTasks: completedTasks.count,
				failedTasks: failedTasks.count
			}
		};
	} catch (error) {
		console.error('获取统计数据失败:', error);
		return {
			stats: {
				totalUsers: 0,
				totalTasks: 0,
				pendingTasks: 0,
				processingTasks: 0,
				completedTasks: 0,
				failedTasks: 0
			},
			error: '获取统计数据失败'
		};
	}
};

export const actions: Actions = {
	processTasks: async (event) => {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			return fail(403, { message: '无权限执行此操作' });
		}

		try {
			// 调用任务处理API
			const response = await fetch('http://localhost:5173/api/process-tasks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (result.success) {
				return { success: true, message: '任务处理完成' };
			} else {
				return fail(500, { message: result.message || '任务处理失败' });
			}
		} catch (error) {
			console.error('触发任务处理失败:', error);
			return fail(500, { message: '触发任务处理失败' });
		}
	}
};

