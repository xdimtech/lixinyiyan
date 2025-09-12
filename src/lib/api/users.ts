// 用户API客户端
export interface User {
	id: string;
	username: string;
	role: string;
}

export interface UserOption {
	id: string;
	username: string;
}

export interface UserWithTaskCount {
	username: string;
	taskCount: number;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	total?: number;
	error?: string;
}

/**
 * 获取用户选项列表（包含ID和用户名）
 */
export async function getUserOptions(): Promise<UserOption[]> {
	try {
		const response = await fetch('/api/users?type=usernames');
		const result: ApiResponse<UserOption[]> = await response.json();
		
		if (!response.ok || !result.success) {
			throw new Error(result.error || '获取用户选项列表失败');
		}
		
		return result.data || [];
	} catch (error) {
		console.error('获取用户选项列表失败:', error);
		throw error;
	}
}

/**
 * 获取用户名列表（仅用户名字符串）
 */
export async function getUsernames(): Promise<string[]> {
	try {
		const userOptions = await getUserOptions();
		return userOptions.map(user => user.username);
	} catch (error) {
		console.error('获取用户名列表失败:', error);
		throw error;
	}
}

/**
 * 获取完整用户列表
 */
export async function getUsers(): Promise<User[]> {
	try {
		const response = await fetch('/api/users?type=users');
		const result: ApiResponse<User[]> = await response.json();
		
		if (!response.ok || !result.success) {
			throw new Error(result.error || '获取用户列表失败');
		}
		
		return result.data || [];
	} catch (error) {
		console.error('获取用户列表失败:', error);
		throw error;
	}
}

/**
 * 获取有任务的用户列表及任务数量
 */
export async function getUsersWithTaskCount(): Promise<UserWithTaskCount[]> {
	try {
		const response = await fetch('/api/users?type=users-with-tasks');
		const result: ApiResponse<UserWithTaskCount[]> = await response.json();
		
		if (!response.ok || !result.success) {
			throw new Error(result.error || '获取用户任务统计失败');
		}
		
		return result.data || [];
	} catch (error) {
		console.error('获取用户任务统计失败:', error);
		throw error;
	}
}

/**
 * 通用API调用函数
 */
export async function fetchUsers<T>(type: 'usernames' | 'users' | 'users-with-tasks'): Promise<T> {
	try {
		const response = await fetch(`/api/users?type=${type}`);
		const result: ApiResponse<T> = await response.json();
		
		if (!response.ok || !result.success) {
			throw new Error(result.error || '获取数据失败');
		}
		
		return result.data as T;
	} catch (error) {
		console.error(`获取${type}失败:`, error);
		throw error;
	}
}
