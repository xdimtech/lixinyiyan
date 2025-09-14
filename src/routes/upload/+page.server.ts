import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { getPathConfig } from '$lib/config/paths';

const UPLOAD_DIR = getPathConfig().pdfUploadDir;

export const actions: Actions = {
	upload: async (event) => {
		if (!event.locals.user) {
			return fail(401, { message: '请先登录' });
		}

		try {
			// 确保上传目录存在
			await mkdir(UPLOAD_DIR, { recursive: true });

			// 使用 SvelteKit 原生的 formData 处理
			const formData = await event.request.formData();
			const file = formData.get('file') as File;
			const parseType = formData.get('parseType') as string;

			if (!file || file.size === 0) {
				return fail(400, { message: '请选择一个PDF文件' });
			}

			if (file.type !== 'application/pdf') {
				return fail(400, { message: '只能上传PDF文件' });
			}

			if (file.size > 50 * 1024 * 1024) { // 50MB
				return fail(400, { message: '文件大小不能超过50MB' });
			}

			if (!parseType || !['only_ocr', 'translate'].includes(parseType)) {
				return fail(400, { message: '请选择有效的处理类型' });
			}

			// 生成唯一的文件名
			const timestamp = Date.now();
			// 文件名后缀， 16位随机UUID
			const fileExt = file.name.split('.').pop();
			const nameWithoutExt = file.name.split('.').slice(0, -1).join('_');
			const fileName = `${nameWithoutExt}_${timestamp}.${fileExt}`;
			const datestring = new Date().toISOString().split('T')[0];
			const filePath = join(UPLOAD_DIR, datestring, fileName);

			// 保存文件
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await writeFile(filePath, buffer);

			// 保存任务记录到数据库
			const result = await db.insert(table.metaParseTask).values({
				userId: event.locals.user.id,
				parseType: parseType as 'only_ocr' | 'translate',
				fileName: file.name,
				filePath: filePath,
				pageNum: 0, // 稍后通过PDF解析获得
				status: 0 // pending
			}).$returningId();

			console.log('任务创建成功:', result);

			const taskId = result[0]?.id;
			if (!taskId) {
				return fail(500, { message: '任务创建失败' });
			}

			return {
				success: true,
				message: '文件上传成功，任务已创建',
				taskId: Number(taskId)
			};

		} catch (error) {
			console.error('上传失败:', error);
			return fail(500, { 
				message: '文件上传失败，请稍后重试' 
			});
		}
	}
};

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user
	};
};
