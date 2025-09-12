import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { promptProvider } from '$lib/server/prompt-provider';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// 检查用户权限
	if (locals.user.role !== 'admin' && locals.user.role !== 'manager') {
		throw error(403, '权限不足：只有管理员可以访问此页面');
	}

	try {
		// 从内存缓存获取提示词配置
		const currentPrompts = promptProvider.getConfig();

		return {
			currentPrompts
		};
	} catch (err) {
		console.error('加载提示词失败:', err);
		throw error(500, '加载提示词失败');
	}
};

export const actions: Actions = {
	updatePrompts: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: '请先登录' });
		}

		// 检查用户权限
		if (locals.user.role !== 'admin' && locals.user.role !== 'manager') {
			return fail(403, { message: '权限不足：只有管理员可以修改提示词' });
		}

		const data = await request.formData();
		const prompt1 = data.get('prompt1')?.toString()?.trim();
		const prompt2 = data.get('prompt2')?.toString()?.trim();

		// 验证输入
		if (!prompt1 || !prompt2) {
			return fail(400, {
				message: '提示词不能为空',
				prompt1,
				prompt2
			});
		}

		if (prompt1.length > 10000 || prompt2.length > 10000) {
			return fail(400, {
				message: '提示词长度不能超过10000字符',
				prompt1,
				prompt2
			});
		}

		try {
			// 使用 provider 更新提示词配置
			await promptProvider.updateConfig(prompt1, prompt2, locals.user.id);

			return {
				success: true,
				message: '提示词更新成功'
			};
		} catch (err) {
			console.error('更新提示词失败:', err);
			return fail(500, {
				message: '更新提示词失败',
				prompt1,
				prompt2
			});
		}
	}
};
