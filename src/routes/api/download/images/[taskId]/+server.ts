import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import crypto from 'crypto';

export const POST: RequestHandler = async ({ params, request }) => {
	const { taskId } = params;

	// 验证参数
	if (!taskId) {
		throw error(400, 'Invalid task ID');
	}

	try {
		const body = await request.json();
		const { selectedPages, originalFileName } = body;

		if (!selectedPages || !Array.isArray(selectedPages) || selectedPages.length === 0) {
			throw error(400, 'No pages selected');
		}

		if (!originalFileName) {
			throw error(400, 'Original filename is required');
		}

		// 构建图片目录路径
		const imagesDir = path.join(process.env.PDF_OUTPUT_DIR || 'uploads/pdf-split', taskId);

		// 检查目录是否存在
		if (!fs.existsSync(imagesDir)) {
			throw error(404, 'Images directory not found');
		}

		// 创建ZIP压缩包
		const archive = archiver('zip', {
			zlib: { level: 9 } // 最高压缩级别
		});

		// 收集要压缩的图片文件
		const imagesToAdd: Array<{ filename: string; path: string }> = [];

		for (const pageId of selectedPages) {
			const imageName = `page_${pageId.toString().padStart(3, '0')}.jpg`;
			const imagePath = path.join(imagesDir, imageName);

			if (fs.existsSync(imagePath)) {
				imagesToAdd.push({
					filename: imageName,
					path: imagePath
				});
			} else {
				console.warn(`Image not found: ${imagePath}`);
			}
		}

		if (imagesToAdd.length === 0) {
			throw error(404, 'No valid images found for selected pages');
		}

		// 生成16位随机UUID
		const shortUUID = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
		
		// 获取原文件名（不含扩展名）
		const originalName = path.parse(originalFileName).name;
		
		// 设置响应头 - 格式：原文件名_16位UUID.zip
		const zipFilename = `${originalName}_${shortUUID}.zip`;
		
		// 创建可读流来传输ZIP数据
		const stream = new ReadableStream({
			start(controller) {
				// 处理压缩完成事件
				archive.on('end', () => {
					controller.close();
				});

				// 处理压缩错误事件
				archive.on('error', (err) => {
					console.error('Archive error:', err);
					controller.error(err);
				});

				// 将压缩数据写入流
				archive.on('data', (chunk) => {
					controller.enqueue(new Uint8Array(chunk));
				});

				// 添加图片文件到压缩包
				for (const image of imagesToAdd) {
					archive.file(image.path, { name: image.filename });
				}

				// 完成压缩
				archive.finalize();
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${zipFilename}"`,
				'Cache-Control': 'no-cache'
			}
		});

	} catch (err) {
		console.error('Download images error:', err);
		
		if (err instanceof Error && err.message.includes('Invalid task ID')) {
			throw error(400, 'Invalid request parameters');
		}
		
		throw error(500, 'Failed to create image archive');
	}
};
