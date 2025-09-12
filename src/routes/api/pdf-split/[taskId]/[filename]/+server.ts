import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const { taskId, filename } = params;

	// 验证参数
	if (!taskId || !filename) {
		throw error(400, 'Invalid parameters');
	}

	// 构建文件路径
	const filePath = path.join(process.env.PDF_OUTPUT_DIR || 'uploads/pdf-split', taskId, filename);

	// 检查文件是否存在
	if (!fs.existsSync(filePath)) {
		throw error(404, 'File not found');
	}

	try {
		// 读取文件
		const fileBuffer = fs.readFileSync(filePath);
		
		// 根据文件扩展名设置Content-Type
		let contentType = 'application/octet-stream';
		const ext = path.extname(filename).toLowerCase();
		
		switch (ext) {
			case '.jpg':
			case '.jpeg':
				contentType = 'image/jpeg';
				break;
			case '.png':
				contentType = 'image/png';
				break;
			case '.pdf':
				contentType = 'application/pdf';
				break;
		}

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.length.toString(),
				'Cache-Control': 'public, max-age=3600' // 缓存1小时
			}
		});
	} catch (err) {
		console.error('File read error:', err);
		throw error(500, 'Failed to read file');
	}
};


