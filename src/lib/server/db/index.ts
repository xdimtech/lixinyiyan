import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { initializeDatabase } from './init';

// 如果没有设置 DATABASE_URL，使用默认配置
const DATABASE_URL = env.DATABASE_URL || 'mysql://root:123456@localhost:3306/lixin';

const client = mysql.createPool(DATABASE_URL);

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
