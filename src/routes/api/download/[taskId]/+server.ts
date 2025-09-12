import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createReadStream, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { imagesOutputDir, translateOutputDir, ocrZipOutputDir, translateZipOutputDir } from '$lib/config/paths';

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

        // 根据处理类型确定压缩包路径 - 与任务处理器逻辑保持一致
        let zipPath: string;
        let outputDir: string;
        
        // 使用与任务处理器相同的文件名构建逻辑
        const fileNameWithoutExt = basename(task.fileName, extname(task.fileName));
        
        if (task.parseType === 'translate') {
            // 翻译任务：结果在 translateOutputDir 中
            outputDir = translateZipOutputDir;
            zipPath = join(translateOutputDir, `task_${taskId}`, `${fileNameWithoutExt}_translate_result.zip`);
        } else {
            // OCR任务：结果在 imagesOutputDir 中
            outputDir = ocrZipOutputDir;
            zipPath = join(ocrZipOutputDir, `task_${taskId}`, `${fileNameWithoutExt}_ocr_result.zip`);
        }
        
        console.log(`任务类型: ${task.parseType}`);
        console.log(`使用输出目录: ${outputDir}`);
        console.log(`查找压缩包文件: ${zipPath}`);
        console.log(`文件是否存在: ${existsSync(zipPath)}`);
        
        if (!existsSync(zipPath)) {
            console.error(`压缩包文件不存在: ${zipPath}`);
            throw error(404, '结果文件不存在');
        }

        // 读取文件并返回
        const stream = createReadStream(zipPath);
        
        // 根据任务类型设置下载文件名 - 与压缩包实际文件名一致
        const downloadFileName = task.parseType === 'translate' 
            ? `${fileNameWithoutExt}_translate_result.zip`
            : `${fileNameWithoutExt}_ocr_result.zip`;
        
        return new Response(stream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${downloadFileName}"`
            }
        });

    } catch (err) {
        console.error('下载文件失败:', err);
        if (err instanceof Response) {
            throw err;
        }
        throw error(500, '下载文件失败');
    }
};

