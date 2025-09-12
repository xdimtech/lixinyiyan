// 任务API客户端
export interface Task {
	id: number;
	userId: string;
	parseType: string;
	fileName: string;
	filePath: string;
	pageNum: number | null;
	status: number;
	createdAt: string; // 现在统一返回字符串格式
	updatedAt: string; // 现在统一返回字符串格式
	username: string;
}

export interface TaskFilterRequest {
	userId?: string;
	status?: number;
	page?: number;
	pageSize?: number;
}

export interface TaskPagination {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface TaskFilterResponse {
	success: boolean;
	data?: Task[];
	pagination?: TaskPagination;
	filters?: {
		userId: string | null;
		status: number | null;
	};
	error?: string;
}

/**
 * 筛选任务列表（带分页）
 */
export async function filterTasks(filters: TaskFilterRequest): Promise<TaskFilterResponse> {
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

		return result;
	} catch (error) {
		console.error('筛选任务失败:', error);
		throw error;
	}
}

/**
 * 筛选任务列表（仅返回数据）
 */
export async function filterTasksData(filters: TaskFilterRequest): Promise<Task[]> {
	const result = await filterTasks(filters);
	return result.data || [];
}

/**
 * 按用户ID筛选任务
 */
export async function getTasksByUserId(userId: string, page = 1, pageSize = 10): Promise<Task[]> {
	return filterTasksData({ userId, page, pageSize });
}

/**
 * 按状态筛选任务
 */
export async function getTasksByStatus(status: number, page = 1, pageSize = 10): Promise<Task[]> {
	return filterTasksData({ status, page, pageSize });
}

/**
 * 按用户ID和状态筛选任务
 */
export async function getTasksByUserAndStatus(userId: string, status: number, page = 1, pageSize = 10): Promise<Task[]> {
	return filterTasksData({ userId, status, page, pageSize });
}

/**
 * 获取所有任务（无筛选条件）
 */
export async function getAllTasks(page = 1, pageSize = 10): Promise<Task[]> {
	return filterTasksData({ page, pageSize });
}
