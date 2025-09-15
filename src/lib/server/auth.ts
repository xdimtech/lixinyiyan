import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: { id: table.user.id, username: table.user.username, role: table.user.role },
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	// 所有环境都使用宽松的安全策略以确保兼容性
	const cookieOptions = {
		expires: expiresAt,
		path: '/',
		httpOnly: true,
		secure: false, // 所有环境都设为 false，提供最大兼容性
		sameSite: 'lax' as const // 使用 'lax' 提供更好的兼容性
	};
	
	// 调试日志
	console.log('🍪 Setting session cookie:', {
		protocol: event.url.protocol,
		cookieOptions: { ...cookieOptions, token: '[HIDDEN]' }
	});
	
	event.cookies.set(sessionCookieName, token, cookieOptions);
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	// 所有环境都使用宽松的安全策略以确保兼容性
	const cookieOptions = {
		path: '/',
		httpOnly: true,
		secure: false, // 所有环境都设为 false，提供最大兼容性
		sameSite: 'lax' as const // 使用 'lax' 提供更好的兼容性
	};
	
	event.cookies.delete(sessionCookieName, cookieOptions);
}
