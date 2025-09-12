import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { splitPdfToImages, createPdfFromPages } from '$lib/server/pdf-split-processor';

// 从环境变量获取目录配置
const uploadDir = process.env.PDF_UPLOAD_DIR || 'uploads/files';
const outputDir = process.env.PDF_OUTPUT_DIR || 'uploads/pdf-split';
console.log('uploadDir:', uploadDir);
console.log('outputDir:', outputDir);
// 确保目录存在，递归创建所有必要的父目录
try {

	if (!fs.existsSync(uploadDir)) {
		console.log(`创建上传目录: ${uploadDir}`);
		fs.mkdirSync(uploadDir, { recursive: true });
		console.log(`✅ 成功创建上传目录: ${uploadDir}`);
	} else {
		console.log(`✅ 上传目录已存在: ${uploadDir}`);
	}
	
	if (!fs.existsSync(outputDir)) {
		console.log(`创建输出目录: ${outputDir}`);
		fs.mkdirSync(outputDir, { recursive: true });
		console.log(`✅ 成功创建输出目录: ${outputDir}`);
	} else {
		console.log(`✅ 输出目录已存在: ${outputDir}`);
	}
} catch (error) {
	console.error('❌ 创建目录时出错:', error);
	console.error('请检查目录权限或手动创建目录');
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
			
			// 获取当前日期作为目录名 (格式: 2025-09-12)
			const today = new Date();
			const dateDir = today.getFullYear() + '-' + 
				String(today.getMonth() + 1).padStart(2, '0') + '-' + 
				String(today.getDate()).padStart(2, '0');
			
			// 创建日期目录
			const dailyUploadDir = path.join(uploadDir, dateDir);
			if (!fs.existsSync(dailyUploadDir)) {
				fs.mkdirSync(dailyUploadDir, { recursive: true });
				console.log(`✅ 创建日期目录: ${dailyUploadDir}`);
			}
			
			// 生成16位随机UUID（取前16位）
			const shortUUID = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
			
			// 获取原文件名（不含扩展名）和扩展名
			const originalName = path.parse(file.name).name;
			const fileExt = path.parse(file.name).ext;
			
			// 构建新的文件名：原文件名 + 16位UUID + 扩展名
			const newFileName = `${originalName}_${shortUUID}${fileExt}`;
			const uploadPath = path.join(dailyUploadDir, newFileName);
			
			console.log(`上传文件: ${file.name} -> ${newFileName}`);
			console.log(`存储路径: ${uploadPath}`);
			
			// 保存上传的文件
			const arrayBuffer = await file.arrayBuffer();
			fs.writeFileSync(uploadPath, Buffer.from(arrayBuffer));

			return {
				success: true,
				taskId,
				fileName: file.name,
				fileSize: file.size,
				storedFileName: newFileName,
				dateDir: dateDir
			};
		} catch (error) {
			console.error('PDF upload error:', error);
			return fail(500, { message: '文件上传失败，请重试' });
		}
	},

	split: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		const storedFileName = formData.get('storedFileName') as string;
		const dateDir = formData.get('dateDir') as string;

		if (!taskId) {
			return fail(400, { message: '任务ID不能为空' });
		}

		if (!storedFileName || !dateDir) {
			return fail(400, { message: '文件存储信息不完整' });
		}

		// 构建正确的PDF文件路径
		const pdfPath = path.join(uploadDir, dateDir, storedFileName);
		console.log(`拆分PDF文件路径: ${pdfPath}`);
		
		if (!fs.existsSync(pdfPath)) {
			console.error(`PDF文件不存在: ${pdfPath}`);
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
		const storedFileName = formData.get('storedFileName') as string;
		const dateDir = formData.get('dateDir') as string;
		const selectedPages = formData.get('selectedPages') as string;

		console.log('Export request received:', { taskId, storedFileName, dateDir, selectedPages }); // 调试日志

		if (!taskId || !selectedPages || !storedFileName || !dateDir) {
			console.log('Missing parameters:', { 
				taskId: !!taskId, 
				selectedPages: !!selectedPages,
				storedFileName: !!storedFileName,
				dateDir: !!dateDir
			});
			return fail(400, { message: '参数不完整' });
		}

		try {
			const pages = JSON.parse(selectedPages);
			console.log('Parsed pages:', pages); // 调试日志
			
			// 构建正确的原PDF文件路径
			const originalPdfPath = path.join(uploadDir, dateDir, storedFileName);
			console.log(`导出原PDF文件路径: ${originalPdfPath}`);
			
			if (!fs.existsSync(originalPdfPath)) {
				console.log('Original PDF not found:', originalPdfPath);
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
	},

	downloadImages: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		const selectedPages = formData.get('selectedPages') as string;

		console.log('Download images request received:', { taskId, selectedPages }); // 调试日志

		if (!taskId || !selectedPages) {
			console.log('Missing parameters:', { taskId: !!taskId, selectedPages: !!selectedPages });
			return fail(400, { message: '参数不完整' });
		}

		try {
			const pages = JSON.parse(selectedPages);
			console.log('Parsed pages for image download:', pages); // 调试日志
			
			// 验证图片目录是否存在
			const imagesDir = path.join(outputDir, taskId);
			if (!fs.existsSync(imagesDir)) {
				console.log('Images directory not found:', imagesDir);
				return fail(404, { message: '图片目录不存在' });
			}
			
			return {
				success: true,
				downloadUrl: `/api/download/images/${taskId}`,
				selectedPages: pages,
				message: '准备下载图片'
			};
		} catch (error) {
			console.error('Download images error:', error);
			return fail(500, { message: '图片下载失败，请重试' });
		}
	}
} satisfies Actions;
