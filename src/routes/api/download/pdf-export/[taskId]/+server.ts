import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const { taskId } = params;

	// 验证参数
	if (!taskId) {
		throw error(400, 'Invalid task ID');
	}

	// 构建导出PDF文件路径
	const exportedPdfPath = path.join('uploads/pdf-split', taskId, 'exported.pdf');

	// 检查文件是否存在
	if (!fs.existsSync(exportedPdfPath)) {
		throw error(404, 'Exported PDF not found');
	}

	try {
		// 读取文件
		const fileBuffer = fs.readFileSync(exportedPdfPath);
		
		// 生成下载文件名
		const fileName = `split-pdf-${taskId}.pdf`;

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${fileName}"`,
				'Content-Length': fileBuffer.length.toString()
			}
		});
	} catch (err) {
		console.error('PDF download error:', err);
		throw error(500, 'Failed to download PDF');
	}
};


