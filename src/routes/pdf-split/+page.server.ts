import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { splitPdfToImages, createPdfFromPages } from '$lib/server/pdf-split-processor';

// 确保上传目录存在
const uploadDir = 'uploads';
const outputDir = 'uploads/pdf-split';

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

export const load: PageServerLoad = async () => {
	return {};
};

export const actions = {
	upload: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { message: '请选择一个PDF文件' });
		}

		if (!file.name.toLowerCase().endsWith('.pdf')) {
			return fail(400, { message: '只支持PDF文件格式' });
		}

		// 文件大小限制 50MB
		if (file.size > 50 * 1024 * 1024) {
			return fail(400, { message: '文件大小不能超过50MB' });
		}

		try {
			// 生成唯一的任务ID
			const taskId = crypto.randomUUID();
			const uploadPath = path.join(uploadDir, `${taskId}.pdf`);
			
			// 保存上传的文件
			const arrayBuffer = await file.arrayBuffer();
			fs.writeFileSync(uploadPath, Buffer.from(arrayBuffer));

			return {
				success: true,
				taskId,
				fileName: file.name,
				fileSize: file.size
			};
		} catch (error) {
			console.error('PDF upload error:', error);
			return fail(500, { message: '文件上传失败，请重试' });
		}
	},

	split: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;

		if (!taskId) {
			return fail(400, { message: '任务ID不能为空' });
		}

		const pdfPath = path.join(uploadDir, `${taskId}.pdf`);
		if (!fs.existsSync(pdfPath)) {
			return fail(404, { message: 'PDF文件不存在' });
		}

		try {
			// 使用真正的PDF拆分功能
			const images = await splitPdfToImages(pdfPath, taskId);

			return {
				success: true,
				taskId,
				images: images.map(img => ({
					id: img.id,
					name: img.name,
					url: img.url,
					selected: img.selected
				}))
			};
		} catch (error) {
			console.error('PDF split error:', error);
			return fail(500, { message: 'PDF拆分失败，请重试' });
		}
	},

	export: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		const selectedPages = formData.get('selectedPages') as string;

		if (!taskId || !selectedPages) {
			return fail(400, { message: '参数不完整' });
		}

		try {
			const pages = JSON.parse(selectedPages);
			const originalPdfPath = path.join(uploadDir, `${taskId}.pdf`);
			
			if (!fs.existsSync(originalPdfPath)) {
				return fail(404, { message: '原PDF文件不存在' });
			}
			
			// 使用真正的PDF重新生成功能
			await createPdfFromPages(originalPdfPath, pages, taskId);
			
			return {
				success: true,
				downloadUrl: `/api/download/pdf-export/${taskId}`,
				message: 'PDF导出成功'
			};
		} catch (error) {
			console.error('PDF export error:', error);
			return fail(500, { message: 'PDF导出失败，请重试' });
		}
	}
} satisfies Actions;
