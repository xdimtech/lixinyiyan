// 任务API客户端
export interface Task {
	id: number;
	userId: string;
	parseType: string;
	fileName: string;
	filePath: string;
	pageNum: number | null;
	status: number;
	createdAt: string | Date;
	updatedAt: string | Date;
	username: string;
}

export interface TaskFilterRequest {
	userId?: string;
	status?: number;
}

export interface TaskFilterResponse {
	success: boolean;
	data?: Task[];
	total?: number;
	filters?: {
		userId: string | null;
		status: number | null;
	};
	error?: string;
}

/**
 * 筛选任务列表
 */
export async function filterTasks(filters: TaskFilterRequest): Promise<Task[]> {
	try {
		const response = await fetch('/api/tasks/filter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(filters)
		});

		const result: TaskFilterResponse = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(result.error || '筛选任务失败');
		}

		return result.data || [];
	} catch (error) {
		console.error('筛选任务失败:', error);
		throw error;
	}
}

/**
 * 按用户ID筛选任务
 */
export async function getTasksByUserId(userId: string): Promise<Task[]> {
	return filterTasks({ userId });
}

/**
 * 按状态筛选任务
 */
export async function getTasksByStatus(status: number): Promise<Task[]> {
	return filterTasks({ status });
}

/**
 * 按用户ID和状态筛选任务
 */
export async function getTasksByUserAndStatus(userId: string, status: number): Promise<Task[]> {
	return filterTasks({ userId, status });
}

/**
 * 获取所有任务（无筛选条件）
 */
export async function getAllTasks(): Promise<Task[]> {
	return filterTasks({});
}
