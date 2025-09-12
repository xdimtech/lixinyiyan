import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { join } from 'path';
import { promises as fs } from 'fs';
import { ocrOutputDir, translateOutputDir, imagesOutputDir } from '$lib/config/paths';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	if (!session || !locals.user) {
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

		// 权限检查：普通用户只能审核自己创建的任务，管理员和经理可以审核所有任务
		if (task.userId !== locals.user.id && 
			locals.user.role !== 'admin' && 
			locals.user.role !== 'manager') {
			throw error(403, '权限不足：您只能审核自己创建的任务');
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

		// 构建OCR结果的页码映射，便于快速查找
		const ocrResultsMap = new Map();
		ocrResults.forEach(ocr => {
			if (ocr.pageNo) {
				ocrResultsMap.set(ocr.pageNo, ocr);
			}
		});

		// 构建翻译结果的页码映射，便于快速查找
		const translateResultsMap = new Map();
		translateResults.forEach(trans => {
			if (trans.pageNo) {
				translateResultsMap.set(trans.pageNo, trans);
			}
		});

		// 构建页面数据
		const pages: Array<{
			pageNum: number;
			imageUrl: string;
			ocrText: string;
			translateText: string;
		}> = [];

		// 查找图片文件目录
		const taskImagesDir = join(imagesOutputDir, `task_${taskId}`, 'images');
		
		let imageBaseDir = '';
		let pdfDirName = '';
		try {
			// 尝试找到图片目录
			const dirs = await fs.readdir(taskImagesDir);
			const pdfDir = dirs.find(dir => !dir.includes('.') && !dir.startsWith('.'));
			if (pdfDir) {
				imageBaseDir = join(taskImagesDir, pdfDir);
				pdfDirName = pdfDir;
			}
		} catch (e) {
			console.warn('Images directory not found:', taskImagesDir);
		}

		// 构建每页的数据
		for (let i = 1; i <= (task.pageNum || 0); i++) {
			const pageNumStr = i.toString().padStart(3, '0');
			
			// 通过页码直接查找OCR结果
			const ocrResult = ocrResultsMap.get(i);
			
			// 通过页码直接查找翻译结果
			const translateResult = translateResultsMap.get(i);

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
	saveTranslation: async ({ request, params, locals }) => {
		// 检查登录状态
		if (!locals.session || !locals.user) {
			return fail(401, { message: '请先登录' });
		}

		const taskId = parseInt(params.id);
		if (!taskId || isNaN(taskId)) {
			return fail(400, { message: '无效的任务ID' });
		}

		// 获取任务信息进行权限检查
		const [task] = await db
			.select({
				userId: table.metaParseTask.userId,
				status: table.metaParseTask.status
			})
			.from(table.metaParseTask)
			.where(eq(table.metaParseTask.id, taskId))
			.limit(1);

		if (!task) {
			return fail(404, { message: '任务不存在' });
		}

		// 权限检查：普通用户只能编辑自己创建的任务，管理员和经理可以编辑所有任务
		if (task.userId !== locals.user.id && 
			locals.user.role !== 'admin' && 
			locals.user.role !== 'manager') {
			return fail(403, { message: '权限不足：您只能编辑自己创建的任务' });
		}

		// 检查任务状态
		if (task.status !== 2) {
			return fail(400, { message: '只有已完成的任务才能进行审核编辑' });
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
			// 通过 taskId + pageNo 精确查找翻译记录
			const pageNumStr = pageNum.toString().padStart(3, '0');
			const [translateResult] = await db
				.select()
				.from(table.metaTranslateOutput)
				.where(
					and(
						eq(table.metaTranslateOutput.taskId, taskId),
						eq(table.metaTranslateOutput.pageNo, pageNum)
					)
				)
				.limit(1);

			if (translateResult?.outputTxtPath) {
				// 保存翻译内容到文件
				await fs.writeFile(translateResult.outputTxtPath, translationText, 'utf-8');
				
				return {
					success: true,
					message: `第${pageNum}页翻译内容已保存`
				};
			} else {
				// 如果没有翻译记录，创建一个
				const outputDir = join(translateOutputDir, `task_${taskId}`);
				await fs.mkdir(outputDir, { recursive: true });
				
				const outputPath = join(outputDir, `page_${pageNumStr}.txt`);
				await fs.writeFile(outputPath, translationText, 'utf-8');

				// 在数据库中创建记录
				await db.insert(table.metaTranslateOutput).values({
					taskId: taskId,
					pageNo: pageNum,
					inputFilePath: join(ocrOutputDir, `task_${taskId}`, `page_${pageNumStr}.txt`),
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
