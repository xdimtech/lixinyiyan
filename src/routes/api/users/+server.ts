import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	// 检查用户是否已登录
	if (!event.locals.user) {
		return json({ error: '请先登录' }, { status: 401 });
	}

	const url = new URL(event.request.url);
	const type = url.searchParams.get('type') || 'usernames'; // 支持不同类型的查询

	try {
		if (type === 'usernames') {
			// 返回用户ID和用户名列表（用于筛选下拉菜单）
			const users = await db
				.select({
					id: table.user.id,
					username: table.user.username
				})
				.from(table.user)
				.orderBy(table.user.username);

			return json({
				success: true,
				data: users,
				total: users.length
			});
		} else if (type === 'users') {
			// 返回完整用户信息（不包含密码）
			const users = await db
				.select({
					id: table.user.id,
					username: table.user.username,
					role: table.user.role
				})
				.from(table.user)
				.orderBy(table.user.username);

			return json({
				success: true,
				data: users,
				total: users.length
			});
		} else if (type === 'users-with-tasks') {
			// 返回有任务的用户列表及其任务数量
			const usersWithTasks = await db
				.select({
					username: table.user.username,
					taskCount: count(table.metaParseTask.id)
				})
				.from(table.user)
				.innerJoin(table.metaParseTask, eq(table.user.id, table.metaParseTask.userId))
				.groupBy(table.user.username)
				.orderBy(table.user.username);

			return json({
				success: true,
				data: usersWithTasks,
				total: usersWithTasks.length
			});
		} else {
			return json({ 
				success: false, 
				error: '不支持的查询类型' 
			}, { status: 400 });
		}
	} catch (error) {
		console.error('获取用户列表失败:', error);
		return json({ 
			success: false, 
			error: '获取用户列表失败' 
		}, { status: 500 });
	}
};
