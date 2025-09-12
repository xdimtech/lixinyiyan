import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promptProvider } from '$lib/server/prompt-provider';

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
		// 从内存缓存获取提示词配置
		const config = promptProvider.getConfig();

		return json({
			success: true,
			data: config
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

		// 使用 provider 更新提示词配置
		const updatedConfig = await promptProvider.updateConfig(
			prompt1,
			prompt2,
			event.locals.user.id
		);

		return json({
			success: true,
			message: '提示词保存成功',
			data: updatedConfig
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

		// 使用 provider 更新提示词配置
		const updatedConfig = await promptProvider.updateConfig(
			prompt1,
			prompt2,
			event.locals.user.id
		);

		return json({
			success: true,
			message: '提示词更新成功',
			data: updatedConfig
		});
	} catch (error) {
		console.error('更新提示词失败:', error);
		return json({ 
			success: false, 
			error: '更新提示词失败' 
		}, { status: 500 });
	}
};
