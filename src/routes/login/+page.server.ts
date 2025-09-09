import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!username || !password) {
			return fail(400, {
				message: '请填写用户名和密码'
			});
		}

		if (typeof username !== 'string' || typeof password !== 'string') {
			return fail(400, {
				message: '无效的用户名或密码'
			});
		}

		try {
			// 查找用户
			const [existingUser] = await db
				.select()
				.from(table.user)
				.where(eq(table.user.username, username))
				.limit(1);

			if (!existingUser) {
				return fail(400, {
					message: '用户名或密码错误'
				});
			}

			// 验证密码
			const validPassword = await verify(existingUser.passwordHash, password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			if (!validPassword) {
				return fail(400, {
					message: '用户名或密码错误'
				});
			}

			// 创建session
			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, existingUser.id);
			setSessionTokenCookie(event, sessionToken, session.expiresAt);

			// 根据用户角色重定向到不同页面
			if (existingUser.role === 'admin') {
				throw redirect(302, '/admin');
			} else {
				throw redirect(302, '/upload');
			}
		} catch (error) {
			// 如果是重定向错误，重新抛出
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error;
			}
			console.error('Login error:', error);
			return fail(500, {
				message: '登录失败，请稍后重试'
			});
		}
	}
};
