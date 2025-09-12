import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc, count, and, sql } from 'drizzle-orm';

interface FilterRequest {
	userId?: string;
	status?: number; // 可选：按状态筛选
	page?: number; // 页码，从1开始
	pageSize?: number; // 每页数量，默认10
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
		const { userId, status, page = 1, pageSize = 10 } = body;

		// 构建筛选条件
		const conditions = [];
		
		if (userId) {
			conditions.push(eq(table.metaParseTask.userId, userId));
		}
		
		if (status !== undefined) {
			conditions.push(eq(table.metaParseTask.status, status));
		}

		// 合并筛选条件
		const whereCondition = conditions.length > 0 
			? (conditions.length === 1 ? conditions[0] : and(...conditions))
			: undefined;

		// 计算总数
		const totalCountQuery = db
			.select({ count: count() })
			.from(table.metaParseTask)
			.innerJoin(table.user, eq(table.metaParseTask.userId, table.user.id));
		
		if (whereCondition) {
			totalCountQuery.where(whereCondition);
		}
		
		const [{ count: totalCount }] = await totalCountQuery;

		// 计算分页参数
		const offset = (page - 1) * pageSize;
		const totalPages = Math.ceil(totalCount / pageSize);

		// 构建数据查询
		let dataQuery = db
			.select({
				id: table.metaParseTask.id,
				userId: table.metaParseTask.userId,
				parseType: table.metaParseTask.parseType,
				fileName: table.metaParseTask.fileName,
				filePath: table.metaParseTask.filePath,
				pageNum: table.metaParseTask.pageNum,
				status: table.metaParseTask.status,
				createdAt: sql<string>`DATE_FORMAT(${table.metaParseTask.createdAt}, '%Y-%m-%d %H:%i:%s')`,
				updatedAt: sql<string>`DATE_FORMAT(${table.metaParseTask.updatedAt}, '%Y-%m-%d %H:%i:%s')`,
				username: table.user.username
			})
			.from(table.metaParseTask)
			.innerJoin(table.user, eq(table.metaParseTask.userId, table.user.id));

		// 应用筛选条件
		if (whereCondition) {
			dataQuery = dataQuery.where(whereCondition) as typeof dataQuery;
		}

		// 执行查询：按创建时间倒序，分页
		const tasks = await dataQuery
			.orderBy(desc(table.metaParseTask.createdAt))
			.limit(pageSize)
			.offset(offset);

		return json({
			success: true,
			data: tasks,
			pagination: {
				page,
				pageSize,
				total: totalCount,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1
			},
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
