import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');

		if (!username || !password || !confirmPassword) {
			return fail(400, {
				message: '请填写所有必填字段'
			});
		}

		if (typeof username !== 'string' || username.length < 3 || username.length > 31) {
			return fail(400, {
				message: '用户名长度必须在3-31个字符之间'
			});
		}

		if (typeof password !== 'string' || password.length < 6 || password.length > 255) {
			return fail(400, {
				message: '密码长度必须在6-255个字符之间'
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				message: '两次输入的密码不匹配'
			});
		}

		try {
			// 检查用户名是否已存在
			const existingUser = await db
				.select()
				.from(table.user)
				.where(eq(table.user.username, username))
				.limit(1);

			if (existingUser.length > 0) {
				return fail(400, {
					message: '用户名已存在'
				});
			}

			// 创建新用户
			const userId = crypto.randomUUID();
			const passwordHash = await hash(password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			await db.insert(table.user).values({
				id: userId,
				username,
				passwordHash,
				role: 'member'
			});

			// 创建session
			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, userId);
			setSessionTokenCookie(event, sessionToken, session.expiresAt);

			// 新注册用户默认跳转到上传页面
			throw redirect(302, '/upload');
		} catch (error) {
			// 如果是重定向错误，重新抛出
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error;
			}
			console.error('Registration error:', error);
			return fail(500, {
				message: '注册失败，请稍后重试'
			});
		}
	}
};
