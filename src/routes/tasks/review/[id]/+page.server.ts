import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import { promises as fs } from 'fs';

// 从环境变量获取目录配置
const PDF_OCR_OUTPUT_DIR = process.env.PDF_OCR_OUTPUT_DIR || 'uploads/ocr';
const PDF_TRANSLATE_OUTPUT_DIR = process.env.PDF_TRANSLATE_OUTPUT_DIR || 'uploads/translate';
const PDF_IMAGES_OUTPUT_DIR = process.env.PDF_IMAGES_OUTPUT_DIR || 'uploads/images';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	if (!session) {
		throw redirect(302, '/login');
	}

	const taskId = parseInt(params.id);
	if (!taskId || isNaN(taskId)) {
		throw error(400, '无效的任务ID');
	}

	try {
		// 获取任务信息
		const [task] = await db
			.select({
				id: table.metaParseTask.id,
				userId: table.metaParseTask.userId,
				parseType: table.metaParseTask.parseType,
				fileName: table.metaParseTask.fileName,
				filePath: table.metaParseTask.filePath,
				pageNum: table.metaParseTask.pageNum,
				status: table.metaParseTask.status,
				createdAt: table.metaParseTask.createdAt,
				username: table.user.username
			})
			.from(table.metaParseTask)
			.leftJoin(table.user, eq(table.metaParseTask.userId, table.user.id))
			.where(eq(table.metaParseTask.id, taskId))
			.limit(1);

		if (!task) {
			throw error(404, '任务不存在');
		}

		// 只有已完成的任务才能审核
		if (task.status !== 2) {
			throw error(400, '只有已完成的任务才能进行审核');
		}

		// 获取OCR结果
		const ocrResults = await db
			.select()
			.from(table.metaOcrOutput)
			.where(eq(table.metaOcrOutput.taskId, taskId));

		// 获取翻译结果（如果有）
		const translateResults = await db
			.select()
			.from(table.metaTranslateOutput)
			.where(eq(table.metaTranslateOutput.taskId, taskId));

		// 构建页面数据
		const pages: Array<{
			pageNum: number;
			imageUrl: string;
			ocrText: string;
			translateText: string;
		}> = [];

		// 查找图片文件目录
		const imagesDir = join(PDF_IMAGES_OUTPUT_DIR, `task_${taskId}`, 'images');
		
		let imageBaseDir = '';
		let pdfDirName = '';
		try {
			// 尝试找到图片目录
			const dirs = await fs.readdir(imagesDir);
			const pdfDir = dirs.find(dir => !dir.includes('.') && !dir.startsWith('.'));
			if (pdfDir) {
				imageBaseDir = join(imagesDir, pdfDir);
				pdfDirName = pdfDir;
			}
		} catch (e) {
			console.warn('Images directory not found:', imagesDir);
		}

		// 构建每页的数据
		for (let i = 1; i <= (task.pageNum || 0); i++) {
			const pageNumStr = i.toString().padStart(3, '0');
			
			// 更精确的OCR结果匹配：确保完全匹配页码
			const ocrResult = ocrResults.find(ocr => {
				if (!ocr.inputFilePath) return false;
				// 精确匹配：确保是page_XXX.png格式，避免page_001匹配到page_0011
				const pagePattern = new RegExp(`page_${pageNumStr}\\.(png|jpg|jpeg)$`, 'i');
				return pagePattern.test(ocr.inputFilePath);
			});
			
			// 更精确的翻译结果匹配：通过OCR输出路径匹配
			const translateResult = translateResults.find(trans => {
				if (!trans.inputFilePath) return false;
				// 翻译的输入文件应该是OCR的输出文件
				const ocrPattern = new RegExp(`page_${pageNumStr}\\.txt$`, 'i');
				return ocrPattern.test(trans.inputFilePath);
			});

			// 读取OCR文本
			let ocrText = '';
			if (ocrResult?.outputTxtPath) {
				try {
					ocrText = await fs.readFile(ocrResult.outputTxtPath, 'utf-8');
				} catch (e) {
					console.warn('OCR file not found:', ocrResult.outputTxtPath);
				}
			}

			// 读取翻译文本
			let translateText = '';
			if (translateResult?.outputTxtPath) {
				try {
					translateText = await fs.readFile(translateResult.outputTxtPath, 'utf-8');
				} catch (e) {
					console.warn('Translation file not found:', translateResult.outputTxtPath);
				}
			}

			// 构建图片URL
			const imagePath = join(imageBaseDir, `page_${pageNumStr}.png`);
			const imageExists = await fs.access(imagePath).then(() => true).catch(() => false);
			
			// 添加调试日志以验证顺序对应
			console.log(`Page ${i} mapping:`, {
				pageNum: i,
				imageExists,
				hasOcr: !!ocrResult,
				hasTranslation: !!translateResult,
				ocrPath: ocrResult?.outputTxtPath,
				translationPath: translateResult?.outputTxtPath
			});
			
			pages.push({
				pageNum: i,
				imageUrl: imageExists ? `/api/tasks/review/image/${taskId}/${pageNumStr}?dir=${encodeURIComponent(pdfDirName)}` : '',
				ocrText,
				translateText
			});
		}

		return {
			task: {
				id: task.id,
				userId: task.userId,
				parseType: task.parseType,
				fileName: task.fileName,
				status: task.status,
				createdAt: task.createdAt.toISOString(),
				username: task.username,
				pageNum: task.pageNum
			},
			pages,
			currentUser: locals.user
		};

	} catch (e) {
		console.error('Error loading task review:', e);
		if (e instanceof Error && e.message.includes('不存在')) {
			throw error(404, e.message);
		}
		throw error(500, '加载任务详情失败');
	}
};

export const actions: Actions = {
	saveTranslation: async ({ request, params }) => {
		const taskId = parseInt(params.id);
		if (!taskId || isNaN(taskId)) {
			return fail(400, { message: '无效的任务ID' });
		}

		const formData = await request.formData();
		const pageNum = parseInt(formData.get('pageNum') as string);
		const translationText = formData.get('translationText') as string;

		if (!pageNum || isNaN(pageNum)) {
			return fail(400, { message: '无效的页码' });
		}

		if (!translationText) {
			return fail(400, { message: '翻译内容不能为空' });
		}

		try {
			// 查找对应的翻译记录
			const pageNumStr = pageNum.toString().padStart(3, '0');
			const translateResults = await db
				.select()
				.from(table.metaTranslateOutput)
				.where(eq(table.metaTranslateOutput.taskId, taskId));

			// 查找匹配页面的翻译记录
			const translateResult = translateResults.find(trans => 
				trans.outputTxtPath?.includes(`page_${pageNumStr}`)
			);

			if (translateResult?.outputTxtPath) {
				// 保存翻译内容到文件
				await fs.writeFile(translateResult.outputTxtPath, translationText, 'utf-8');
				
				return {
					success: true,
					message: `第${pageNum}页翻译内容已保存`
				};
			} else {
				// 如果没有翻译记录，创建一个
				const outputDir = join(PDF_TRANSLATE_OUTPUT_DIR, `task_${taskId}`);
				await fs.mkdir(outputDir, { recursive: true });
				
				const outputPath = join(outputDir, `page_${pageNumStr}.txt`);
				await fs.writeFile(outputPath, translationText, 'utf-8');

				// 在数据库中创建记录
				await db.insert(table.metaTranslateOutput).values({
					taskId: taskId,
					inputFilePath: join(PDF_OCR_OUTPUT_DIR, `task_${taskId}`, `page_${pageNumStr}.txt`),
					outputTxtPath: outputPath,
					status: 2 // finished
				});

				return {
					success: true,
					message: `第${pageNum}页翻译内容已保存`
				};
			}
		} catch (error) {
			console.error('Save translation error:', error);
			return fail(500, { message: '保存翻译内容失败，请重试' });
		}
	}
};
