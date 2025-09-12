import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { initializeDatabase } from './init';

// 构建数据库连接URL，包含时区和其他配置
const baseUrl = env.DATABASE_URL || 'mysql://root:123456@localhost:3306/lixin';
const dbTimezone = env.DB_TIMEZONE || '+08:00';

// 如果URL已经包含参数，追加；否则添加参数
const separator = baseUrl.includes('?') ? '&' : '?';
const params = new URLSearchParams({
    charset: 'utf8mb4',
    timezone: dbTimezone, // MySQL2驱动的正确时区参数
    multipleStatements: 'true'
});

const DATABASE_URL = `${baseUrl}${separator}${params.toString()}`;

const client = mysql.createPool({
    uri: DATABASE_URL,
    dateStrings: true // 返回字符串，避免时区转换问题
});

export const db = drizzle(client, { schema, mode: 'default' });

// 在模块加载时初始化数据库
let initPromise: Promise<void> | null = null;

export async function ensureDatabaseReady(): Promise<void> {
    if (!initPromise) {
        initPromise = initializeDatabase().catch(error => {
            console.error('数据库初始化失败，使用默认配置继续运行:', error);
            // 重置 promise 以便下次重试
            initPromise = null;
        });
    }
    return initPromise;
}
