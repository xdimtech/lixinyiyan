import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, count, and, like, desc, asc } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	// 只有管理员可以访问
	if (event.locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}

	const url = new URL(event.request.url);
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'createdAt';
	const sortOrder = url.searchParams.get('sortOrder') || 'desc';

	try {
		// 构建查询条件
		const whereConditions = [eq(table.user.isDeleted, 0)];
		if (search) {
			whereConditions.push(like(table.user.username, `%${search}%`));
		}

		// 获取总数
		const [totalCount] = await db
			.select({ count: count() })
			.from(table.user)
			.where(and(...whereConditions));

		// 获取用户列表
		const offset = (page - 1) * pageSize;
		const orderColumn = sortBy === 'username' ? table.user.username : table.user.createdAt;
		const orderFunction = sortOrder === 'asc' ? asc : desc;

		const users = await db
			.select({
				id: table.user.id,
				username: table.user.username,
				role: table.user.role,
				createdAt: table.user.createdAt,
				updatedAt: table.user.updatedAt
			})
			.from(table.user)
			.where(and(...whereConditions))
			.orderBy(orderFunction(orderColumn))
			.limit(pageSize)
			.offset(offset);

		const totalPages = Math.ceil(totalCount.count / pageSize);

		return {
			users,
			pagination: {
				page,
				pageSize,
				totalCount: totalCount.count,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1
			},
			filters: {
				search,
				sortBy,
				sortOrder
			}
		};
	} catch (error) {
		console.error('获取用户列表失败:', error);
		return {
			users: [],
			pagination: {
				page: 1,
				pageSize: 10,
				totalCount: 0,
				totalPages: 0,
				hasNext: false,
				hasPrev: false
			},
			filters: {
				search: '',
				sortBy: 'createdAt',
				sortOrder: 'desc'
			},
			error: '获取用户列表失败'
		};
	}
};

export const actions: Actions = {
	updateRole: async (event) => {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			return fail(403, { message: '无权限执行此操作' });
		}

		const data = await event.request.formData();
		const userId = data.get('userId') as string;
		const newRole = data.get('role') as string;

		if (!userId || !newRole) {
			return fail(400, { message: '参数不完整' });
		}

		if (!['member', 'manager', 'admin'].includes(newRole)) {
			return fail(400, { message: '无效的角色' });
		}

		// 防止用户修改自己的角色
		if (userId === event.locals.user.id) {
			return fail(400, { message: '不能修改自己的角色' });
		}

		try {
			await db
				.update(table.user)
				.set({ role: newRole })
				.where(eq(table.user.id, userId));

			return { success: true, message: '角色更新成功' };
		} catch (error) {
			console.error('更新用户角色失败:', error);
			return fail(500, { message: '更新角色失败' });
		}
	},

	resetPassword: async (event) => {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			return fail(403, { message: '无权限执行此操作' });
		}

		const data = await event.request.formData();
		const userId = data.get('userId') as string;
		const newPassword = data.get('newPassword') as string;

		if (!userId || !newPassword) {
			return fail(400, { message: '参数不完整' });
		}

		if (newPassword.length < 6) {
			return fail(400, { message: '密码长度至少6位' });
		}

		try {
			const passwordHash = await hash(newPassword, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			await db
				.update(table.user)
				.set({ passwordHash })
				.where(eq(table.user.id, userId));

			return { success: true, message: '密码重置成功' };
		} catch (error) {
			console.error('重置密码失败:', error);
			return fail(500, { message: '重置密码失败' });
		}
	},

	deleteUser: async (event) => {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			return fail(403, { message: '无权限执行此操作' });
		}

		const data = await event.request.formData();
		const userId = data.get('userId') as string;

		if (!userId) {
			return fail(400, { message: '参数不完整' });
		}

		// 防止用户删除自己
		if (userId === event.locals.user.id) {
			return fail(400, { message: '不能删除自己' });
		}

		try {
			// 检查要删除的用户信息
			const [targetUser] = await db
				.select({ role: table.user.role })
				.from(table.user)
				.where(eq(table.user.id, userId))
				.limit(1);

			if (!targetUser) {
				return fail(404, { message: '用户不存在' });
			}

			// 防止删除超级管理员
			if (targetUser.role === 'admin') {
				return fail(400, { message: '不能删除超级管理员账户' });
			}

			// 软删除用户
			await db
				.update(table.user)
				.set({ isDeleted: 1 })
				.where(eq(table.user.id, userId));

			// 删除用户的所有会话
			await db.delete(table.session).where(eq(table.session.userId, userId));

			return { success: true, message: '用户删除成功' };
		} catch (error) {
			console.error('删除用户失败:', error);
			return fail(500, { message: '删除用户失败' });
		}
	}
};
