import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { ensureDatabaseReady } from '$lib/server/db';
import { promptProvider } from '$lib/server/prompt-provider';

// 在服务启动时初始化数据库和提示词配置
let dbInitialized = false;
let promptsInitialized = false;

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

	// 确保提示词配置已初始化（在数据库初始化后运行）
	if (dbInitialized && !promptsInitialized) {
		try {
			await promptProvider.initialize();
			promptsInitialized = true;
		} catch (error) {
			console.error('❌ 提示词配置初始化失败:', error);
			// 继续运行，但提示词功能可能不可用
		}
	}

	// 允许特定来源的跨站请求
	const origin = event.request.headers.get('origin');
	event.setHeaders({
		'Access-Control-Allow-Origin': origin || '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization'
	});

	// 处理 OPTIONS 请求
	if (event.request.method === 'OPTIONS') {
		return new Response(null, { status: 204 });
	}

	const sessionToken = event.cookies.get(auth.sessionCookieName);

	// 调试日志
	// console.log('🔐 Auth check:', {
	// 	hasSessionToken: !!sessionToken,
	// 	url: event.url.pathname,
	// 	protocol: event.url.protocol,
	// 	cookieName: auth.sessionCookieName
	// });

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
