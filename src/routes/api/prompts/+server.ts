import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	// 检查用户是否已登录
	if (!event.locals.user) {
		return json({ error: '请先登录' }, { status: 401 });
	}

	// 检查用户权限（只有管理员可以查看提示词）
	if (event.locals.user.role !== 'admin' && event.locals.user.role !== 'manager') {
		return json({ error: '权限不足' }, { status: 403 });
	}

	try {
		// 获取最新的提示词配置
		const prompts = await db
			.select({
				id: table.metaPrompt.id,
				prompt1: table.metaPrompt.prompt1,
				prompt2: table.metaPrompt.prompt2,
				operator: table.metaPrompt.operator,
				operatorUsername: table.user.username,
				createdAt: table.metaPrompt.createdAt,
				updatedAt: table.metaPrompt.updatedAt
			})
			.from(table.metaPrompt)
			.innerJoin(table.user, eq(table.metaPrompt.operator, table.user.id))
			.orderBy(desc(table.metaPrompt.updatedAt))
			.limit(1);

		return json({
			success: true,
			data: prompts[0] || null
		});
	} catch (error) {
		console.error('获取提示词失败:', error);
		return json({ 
			success: false, 
			error: '获取提示词失败' 
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	// 检查用户是否已登录
	if (!event.locals.user) {
		return json({ error: '请先登录' }, { status: 401 });
	}

	// 检查用户权限（只有管理员可以修改提示词）
	if (event.locals.user.role !== 'admin' && event.locals.user.role !== 'manager') {
		return json({ error: '权限不足' }, { status: 403 });
	}

	try {
		const { prompt1, prompt2 } = await event.request.json();

		// 验证输入
		if (!prompt1 || !prompt2) {
			return json({ 
				success: false, 
				error: '提示词不能为空' 
			}, { status: 400 });
		}

		if (prompt1.length > 10000 || prompt2.length > 10000) {
			return json({ 
				success: false, 
				error: '提示词长度不能超过10000字符' 
			}, { status: 400 });
		}

		// 插入新的提示词配置
		const result = await db.insert(table.metaPrompt).values({
			prompt1: prompt1.trim(),
			prompt2: prompt2.trim(),
			operator: event.locals.user.id
		});

		return json({
			success: true,
			message: '提示词保存成功',
			data: { id: result[0].insertId }
		});
	} catch (error) {
		console.error('保存提示词失败:', error);
		return json({ 
			success: false, 
			error: '保存提示词失败' 
		}, { status: 500 });
	}
};

export const PUT: RequestHandler = async (event) => {
	// 检查用户是否已登录
	if (!event.locals.user) {
		return json({ error: '请先登录' }, { status: 401 });
	}

	// 检查用户权限（只有管理员可以修改提示词）
	if (event.locals.user.role !== 'admin' && event.locals.user.role !== 'manager') {
		return json({ error: '权限不足' }, { status: 403 });
	}

	try {
		const { id, prompt1, prompt2 } = await event.request.json();

		// 验证输入
		if (!id || !prompt1 || !prompt2) {
			return json({ 
				success: false, 
				error: '参数不完整' 
			}, { status: 400 });
		}

		if (prompt1.length > 10000 || prompt2.length > 10000) {
			return json({ 
				success: false, 
				error: '提示词长度不能超过10000字符' 
			}, { status: 400 });
		}

		// 更新提示词配置
		await db
			.update(table.metaPrompt)
			.set({
				prompt1: prompt1.trim(),
				prompt2: prompt2.trim(),
				operator: event.locals.user.id
			})
			.where(eq(table.metaPrompt.id, id));

		return json({
			success: true,
			message: '提示词更新成功'
		});
	} catch (error) {
		console.error('更新提示词失败:', error);
		return json({ 
			success: false, 
			error: '更新提示词失败' 
		}, { status: 500 });
	}
};
