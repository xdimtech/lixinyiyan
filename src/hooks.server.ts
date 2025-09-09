import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { ensureDatabaseReady } from '$lib/server/db';

// 在服务启动时初始化数据库
let dbInitialized = false;

const handleAuth: Handle = async ({ event, resolve }) => {
	// 确保数据库已初始化（只在第一次请求时运行）
	if (!dbInitialized) {
		try {
			console.log('🔄 正在初始化数据库...');
			await ensureDatabaseReady();
			dbInitialized = true;
			console.log('✅ 数据库初始化完成');
		} catch (error) {
			console.error('❌ 数据库初始化失败:', error);
			// 继续运行，但可能会有数据库相关的问题
		}
	}

	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

export const handle: Handle = handleAuth;
