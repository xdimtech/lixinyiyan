import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processPendingTasks } from '$lib/server/task-processor';

export const POST: RequestHandler = async () => {
    try {
        await processPendingTasks();
        return json({ success: true, message: '任务处理完成' });
    } catch (error) {
        console.error('任务处理失败:', error);
        return json(
            { success: false, message: '任务处理失败', error: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        );
    }
};
