import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processPendingTasksPipeline } from '$lib/server/task-processor-pipeline';

export const POST: RequestHandler = async () => {
    try {
        await processPendingTasksPipeline();
        return json({ success: true, message: '流水线任务处理完成' });
    } catch (error) {
        console.error('流水线任务处理失败:', error);
        return json(
            { success: false, message: '流水线任务处理失败', error: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        );
    }
};

