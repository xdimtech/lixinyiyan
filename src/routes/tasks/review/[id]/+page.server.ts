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

		// 获取处理结果（OCR和翻译统一在metaProcessOutput表中）
		const processResults = await db
			.select()
			.from(table.metaProcessOutput)
			.where(eq(table.metaProcessOutput.taskId, taskId));

		// 构建处理结果的页码映射，便于快速查找
		const processResultsMap = new Map();
		processResults.forEach(result => {
			if (result.pageNo) {
				processResultsMap.set(result.pageNo, result);
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
		const datestring = new Date().toISOString().split('T')[0];
		const taskImagesDir = join(imagesOutputDir, datestring, `task_${taskId}`);
		console.log('datestring', datestring);
		console.log('taskImagesDir', taskImagesDir);
		console.log('task.fileName', task.fileName);

		let imageBaseDir = taskImagesDir;
		let pdfDirName = '';
		try {
			// 检查图片目录是否存在
			await fs.access(taskImagesDir);
			// 图片直接存储在task目录下，不需要查找子目录
			imageBaseDir = taskImagesDir;
		} catch (e) {
			console.warn('Images directory not found:', taskImagesDir);
		}

		// 构建每页的数据
		for (let i = 1; i <= (task.pageNum || 0); i++) {
			const pageNumStr = i.toString().padStart(3, '0');
			
			// 通过页码直接查找处理结果
			const processResult = processResultsMap.get(i);

			// 读取OCR文本
			let ocrText = '';
			if (processResult?.ocrTxtPath) {
				try {
					ocrText = await fs.readFile(processResult.ocrTxtPath, 'utf-8');
				} catch (e) {
					console.warn('OCR file not found:', processResult.ocrTxtPath);
				}
			}

			// 读取翻译文本
			let translateText = '';
			if (processResult?.translateTxtPath) {
				try {
					translateText = await fs.readFile(processResult.translateTxtPath, 'utf-8');
				} catch (e) {
					console.warn('Translation file not found:', processResult.translateTxtPath);
				}
			}

			// 构建图片URL
			const imagePath = join(imageBaseDir, `page_${pageNumStr}.png`);
			const imageExists = await fs.access(imagePath).then(() => true).catch(() => false);
			
			// 添加调试日志以验证顺序对应
			console.log(`Page ${i} mapping:`, {
				pageNum: i,
				imageExists,
				hasOcr: !!processResult && processResult.ocrStatus === 2,
				hasTranslation: !!processResult && processResult.translateStatus === 2,
				ocrPath: processResult?.ocrTxtPath,
				translationPath: processResult?.translateTxtPath,
				ocrStatus: processResult?.ocrStatus,
				translateStatus: processResult?.translateStatus
			});
			
			pages.push({
				pageNum: i,
				imageUrl: imageExists ? `/api/tasks/review/image/${taskId}/${pageNumStr}` : '',
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
