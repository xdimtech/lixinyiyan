import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_OUTPUT_DIR = "/tmp/output_dir";

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        throw error(401, '请先登录');
    }

    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
        throw error(400, '无效的任务ID');
    }

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

        // 构建压缩包路径
        const zipPath = join(DEFAULT_OUTPUT_DIR, `task_${taskId}`, `${task.fileName}_result.zip`);
        
        if (!existsSync(zipPath)) {
            throw error(404, '结果文件不存在');
        }

        // 读取文件并返回
        const stream = createReadStream(zipPath);
        
        return new Response(stream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${task.fileName}_result.zip"`
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
