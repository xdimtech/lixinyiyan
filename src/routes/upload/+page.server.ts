import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import formidable from 'formidable';

const UPLOAD_DIR = '/tmp/uploads'; // 可以根据需要调整

export const actions: Actions = {
	upload: async (event) => {
		if (!event.locals.user) {
			return fail(401, { message: '请先登录' });
		}

		try {
			// 确保上传目录存在
			await mkdir(UPLOAD_DIR, { recursive: true });

			const form = formidable({
				uploadDir: UPLOAD_DIR,
				keepExtensions: true,
				maxFileSize: 50 * 1024 * 1024, // 50MB
				filter: (part) => {
					return part.name === 'file' && part.mimetype === 'application/pdf';
				}
			});

			const [fields, files] = await form.parse(event.request);
			
			const file = Array.isArray(files.file) ? files.file[0] : files.file;
			const parseType = Array.isArray(fields.parseType) ? fields.parseType[0] : fields.parseType;

			if (!file) {
				return fail(400, { message: '请选择一个PDF文件' });
			}

			if (!parseType || !['only_ocr', 'translate'].includes(parseType)) {
				return fail(400, { message: '请选择有效的处理类型' });
			}

			// 保存任务记录到数据库
			const taskResult = await db.insert(table.metaParseTask).values({
				userId: event.locals.user.id,
				parseType: parseType as 'only_ocr' | 'translate',
				fileName: file.originalFilename || 'unknown.pdf',
				filePath: file.filepath,
				pageNum: 0, // 稍后通过PDF解析获得
				status: 0 // pending
			});

			console.log('任务创建成功:', taskResult);

			return {
				success: true,
				message: '文件上传成功，任务已创建',
				taskId: taskResult[0]?.insertId
			};

		} catch (error) {
			console.error('上传失败:', error);
			return fail(500, { 
				message: '文件上传失败，请稍后重试' 
			});
		}
	}
};
