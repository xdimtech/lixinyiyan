import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import { promises as fs } from 'fs';
import { imagesOutputDir } from '$lib/config/paths';

export const GET: RequestHandler = async ({ params }) => {
	const { taskId, pageNum } = params;
	
	if (!taskId || !pageNum) {
		throw error(400, '缺少必要参数');
	}

	try {
		// 构建图片路径 - 使用日期格式的路径
		const datestring = new Date().toISOString().split('T')[0];
		const taskImagesDir = join(imagesOutputDir, datestring, `task_${taskId}`);
		
		// 图片直接存储在task目录下
		const imagePath = join(taskImagesDir, `page_${pageNum}.png`);

		// 检查文件是否存在
		try {
			await fs.access(imagePath);
		} catch (e) {
			throw error(404, '图片文件不存在');
		}

		// 读取图片文件
		const imageBuffer = await fs.readFile(imagePath);
		
		return new Response(imageBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=86400' // 缓存1天
			}
		});
		
	} catch (e) {
		console.error('Error serving image:', e);
		if (e instanceof Error && e.message.includes('不存在')) {
			throw error(404, e.message);
		}
		throw error(500, '获取图片失败');
	}
};
