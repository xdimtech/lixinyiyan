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

	// 构建任务目录路径
	const taskDir = path.join(process.env.PDF_OUTPUT_DIR || 'uploads/pdf-split', taskId);

	// 检查目录是否存在
	if (!fs.existsSync(taskDir)) {
		throw error(404, 'Task directory not found');
	}

	try {
		// 扫描目录寻找PDF文件（排除原始图片文件）
		const files = fs.readdirSync(taskDir);
		const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
		
		if (pdfFiles.length === 0) {
			throw error(404, 'No exported PDF found');
		}

		// 选择第一个PDF文件（通常应该只有一个导出的PDF）
		const pdfFileName = pdfFiles[0];
		const exportedPdfPath = path.join(taskDir, pdfFileName);

		console.log(`Found exported PDF: ${pdfFileName}`);

		// 读取文件
		const fileBuffer = fs.readFileSync(exportedPdfPath);
		
		// 使用实际的文件名作为下载文件名
		const downloadFileName = pdfFileName;

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${downloadFileName}"`,
				'Content-Length': fileBuffer.length.toString()
			}
		});
	} catch (err) {
		console.error('PDF download error:', err);
		throw error(500, 'Failed to download PDF');
	}
};


