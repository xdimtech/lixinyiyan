import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

interface FilterRequest {
	userId?: string;
	status?: number; // 可选：按状态筛选
}

export const POST: RequestHandler = async (event) => {
	// 检查用户是否已登录
	if (!event.locals.user) {
		return json({ 
			success: false, 
			error: '请先登录' 
		}, { status: 401 });
	}

	try {
		const body: FilterRequest = await event.request.json();
		const { userId, status } = body;

		// 构建基础查询
		let query = db
			.select({
				id: table.metaParseTask.id,
				userId: table.metaParseTask.userId,
				parseType: table.metaParseTask.parseType,
				fileName: table.metaParseTask.fileName,
				filePath: table.metaParseTask.filePath,
				pageNum: table.metaParseTask.pageNum,
				status: table.metaParseTask.status,
				createdAt: table.metaParseTask.createdAt,
				updatedAt: table.metaParseTask.updatedAt,
				username: table.user.username
			})
			.from(table.metaParseTask)
			.innerJoin(table.user, eq(table.metaParseTask.userId, table.user.id));

		// 添加筛选条件
		const conditions = [];
		
		if (userId) {
			conditions.push(eq(table.metaParseTask.userId, userId));
		}
		
		if (status !== undefined) {
			conditions.push(eq(table.metaParseTask.status, status));
		}

		// 应用筛选条件
		if (conditions.length > 0) {
			query = query.where(conditions.length === 1 ? conditions[0] : 
				conditions.reduce((acc, condition) => acc && condition));
		}

		// 执行查询
		const tasks = await query.orderBy(desc(table.metaParseTask.createdAt));

		return json({
			success: true,
			data: tasks,
			total: tasks.length,
			filters: {
				userId: userId || null,
				status: status !== undefined ? status : null
			}
		});

	} catch (error) {
		console.error('筛选任务失败:', error);
		return json({ 
			success: false, 
			error: '筛选任务失败' 
		}, { status: 500 });
	}
};
