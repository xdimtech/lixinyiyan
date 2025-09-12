import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { pdfToImages, callOcrApi, callTranslateApi, saveTextToFile, createZipArchive } from './pdf-processor';
import { join, basename, extname } from 'path';
import { promises as fs } from 'fs';
import { initializePathConfig, ocrOutputDir, translateOutputDir, imagesOutputDir } from '$lib/config/paths';

// 初始化路径配置
const pathConfig = initializePathConfig();

/**
 * 递归复制目录
 */
async function copyDirectory(srcDir: string, destDir: string): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = join(srcDir, entry.name);
        const destPath = join(destDir, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

/**
 * 处理PDF解析任务
 */
export async function processTask(taskId: number): Promise<void> {
    try {
        // 获取任务信息
        const [task] = await db
            .select()
            .from(table.metaParseTask)
            .where(eq(table.metaParseTask.id, taskId))
            .limit(1);

        if (!task) {
            throw new Error(`任务 ${taskId} 不存在`);
        }

        // 更新任务状态为处理中
        await db
            .update(table.metaParseTask)
            .set({ status: 1 })
            .where(eq(table.metaParseTask.id, taskId));

        console.log(`开始处理任务 ${taskId}: ${task.fileName}`);

        // 1. PDF转图片
        const taskImagesDir = join(imagesOutputDir, `task_${taskId}`);
        const imagePaths = await pdfToImages(task.filePath, taskImagesDir);

        const outputOCRDir = join(ocrOutputDir, `task_${taskId}`);
        const outputTranslateDir = join(translateOutputDir, `task_${taskId}`);
        
        // 更新页数
        await db
            .update(table.metaParseTask)
            .set({ pageNum: imagePaths.length })
            .where(eq(table.metaParseTask.id, taskId));

        // 2. 处理每张图片
        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            console.log(`处理第 ${i + 1} 页: ${imagePath}`);
            const ocrOutputPath = join(outputOCRDir, `page_${(i + 1).toString().padStart(3, '0')}.txt`);

            var curOcrText = '';
            try {
                // OCR识别
                const ocrText = await callOcrApi(imagePath);
                curOcrText = ocrText;
                await saveTextToFile(ocrText, ocrOutputPath);

                // 保存OCR记录
                await db.insert(table.metaOcrOutput).values({
                    taskId: taskId,
                    inputFilePath: imagePath,
                    outputTxtPath: ocrOutputPath,
                    status: 2 // finished
                });

                // 如果需要翻译
                if (task.parseType === 'translate') {
                    console.log(`开始翻译第 ${i + 1} 页: ${ocrOutputPath}`);
                    const translateText = await callTranslateApi(ocrText);
                    const translateOutputPath = join(outputTranslateDir, `page_${(i + 1).toString().padStart(3, '0')}.txt`);
                    await saveTextToFile(translateText, translateOutputPath);

                    // 保存翻译记录
                    await db.insert(table.metaTranslateOutput).values({
                        taskId: taskId,
                        inputFilePath: ocrOutputPath,
                        outputTxtPath: translateOutputPath,
                        status: 2 // finished
                    });
                }

            } catch (error) {
                const fmtError = `处理第 ${i + 1} 页失败: ${error}`;
                console.error(fmtError);
                // 把错误写入
                await saveTextToFile(fmtError, ocrOutputPath);
                // 记录失败的OCR
                await db.insert(table.metaOcrOutput).values({
                    taskId: taskId,
                    inputFilePath: imagePath,
                    outputTxtPath: ocrOutputPath,
                    status: 3 // failed
                });
            }

            // 如果需要翻译
            if (task.parseType === 'translate') {
                const translateOutputPath = join(outputTranslateDir, `page_${(i + 1).toString().padStart(3, '0')}.txt`);

                try {
                    const translateText = await callTranslateApi(curOcrText);
                    await saveTextToFile(translateText, translateOutputPath);
                    // 保存翻译记录
                    await db.insert(table.metaTranslateOutput).values({
                        taskId: taskId,
                        inputFilePath: ocrOutputPath,
                        outputTxtPath: translateOutputPath,
                        status: 2 // finished
                    });
                } catch (error) {
                    const fmtError = `处理第 ${i + 1} 页翻译失败: ${error}`;
                    console.error(fmtError);
                    // 把错误写入
                    await saveTextToFile(fmtError, translateOutputPath);
                    // 记录失败的翻译
                    await db.insert(table.metaTranslateOutput).values({
                        taskId: taskId,
                        inputFilePath: ocrOutputPath,
                        outputTxtPath: translateOutputPath,
                        status: 3 // failed
                    });
                }
            }
        }

        // 3. 创建压缩包
        const zipSavePath = join(taskImagesDir, `${basename(task.fileName, extname(task.fileName))}_result.zip`);
        
        // 创建一个临时目录来组织所有结果文件
        const tempPackageDir = join(taskImagesDir, 'package');
        await fs.mkdir(tempPackageDir, { recursive: true });
        
        // 复制OCR结果到打包目录
        const tempOcrDir = join(tempPackageDir, 'ocr');
        await fs.mkdir(tempOcrDir, { recursive: true });
        try {
            const ocrFiles = await fs.readdir(outputOCRDir);
            for (const file of ocrFiles) {
                const srcPath = join(outputOCRDir, file);
                const destPath = join(tempOcrDir, file);
                const stat = await fs.stat(srcPath);
                if (stat.isFile()) {
                    await fs.copyFile(srcPath, destPath);
                } else if (stat.isDirectory()) {
                    // 如果是目录，递归复制
                    await copyDirectory(srcPath, destPath);
                }
            }
        } catch (e) {
            console.warn('复制OCR文件失败:', e);
        }
        
        // 复制翻译结果到打包目录（如果存在）
        if (task.parseType === 'translate') {
            const tempTranslateDir = join(tempPackageDir, 'translate');
            await fs.mkdir(tempTranslateDir, { recursive: true });
            try {
                const translateFiles = await fs.readdir(outputTranslateDir);
                for (const file of translateFiles) {
                    const srcPath = join(outputTranslateDir, file);
                    const destPath = join(tempTranslateDir, file);
                    const stat = await fs.stat(srcPath);
                    if (stat.isFile()) {
                        await fs.copyFile(srcPath, destPath);
                    } else if (stat.isDirectory()) {
                        // 如果是目录，递归复制
                        await copyDirectory(srcPath, destPath);
                    }
                }
            } catch (e) {
                console.warn('复制翻译文件失败:', e);
            }
        }
        
        console.log(`创建压缩包: ${tempPackageDir} -> ${zipSavePath}`);
        await createZipArchive(tempPackageDir, zipSavePath);
        
        // 清理临时打包目录
        await fs.rm(tempPackageDir, { recursive: true, force: true });

        // 4. 更新任务状态为完成
        await db
            .update(table.metaParseTask)
            .set({ status: 2 })
            .where(eq(table.metaParseTask.id, taskId));

        console.log(`任务 ${taskId} 处理完成`);

    } catch (error) {
        console.error(`任务 ${taskId} 处理失败:`, error);
        
        // 更新任务状态为失败
        await db
            .update(table.metaParseTask)
            .set({ status: 3 })
            .where(eq(table.metaParseTask.id, taskId));
        
        throw error;
    }
}

/**
 * 获取所有待处理的任务并处理
 */
export async function processPendingTasks(): Promise<void> {
    try {
        const pendingTasks = await db
            .select()
            .from(table.metaParseTask)
            .where(eq(table.metaParseTask.status, 0)); // pending

        console.log(`找到 ${pendingTasks.length} 个待处理任务`);

        for (const task of pendingTasks) {
            try {
                await processTask(task.id);
            } catch (error) {
                console.error(`任务 ${task.id} 处理失败:`, error);
                // 继续处理其他任务
            }
        }
    } catch (error) {
        console.error('获取待处理任务失败:', error);
        throw error;
    }
}

