import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { pdfUploadDir } from '$lib/config/paths';

export const GET: RequestHandler = async ({ params, locals }) => {
	// 需要登录才能访问
	if (!locals.user) {
		throw error(401, '请先登录');
	}

	const { dateDir, fileName } = params;

	// 验证参数
	if (!dateDir || !fileName) {
		throw error(400, '缺少必要参数');
	}

	// 构建文件路径
	const filePath = path.join(pdfUploadDir, dateDir, fileName);
	
	console.log(`Preview request: dateDir=${dateDir}, fileName=${fileName}`);
	console.log(`File path: ${filePath}`);
	console.log(`File exists: ${fs.existsSync(filePath)}`);

	// 检查文件是否存在
	if (!fs.existsSync(filePath)) {
		console.error(`文件不存在: ${filePath}`);
		throw error(404, '文件不存在');
	}

	try {
		// 根据文件扩展名确定内容类型
		const ext = path.extname(fileName).toLowerCase();
		let contentType = 'application/octet-stream';
		
		switch (ext) {
			case '.jpg':
			case '.jpeg':
				contentType = 'image/jpeg';
				break;
			case '.png':
				contentType = 'image/png';
				break;
			case '.webp':
				contentType = 'image/webp';
				break;
			case '.pdf':
				contentType = 'application/pdf';
				break;
			case '.txt':
				contentType = 'text/plain; charset=utf-8';
				break;
			case '.doc':
				contentType = 'application/msword';
				break;
			case '.docx':
				contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
				break;
		}

		// 对于图片文件，直接返回文件内容
		if (contentType.startsWith('image/')) {
			const fileBuffer = fs.readFileSync(filePath);
			return new Response(fileBuffer, {
				headers: {
					'Content-Type': contentType,
					'Content-Length': fileBuffer.length.toString(),
					'Cache-Control': 'public, max-age=3600' // 缓存1小时
				}
			});
		}

		// 对于PDF文件，返回文件内容用于嵌入显示
		if (contentType === 'application/pdf') {
			const fileBuffer = fs.readFileSync(filePath);
			return new Response(fileBuffer, {
				headers: {
					'Content-Type': contentType,
					'Content-Length': fileBuffer.length.toString(),
					'Cache-Control': 'public, max-age=3600'
				}
			});
		}

		// 对于文本文件，返回文本内容
		if (contentType.startsWith('text/')) {
			const textContent = fs.readFileSync(filePath, 'utf-8');
			return new Response(textContent, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=3600'
				}
			});
		}

		// 对于其他文件类型，返回错误
		throw error(415, '不支持预览此文件类型');

	} catch (err) {
		console.error('文件预览失败:', err);
		if (err instanceof Response) {
			throw err;
		}
		throw error(500, '预览文件失败');
	}
};
