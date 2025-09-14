import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path, { join } from 'path';

const UPLOAD_DIR = './uploads/files';
const FILE_PARSE_API_URL = 'http://127.0.0.1:8000/file_parse';

export const actions: Actions = {
	upload: async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get('file') as File;
			
			if (!file || file.size === 0) {
				return fail(400, { message: '请选择一个文件' });
			}

			// 检查文件大小（20MB限制）
			const maxSize = 20 * 1024 * 1024;
			if (file.size > maxSize) {
				return fail(400, { message: '文件大小不能超过20MB' });
			}

			// 检查文件类型（支持PDF, DOC, DOCX, TXT等）
			const allowedTypes = [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'text/plain',
				'image/jpeg',
				'image/png',
				'image/webp'
			];
			
			if (!allowedTypes.includes(file.type)) {
				return fail(400, { 
					message: '不支持的文件类型。支持的格式：PDF, DOC, DOCX, TXT, JPG, PNG, WEBP' 
				});
			}

			// 创建日期目录
			const now = new Date();
			const dateDir = now.toISOString().split('T')[0]; // YYYY-MM-DD
			const uploadDateDir = join(UPLOAD_DIR, dateDir);
			
			if (!existsSync(uploadDateDir)) {
				await mkdir(uploadDateDir, { recursive: true });
			}

			// 生成唯一文件名
			const timestamp = Date.now();
			const originalName = file.name;
			const extension = originalName.split('.').pop();
			const storedFileName = `${originalName.replace(/\.[^/.]+$/, "")}_${timestamp}.${extension}`;
			const filePath = join(uploadDateDir, storedFileName);

			// 保存文件
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await writeFile(filePath, buffer);

			// 生成任务ID
			const taskId = crypto.randomUUID();

			return {
				success: true,
				taskId,
				fileName: originalName,
				fileSize: file.size,
				storedFileName,
				dateDir,
				filePath: filePath,
				fileType: file.type,
				message: '文件上传成功'
			};

		} catch (error) {
			console.error('File upload error:', error);
			return fail(500, { message: '文件上传失败，请重试' });
		}
	},

	parse: async ({ request }) => {
		try {
			const formData = await request.formData();
			const filePath = formData.get('filePath') as string;
			const fileName = formData.get('fileName') as string;
			
			if (!filePath || !existsSync(filePath)) {
				return fail(400, { message: '文件不存在' });
			}

			// 创建FormData用于API调用
			const dateDir = new Date().toISOString().split('T')[0];
			const fs = await import('fs');
			const fileBuffer = fs.readFileSync(filePath);
			const blob = new Blob([fileBuffer]);

			// 使用UPLOAD_DIR的绝对路径，而不是相对路径
			const absoluteUploadDir = path.resolve(UPLOAD_DIR);
			const absolutePath = join(absoluteUploadDir, dateDir, fileName);

			const parseFormData = new FormData();
			parseFormData.append('files', blob, fileName);
			parseFormData.append('return_middle_json', 'false');
			parseFormData.append('return_model_output', 'false');
			parseFormData.append('return_md', 'true');
			parseFormData.append('return_images', 'false');
			parseFormData.append('end_page_id', '500');
			parseFormData.append('parse_method', 'auto');
			parseFormData.append('start_page_id', '0');
			parseFormData.append('lang_list', 'ch');
			parseFormData.append('output_dir', absolutePath);
			parseFormData.append('server_url', 'string');
			parseFormData.append('return_content_list', 'false');
			parseFormData.append('backend', 'pipeline');
			parseFormData.append('table_enable', 'true');
			parseFormData.append('response_format_zip', 'false');
			parseFormData.append('formula_enable', 'true');

			// 调用解析API（设置较长的超时时间）
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5分钟超时

			try {
				const response = await fetch(FILE_PARSE_API_URL, {
					method: 'POST',
					body: parseFormData,
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorText = await response.text();
					console.error('Parse API error:', response.status, errorText);
					return fail(500, { 
						message: `解析API调用失败: ${response.status} ${response.statusText}` 
					});
				}

				const result = await response.json();
				
				// 提取解析结果
				let parsedContent = '';
				if (result.results) {
					const firstKey = Object.keys(result.results)[0];
					if (firstKey && result.results[firstKey]?.md_content) {
						parsedContent = result.results[firstKey].md_content;
					}
				}

				return {
					success: true,
					parsedContent,
					backend: result.backend,
					version: result.version,
					message: '文件解析成功'
				};

			} catch (error: any) {
				clearTimeout(timeoutId);
				
				if (error.name === 'AbortError') {
					return fail(408, { message: '解析超时，请尝试使用较小的文件或稍后重试' });
				}
				
				console.error('Parse request error:', error);
				return fail(500, { message: '解析请求失败，请检查网络连接' });
			}

		} catch (error) {
			console.error('File parse error:', error);
			return fail(500, { message: '文件解析失败，请重试' });
		}
	}
};
