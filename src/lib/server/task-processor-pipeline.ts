import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { pdfToImages, callOcrApi, callTranslateApi, saveTextToFile, createZipArchive } from './pdf-processor';
import { join, basename, extname } from 'path';
import { promises as fs } from 'fs';
import { initializePathConfig, ocrOutputDir, translateOutputDir, imagesOutputDir, ocrZipOutputDir, translateZipOutputDir } from '$lib/config/paths';

// 初始化路径配置
const pathConfig = initializePathConfig();

/**
 * 页面处理任务接口
 */
interface PageTask {
    taskId: number;
    pageNo: number;
    imagePath: string;
    ocrOutputPath: string;
    translateOutputPath?: string;
    parseType: string;
}

/**
 * OCR处理结果接口
 */
interface OcrResult {
    pageTask: PageTask;
    ocrText: string;
    success: boolean;
    error?: string;
}

/**
 * 翻译处理结果接口
 */
interface TranslateResult {
    pageTask: PageTask;
    translateText: string;
    success: boolean;
    error?: string;
}

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
 * 更新任务进度
 */
async function updateTaskProgress(taskId: number, curPage: number): Promise<void> {
    await db
        .update(table.metaParseTask)
        .set({ curPage })
        .where(eq(table.metaParseTask.id, taskId));
}

/**
 * 创建页面处理记录
 */
async function createPageProcessRecord(pageTask: PageTask): Promise<void> {
    await db.insert(table.metaProcessOutput).values({
        taskId: pageTask.taskId,
        pageNo: pageTask.pageNo,
        inputFilePath: pageTask.imagePath,
        ocrTxtPath: pageTask.ocrOutputPath,
        translateTxtPath: pageTask.translateOutputPath,
        ocrStatus: 0, // pending
        translateStatus: pageTask.parseType === 'translate' ? 0 : 2 // pending for translate, finished for ocr-only
    });
}

/**
 * 更新OCR处理状态
 */
async function updateOcrStatus(taskId: number, pageNo: number, status: number, ocrTxtPath?: string): Promise<void> {
    const updateData: any = { ocrStatus: status };
    if (ocrTxtPath) {
        updateData.ocrTxtPath = ocrTxtPath;
    }
    
    await db
        .update(table.metaProcessOutput)
        .set(updateData)
        .where(and(
            eq(table.metaProcessOutput.taskId, taskId),
            eq(table.metaProcessOutput.pageNo, pageNo)
        ));
}

/**
 * 更新翻译处理状态
 */
async function updateTranslateStatus(taskId: number, pageNo: number, status: number, translateTxtPath?: string): Promise<void> {
    const updateData: any = { translateStatus: status };
    if (translateTxtPath) {
        updateData.translateTxtPath = translateTxtPath;
    }
    
    await db
        .update(table.metaProcessOutput)
        .set(updateData)
        .where(and(
            eq(table.metaProcessOutput.taskId, taskId),
            eq(table.metaProcessOutput.pageNo, pageNo)
        ));
}

/**
 * OCR处理器 - 处理单页OCR任务
 */
async function processOcrTask(pageTask: PageTask): Promise<OcrResult> {
    const startTime = Date.now();
    try {
        console.log(`开始OCR处理第 ${pageTask.pageNo} 页: ${pageTask.imagePath}`);
        
        // 更新OCR状态为处理中
        const statusUpdateStart = Date.now();
        await updateOcrStatus(pageTask.taskId, pageTask.pageNo, 1); // processing
        const statusUpdateDuration = Date.now() - statusUpdateStart;
        
        // 调用OCR API
        const apiCallStart = Date.now();
        const ocrText = await callOcrApi(pageTask.imagePath);
        const apiCallDuration = Date.now() - apiCallStart;
        
        // 保存OCR结果
        const saveFileStart = Date.now();
        await saveTextToFile(ocrText, pageTask.ocrOutputPath);
        const saveFileDuration = Date.now() - saveFileStart;
        
        // 更新OCR状态为完成
        const finalUpdateStart = Date.now();
        await updateOcrStatus(pageTask.taskId, pageTask.pageNo, 2, pageTask.ocrOutputPath); // finished
        const finalUpdateDuration = Date.now() - finalUpdateStart;
        
        const totalDuration = Date.now() - startTime;
        console.log(`OCR处理完成第 ${pageTask.pageNo} 页，总耗时: ${totalDuration}ms，详细耗时 - API调用: ${apiCallDuration}ms, 保存文件: ${saveFileDuration}ms, 状态更新: ${statusUpdateDuration + finalUpdateDuration}ms，输出长度: ${ocrText.length}`);
        
        return {
            pageTask,
            ocrText,
            success: true
        };
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        const errorMsg = `OCR处理第 ${pageTask.pageNo} 页失败 (耗时: ${totalDuration}ms): ${error}`;
        console.error(errorMsg);
        
        // 保存错误信息
        await saveTextToFile(errorMsg, pageTask.ocrOutputPath);
        
        // 更新OCR状态为失败
        await updateOcrStatus(pageTask.taskId, pageTask.pageNo, 3, pageTask.ocrOutputPath); // failed
        
        return {
            pageTask,
            ocrText: '',
            success: false,
            error: errorMsg
        };
    }
}

/**
 * 翻译处理器 - 处理单页翻译任务
 */
async function processTranslateTask(ocrResult: OcrResult): Promise<TranslateResult> {
    const { pageTask, ocrText, success } = ocrResult;
    
    if (!success || !pageTask.translateOutputPath) {
        return {
            pageTask,
            translateText: '',
            success: false,
            error: 'OCR失败或不需要翻译'
        };
    }
    
    const startTime = Date.now();
    try {
        console.log(`开始翻译处理第 ${pageTask.pageNo} 页，OCR文本长度: ${ocrText.length}`);
        
        // 更新翻译状态为处理中
        const statusUpdateStart = Date.now();
        await updateTranslateStatus(pageTask.taskId, pageTask.pageNo, 1); // processing
        const statusUpdateDuration = Date.now() - statusUpdateStart;
        
        // 调用翻译API
        const apiCallStart = Date.now();
        const translateText = await callTranslateApi(ocrText, undefined, (progress) => {
            // console.log(`第 ${pageTask.pageNo} 页翻译进度 [${progress.type}]:`, progress.content.slice(0, 50) + (progress.content.length > 50 ? '...' : ''));
        });
        const apiCallDuration = Date.now() - apiCallStart;
        
        // 保存翻译结果
        const saveFileStart = Date.now();
        await saveTextToFile(translateText, pageTask.translateOutputPath);
        const saveFileDuration = Date.now() - saveFileStart;
        
        // 更新翻译状态为完成
        const finalUpdateStart = Date.now();
        await updateTranslateStatus(pageTask.taskId, pageTask.pageNo, 2, pageTask.translateOutputPath); // finished
        const finalUpdateDuration = Date.now() - finalUpdateStart;
        
        const totalDuration = Date.now() - startTime;
        console.log(`翻译处理完成第 ${pageTask.pageNo} 页，总耗时: ${totalDuration}ms，详细耗时 - API调用: ${apiCallDuration}ms, 保存文件: ${saveFileDuration}ms, 状态更新: ${statusUpdateDuration + finalUpdateDuration}ms，输出长度: ${translateText.length}`);
        
        return {
            pageTask,
            translateText,
            success: true
        };
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        const errorMsg = `翻译处理第 ${pageTask.pageNo} 页失败 (耗时: ${totalDuration}ms): ${error}`;
        console.error(errorMsg);
        
        // 保存错误信息
        if (pageTask.translateOutputPath) {
            await saveTextToFile(errorMsg, pageTask.translateOutputPath);
        }
        
        // 更新翻译状态为失败
        await updateTranslateStatus(pageTask.taskId, pageTask.pageNo, 3, pageTask.translateOutputPath); // failed
        
        return {
            pageTask,
            translateText: '',
            success: false,
            error: errorMsg
        };
    }
}

/**
 * 流水线处理PDF解析任务
 */
export async function processTaskPipeline(taskId: number): Promise<void> {
    const taskStartTime = Date.now();
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

        console.log(`开始流水线处理任务 ${taskId}: ${task.fileName}`);

        // 格式化任务创建日期为 YYYY-MM-DD 格式
        const taskDate = new Date(task.createdAt);
        const dateString = taskDate.toISOString().split('T')[0]; // 格式: 2025-09-12

        // 1. PDF转图片 - 包含日期路径
        const pdfConvertStart = Date.now();
        const taskImagesDir = join(imagesOutputDir, dateString, `task_${taskId}`);
        const imagePaths = await pdfToImages(task.filePath, taskImagesDir);
        const pdfConvertDuration = Date.now() - pdfConvertStart;
        console.log(`PDF转图片完成，耗时: ${pdfConvertDuration}ms，生成 ${imagePaths.length} 页图片`);

        const outputOCRDir = join(ocrOutputDir, dateString, `task_${taskId}`);
        const outputTranslateDir = join(translateOutputDir, dateString, `task_${taskId}`);
        
        // 更新页数
        await db
            .update(table.metaParseTask)
            .set({ pageNum: imagePaths.length })
            .where(eq(table.metaParseTask.id, taskId));

        // 2. 准备页面处理任务
        const pageTasks: PageTask[] = imagePaths.map((imagePath, i) => {
            const pageNo = i + 1;
            const ocrOutputPath = join(outputOCRDir, `page_${pageNo.toString().padStart(3, '0')}.txt`);
            const translateOutputPath = task.parseType === 'translate' 
                ? join(outputTranslateDir, `page_${pageNo.toString().padStart(3, '0')}.txt`)
                : undefined;
            
            return {
                taskId,
                pageNo,
                imagePath,
                ocrOutputPath,
                translateOutputPath,
                parseType: task.parseType
            };
        });

        // 3. 为每个页面创建处理记录
        for (const pageTask of pageTasks) {
            await createPageProcessRecord(pageTask);
        }

        // 4. 流水线处理 - 使用并发控制避免API过载
        console.log(`开始流水线处理 ${pageTasks.length} 页`);
        
        // 并发控制：根据模型服务限制调整
        // OCR服务(8002端口)和翻译服务(8003端口)各自max-num-seqs=2
        const MAX_CONCURRENT_OCR = 1; // OCR服务最大并发
        const MAX_CONCURRENT_TRANSLATE = 1; // 翻译服务保守设置，避免与OCR冲突
        
        if (task.parseType === 'only_ocr') {
            // 只需要OCR，串行处理
            const ocrPhaseStart = Date.now();
            console.log(`开始串行处理OCR任务，总页数: ${pageTasks.length}`);
            let successCount = 0;
            let failCount = 0;
            
            for (const pageTask of pageTasks) {
                const result = await processOcrTask(pageTask);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
                // 更新进度
                await updateTaskProgress(taskId, result.pageTask.pageNo);
            }
            
            const ocrPhaseDuration = Date.now() - ocrPhaseStart;
            console.log(`所有OCR任务处理完成，总耗时: ${ocrPhaseDuration}ms，成功: ${successCount}页，失败: ${failCount}页`);
        } else {
            // 需要翻译，实现真正的OCR->翻译流水线
            const pipelineStart = Date.now();
            console.log('启动OCR->翻译流水线处理');
            
            // 创建任务队列和结果收集
            const ocrQueue: PageTask[] = [...pageTasks];
            const translateQueue: OcrResult[] = [];
            const allResults: TranslateResult[] = [];
            
            let ocrRunning = 0;
            let translateRunning = 0;
            let ocrCompleted = 0;
            let translateCompleted = 0;
            let ocrSuccessCount = 0;
            let ocrFailCount = 0;
            let translateSuccessCount = 0;
            let translateFailCount = 0;
            
            // OCR处理函数
            const processNextOcr = async (): Promise<void> => {
                while (ocrQueue.length > 0 && ocrRunning < MAX_CONCURRENT_OCR) {
                    const pageTask = ocrQueue.shift();
                    if (!pageTask) break;
                    
                    ocrRunning++;
                    console.log(`启动OCR处理: 页面${pageTask.pageNo} (当前OCR并发: ${ocrRunning}/${MAX_CONCURRENT_OCR})`);
                    
                    try {
                        const ocrResult = await processOcrTask(pageTask);
                        
                        // 统计OCR结果
                        if (ocrResult.success) {
                            ocrSuccessCount++;
                        } else {
                            ocrFailCount++;
                        }
                        
                        // OCR完成，立即加入翻译队列
                        translateQueue.push(ocrResult);
                        ocrCompleted++;
                        console.log(`OCR完成: 页面${pageTask.pageNo} (${ocrCompleted}/${pageTasks.length}，成功: ${ocrSuccessCount}，失败: ${ocrFailCount})`);
                        
                        // 触发翻译处理
                        processNextTranslate();
                        
                    } catch (error) {
                        console.error(`OCR失败: 页面${pageTask.pageNo}`, error);
                        ocrFailCount++;
                        ocrCompleted++;
                    } finally {
                        ocrRunning--;
                        // 继续处理下一个OCR任务
                        processNextOcr();
                    }
                }
            };
            
            // 翻译处理函数
            const processNextTranslate = async (): Promise<void> => {
                while (translateQueue.length > 0 && translateRunning < MAX_CONCURRENT_TRANSLATE) {
                    const ocrResult = translateQueue.shift();
                    if (!ocrResult) break;
                    
                    translateRunning++;
                    console.log(`启动翻译处理: 页面${ocrResult.pageTask.pageNo} (当前翻译并发: ${translateRunning}/${MAX_CONCURRENT_TRANSLATE})`);
                    
                    try {
                        const translateResult = await processTranslateTask(ocrResult);
                        allResults.push(translateResult);
                        
                        // 统计翻译结果
                        if (translateResult.success) {
                            translateSuccessCount++;
                        } else {
                            translateFailCount++;
                        }
                        
                        translateCompleted++;
                        
                        // 更新进度（翻译完成才算该页完成）
                        await updateTaskProgress(taskId, translateResult.pageTask.pageNo);
                        console.log(`翻译完成: 页面${translateResult.pageTask.pageNo} (${translateCompleted}/${pageTasks.length}，成功: ${translateSuccessCount}，失败: ${translateFailCount})`);
                        
                    } catch (error) {
                        console.error(`翻译失败: 页面${ocrResult.pageTask.pageNo}`, error);
                        translateFailCount++;
                        translateCompleted++;
                    } finally {
                        translateRunning--;
                        // 继续处理下一个翻译任务
                        processNextTranslate();
                    }
                }
            };
            
            // 启动流水线：同时启动多个OCR工作线程
            const ocrWorkers = Array(MAX_CONCURRENT_OCR).fill(0).map(() => processNextOcr());
            
            // 等待所有OCR完成
            await Promise.all(ocrWorkers);
            console.log('所有OCR任务完成，等待翻译完成...');
            
            // 等待所有翻译完成
            while (translateCompleted < pageTasks.length) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 短暂等待
                processNextTranslate(); // 确保翻译队列被处理
            }
            
            const pipelineDuration = Date.now() - pipelineStart;
            console.log(`流水线处理完成，总耗时: ${pipelineDuration}ms，OCR: ${ocrSuccessCount}成功/${ocrFailCount}失败，翻译: ${translateSuccessCount}成功/${translateFailCount}失败`);
        }

        // 5. 创建压缩包 - 包含日期路径
        const archiveStart = Date.now();
        await createResultArchives(task, taskId, dateString, outputOCRDir, outputTranslateDir);
        const archiveDuration = Date.now() - archiveStart;
        console.log(`压缩包创建完成，耗时: ${archiveDuration}ms`);
        
        // 6. 更新任务状态为完成
        await db
            .update(table.metaParseTask)
            .set({ status: 2 })
            .where(eq(table.metaParseTask.id, taskId));

        const totalTaskDuration = Date.now() - taskStartTime;
        console.log(`流水线任务 ${taskId} 处理完成，总耗时: ${totalTaskDuration}ms (PDF转换: ${pdfConvertDuration}ms, 处理阶段: ${totalTaskDuration - pdfConvertDuration - archiveDuration}ms, 压缩: ${archiveDuration}ms)`);

    } catch (error) {
        const totalTaskDuration = Date.now() - taskStartTime;
        console.error(`流水线任务 ${taskId} 处理失败 (耗时: ${totalTaskDuration}ms):`, error);
        
        // 更新任务状态为失败
        await db
            .update(table.metaParseTask)
            .set({ status: 3 })
            .where(eq(table.metaParseTask.id, taskId));
        
        throw error;
    }
}

/**
 * 创建结果压缩包
 */
async function createResultArchives(
    task: table.MetaParseTask, 
    taskId: number, 
    dateString: string, 
    outputOCRDir: string, 
    outputTranslateDir: string
): Promise<void> {
    // OCR结果压缩包
    const ocrZipOutputBaseDir = join(ocrZipOutputDir, dateString, `task_${taskId}`);
    const ocrZipSavePath = join(ocrZipOutputBaseDir, `${basename(task.fileName, extname(task.fileName))}_ocr_result.zip`);
    const ocrTempPackageDir = join(ocrZipOutputBaseDir, 'package');
    await fs.mkdir(ocrTempPackageDir, { recursive: true });

    try {
        const ocrFiles = await fs.readdir(outputOCRDir);
        for (const file of ocrFiles) {
            const srcPath = join(outputOCRDir, file);
            const destPath = join(ocrTempPackageDir, file);
            const stat = await fs.stat(srcPath);
            if (stat.isFile()) {
                await fs.copyFile(srcPath, destPath);
            } else if (stat.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            }
        }
        console.log(`创建OCR压缩包: ${ocrTempPackageDir} -> ${ocrZipSavePath}`);
        await createZipArchive(ocrTempPackageDir, ocrZipSavePath);
        await fs.rm(ocrTempPackageDir, { recursive: true, force: true });
    } catch (e) {
        console.warn('复制OCR文件失败:', e);
    }
    
    // 翻译结果压缩包（如果存在）
    if (task.parseType === 'translate') {
        const translateZipOutputBaseDir = join(translateZipOutputDir, dateString, `task_${taskId}`);
        const translateZipSavePath = join(translateZipOutputBaseDir, `${basename(task.fileName, extname(task.fileName))}_translate_result.zip`);
       
        const translateTempPackageDir = join(translateZipOutputBaseDir, 'package');
        await fs.mkdir(translateTempPackageDir, { recursive: true });
        
        try {
            const translateFiles = await fs.readdir(outputTranslateDir);
            for (const file of translateFiles) {
                const srcPath = join(outputTranslateDir, file);
                const destPath = join(translateTempPackageDir, file);
                const stat = await fs.stat(srcPath);
                if (stat.isFile()) {
                    await fs.copyFile(srcPath, destPath);
                } else if (stat.isDirectory()) {
                    await copyDirectory(srcPath, destPath);
                }
            }
            console.log(`创建翻译压缩包: ${translateTempPackageDir} -> ${translateZipSavePath}`);
            await createZipArchive(translateTempPackageDir, translateZipSavePath);
            await fs.rm(translateTempPackageDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('复制翻译文件失败:', e);
        }
    }
}

/**
 * 获取所有待处理的任务并使用流水线处理
 */
export async function processPendingTasksPipeline(): Promise<void> {
    try {
        const pendingTasks = await db
            .select()
            .from(table.metaParseTask)
            .where(eq(table.metaParseTask.status, 0)); // pending

        console.log(`找到 ${pendingTasks.length} 个待处理任务`);

        for (const task of pendingTasks) {
            try {
                await processTaskPipeline(task.id);
            } catch (error) {
                console.error(`流水线任务 ${task.id} 处理失败:`, error);
                // 继续处理其他任务
            }
        }
    } catch (error) {
        console.error('获取待处理任务失败:', error);
        throw error;
    }
}
