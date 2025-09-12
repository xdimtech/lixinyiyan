import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import { promises as fs } from 'fs';
import { imagesOutputDir } from '$lib/config/paths';

export const GET: RequestHandler = async ({ params, url }) => {
	const { taskId, pageNum } = params;
	const dirName = url.searchParams.get('dir');
	
	if (!taskId || !pageNum) {
		throw error(400, '缺少必要参数');
	}

	try {
		// 构建图片路径
		const taskImagesDir = join(imagesOutputDir, `task_${taskId}`, 'images');
		
		// 查找图片文件
		let imagePath = '';
		if (dirName) {
			// 使用传入的目录名
			imagePath = join(taskImagesDir, dirName, `page_${pageNum}.png`);
		} else {
			// 自动查找目录
			try {
				const dirs = await fs.readdir(taskImagesDir);
				const pdfDir = dirs.find(dir => !dir.includes('.') && !dir.startsWith('.'));
				if (pdfDir) {
					imagePath = join(taskImagesDir, pdfDir, `page_${pageNum}.png`);
				}
			} catch (e) {
				throw error(404, '图片文件不存在');
			}
		}

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
