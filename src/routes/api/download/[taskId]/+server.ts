import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createReadStream, existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join, basename, extname } from 'path';
import { imagesOutputDir, translateOutputDir, ocrOutputDir, ocrZipOutputDir, translateZipOutputDir } from '$lib/config/paths';
import { createZipArchive } from '$lib/server/pdf-processor';

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        throw error(401, '请先登录');
    }

    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
        throw error(400, '无效的任务ID');
    }

    //打印日志
    console.log(`下载任务 ${taskId}`);

    try {
        // 获取任务信息
        const [task] = await db
            .select()
            .from(table.metaParseTask)
            .where(eq(table.metaParseTask.id, taskId))
            .limit(1);

        if (!task) {
            throw error(404, '任务不存在');
        }

        // 检查权限（用户只能下载自己的任务，管理员可以下载所有任务）
        if (task.userId !== locals.user.id && locals.user.role !== 'admin') {
            throw error(403, '无权限下载此任务');
        }

        // 检查任务是否完成
        if (task.status !== 2) {
            throw error(400, '任务尚未完成，无法下载');
        }

        // 构建日期字符串 (YYYY-MM-DD 格式，与任务处理器保持一致)
        const taskDate = new Date(task.createdAt);
        const dateString = taskDate.toISOString().split('T')[0];
        
        // 使用与任务处理器相同的文件名构建逻辑
        const fileNameWithoutExt = basename(task.fileName, extname(task.fileName));
        
        console.log(`任务类型: ${task.parseType}`);
        console.log(`任务日期: ${dateString}`);
        console.log(`开始动态创建压缩包...`);
        
        // 动态创建压缩包
        const zipPath = await createDynamicZipArchive(task, taskId, dateString, fileNameWithoutExt);
        
        console.log(`压缩包创建完成: ${zipPath}`);
        
        if (!existsSync(zipPath)) {
            console.error(`压缩包创建失败: ${zipPath}`);
            throw error(500, '压缩包创建失败');
        }
        
        // 读取文件并返回
        const stream = createReadStream(zipPath);
        
        // 根据任务类型设置下载文件名 - 与压缩包实际文件名一致
        const downloadFileName = task.parseType === 'translate' 
            ? `${fileNameWithoutExt}_translate_result.zip`
            : `${fileNameWithoutExt}_ocr_result.zip`;
        
        // 对文件名进行 URL 编码以处理中文字符
        const encodedFilename = encodeURIComponent(downloadFileName);
        
        // 创建响应，但在流结束后清理临时文件
        const response = new Response(stream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`
            }
        });
        
        // 在流结束后异步清理临时文件
        stream.on('end', () => {
            setTimeout(async () => {
                try {
                    await fs.unlink(zipPath);
                    console.log(`临时压缩包已清理: ${zipPath}`);
                } catch (err) {
                    console.warn(`清理临时压缩包失败: ${zipPath}`, err);
                }
            }, 1000); // 延迟1秒确保文件传输完成
        });
        
        return response;

    } catch (err) {
        console.error('下载文件失败:', err);
        if (err instanceof Response) {
            throw err;
        }
        throw error(500, '下载文件失败');
    }
};

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
 * 动态创建压缩包
 */
async function createDynamicZipArchive(
    task: any, 
    taskId: number, 
    dateString: string, 
    fileNameWithoutExt: string
): Promise<string> {
    const tempDir = join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const timestamp = Date.now();
    const tempZipPath = join(tempDir, `${fileNameWithoutExt}_${task.parseType}_${timestamp}.zip`);
    const tempPackageDir = join(tempDir, `package_${timestamp}`);
    
    await fs.mkdir(tempPackageDir, { recursive: true });
    
    try {
        if (task.parseType === 'translate') {
            // 翻译任务：复制翻译结果
            const sourceDir = join(translateOutputDir, dateString, `task_${taskId}`);
            console.log(`复制翻译结果: ${sourceDir} -> ${tempPackageDir}`);
            
            if (existsSync(sourceDir)) {
                const files = await fs.readdir(sourceDir);
                for (const file of files) {
                    const srcPath = join(sourceDir, file);
                    const destPath = join(tempPackageDir, file);
                    const stat = await fs.stat(srcPath);
                    if (stat.isFile()) {
                        await fs.copyFile(srcPath, destPath);
                    } else if (stat.isDirectory()) {
                        await copyDirectory(srcPath, destPath);
                    }
                }
            } else {
                throw new Error(`翻译结果目录不存在: ${sourceDir}`);
            }
        } else {
            // OCR任务：复制OCR结果
            const sourceDir = join(ocrOutputDir, dateString, `task_${taskId}`);
            console.log(`复制OCR结果: ${sourceDir} -> ${tempPackageDir}`);
            
            if (existsSync(sourceDir)) {
                const files = await fs.readdir(sourceDir);
                for (const file of files) {
                    const srcPath = join(sourceDir, file);
                    const destPath = join(tempPackageDir, file);
                    const stat = await fs.stat(srcPath);
                    if (stat.isFile()) {
                        await fs.copyFile(srcPath, destPath);
                    } else if (stat.isDirectory()) {
                        await copyDirectory(srcPath, destPath);
                    }
                }
            } else {
                throw new Error(`OCR结果目录不存在: ${sourceDir}`);
            }
        }
        
        // 创建压缩包
        console.log(`创建压缩包: ${tempPackageDir} -> ${tempZipPath}`);
        await createZipArchive(tempPackageDir, tempZipPath);
        
        // 清理临时打包目录
        await fs.rm(tempPackageDir, { recursive: true, force: true });
        
        return tempZipPath;
        
    } catch (error) {
        // 清理临时目录
        try {
            await fs.rm(tempPackageDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.warn('清理临时目录失败:', cleanupError);
        }
        throw error;
    }
}

