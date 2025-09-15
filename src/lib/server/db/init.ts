import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import * as schema from './schema';

const DATABASE_NAME = 'lixin';

/**
 * 获取数据库配置（不包含数据库名）
 */
function getDatabaseConfig() {
    const baseUrl = process.env.DATABASE_URL || 'mysql://root:12345678@localhost:3306/lixin';
    const dbTimezone = process.env.DB_TIMEZONE || '+08:00';
    
    try {
        const url = new URL(baseUrl);
        // 构建包含所有必要参数的URL
        const params = new URLSearchParams({
            charset: 'utf8mb4',
            timezone: dbTimezone, // MySQL2驱动的正确时区参数
            multipleStatements: 'true'
        });
        
        const fullUrl = `${baseUrl}?${params.toString()}`;
        
        return {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username || 'root',
            password: url.password || '12345678',
            uri: fullUrl
        };
    } catch (error) {
        console.error('无效的 DATABASE_URL 格式:', baseUrl);
        // 默认配置
        const params = new URLSearchParams({
            charset: 'utf8mb4',
            timezone: dbTimezone,
            multipleStatements: 'true'
        });
        
        const fullUrl = `mysql://root:12345678@localhost:3306?${params.toString()}`;
        
        return {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '12345678',
            uri: fullUrl
        };
    }
}

/**
 * 检查数据库是否存在
 */
async function checkDatabaseExists(connection: mysql.Connection): Promise<boolean> {
    try {
        const [rows] = await connection.execute(
            'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
            [DATABASE_NAME]
        );
        return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
        console.error('检查数据库存在性失败:', error);
        return false;
    }
}

/**
 * 创建数据库
 */
async function createDatabase(connection: mysql.Connection): Promise<void> {
    try {
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ 数据库 '${DATABASE_NAME}' 创建成功`);
    } catch (error) {
        console.error('创建数据库失败:', error);
        throw error;
    }
}

/**
 * 检查表是否存在
 */
async function checkTablesExist(db: any): Promise<boolean> {
    try {
        // 检查核心表是否存在
        const [rows] = await db.execute(
            `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('user', 'session', 'meta_parse_task')`,
            [DATABASE_NAME]
        );
        
        const count = Array.isArray(rows) && rows.length > 0 ? rows[0].count : 0;
        return count >= 3; // 至少有3个核心表
    } catch (error) {
        console.error('检查表存在性失败:', error);
        return false;
    }
}

/**
 * 运行数据库迁移
 */
async function runMigrations(db: any): Promise<void> {
    try {
        console.log('🔄 开始运行数据库迁移...');
        // 如果迁移文件存在才运行迁移
        const fs = await import('fs');
        const path = await import('path');
        const migrationsPath = path.resolve('./drizzle');
        
        if (fs.existsSync(migrationsPath)) {
            await migrate(db, { migrationsFolder: './drizzle' });
            console.log('✅ 数据库迁移完成');
        } else {
            console.log('⚠️ 迁移文件夹不存在，跳过迁移');
            // 手动创建表结构
            await createTablesManually(db);
        }
    } catch (error) {
        console.error('数据库迁移失败，尝试手动创建表:', error);
        await createTablesManually(db);
    }
    
    // 检查并添加缺失的字段
    await addMissingColumns(db);
}

/**
 * 手动创建表结构
 */
async function createTablesManually(connection: any): Promise<void> {
    try {
        console.log('🔄 手动创建数据表...');
        
        // 创建用户表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(32) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'member',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) NOT NULL DEFAULT 0
            )
        `);
        
        // 创建session表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS session (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES user(id)
            )
        `);
        
        // 创建任务表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS meta_parse_task (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                parse_type VARCHAR(20) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                page_num INT NOT NULL,
                cur_page INT NOT NULL DEFAULT 0,
                status INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES user(id)
            )
        `);

        // 创建任务表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS meta_process_output (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                page_no INT NOT NULL,
                input_file_path VARCHAR(500) NOT NULL,
                ocr_txt_path VARCHAR(500),
                translate_txt_path VARCHAR(500),
                ocr_status INT NOT NULL DEFAULT 0,
                translate_status INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                UNIQUE KEY idx_task_id_page_no (task_id, page_no),
                FOREIGN KEY (task_id) REFERENCES meta_parse_task(id)
            )
        `);
        
        // 创建OCR输出表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS meta_ocr_output (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                page_no INT NOT NULL,
                input_file_path VARCHAR(500) NOT NULL,
                output_txt_path VARCHAR(500),
                status INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES meta_parse_task(id)
            )
        `);
        
        // 创建翻译输出表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS meta_translate_output (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                input_file_path VARCHAR(500) NOT NULL,
                output_txt_path VARCHAR(500),
                status INT NOT NULL DEFAULT 0, 
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (task_id) REFERENCES meta_parse_task(id)
            )
        `);

        // meta_prompt表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS meta_prompt (
                id INT AUTO_INCREMENT PRIMARY KEY,
                prompt1 TEXT NOT NULL,
                prompt2 TEXT NOT NULL,
                operator VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (operator) REFERENCES user(id)
            )
        `);
        
        console.log('✅ 数据表手动创建完成');
    } catch (error) {
        console.error('手动创建表失败:', error);
        throw error;
    }
}

/**
 * 检查并添加缺失的表字段
 */
async function addMissingColumns(connection: any): Promise<void> {
    try {
        console.log('🔄 检查并添加缺失的表字段...');

        // 检查user表的字段
        const userColumns = await connection.execute('SHOW COLUMNS FROM user');
        const userColumnNames = userColumns[0].map((col: any) => col.Field);
        
        if (!userColumnNames.includes('created_at')) {
            await connection.execute('ALTER TABLE user ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
            console.log('✅ 已添加 user.created_at 字段');
        }
        
        if (!userColumnNames.includes('updated_at')) {
            await connection.execute('ALTER TABLE user ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('✅ 已添加 user.updated_at 字段');
        }
        
        if (!userColumnNames.includes('is_deleted')) {
            await connection.execute('ALTER TABLE user ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
            console.log('✅ 已添加 user.is_deleted 字段');
        }

        // 检查meta_parse_task表的字段
        const taskColumns = await connection.execute('SHOW COLUMNS FROM meta_parse_task');
        const taskColumnNames = taskColumns[0].map((col: any) => col.Field);
        
        if (!taskColumnNames.includes('is_deleted')) {
            await connection.execute('ALTER TABLE meta_parse_task ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
            console.log('✅ 已添加 meta_parse_task.is_deleted 字段');
        }

        // 检查meta_ocr_output表的字段
        const ocrColumns = await connection.execute('SHOW COLUMNS FROM meta_ocr_output');
        const ocrColumnNames = ocrColumns[0].map((col: any) => col.Field);
        
        if (!ocrColumnNames.includes('is_deleted')) {
            await connection.execute('ALTER TABLE meta_ocr_output ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
            console.log('✅ 已添加 meta_ocr_output.is_deleted 字段');
        }

        // 检查meta_translate_output表的字段
        const translateColumns = await connection.execute('SHOW COLUMNS FROM meta_translate_output');
        const translateColumnNames = translateColumns[0].map((col: any) => col.Field);
        
        if (!translateColumnNames.includes('is_deleted')) {
            await connection.execute('ALTER TABLE meta_translate_output ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
            console.log('✅ 已添加 meta_translate_output.is_deleted 字段');
        }

        console.log('✅ 表字段检查和更新完成');
    } catch (error) {
        console.error('添加缺失字段失败:', error);
        throw error;
    }
}

/**
 * 创建默认管理员用户
 */
async function createDefaultAdmin(db: any): Promise<void> {
    try {
        const { hash } = await import('@node-rs/argon2');
        const { eq } = await import('drizzle-orm');
        
        // 检查是否已有管理员用户
        const existingAdmin = await db
            .select()
            .from(schema.user)
            .where(eq(schema.user.role, 'admin'))
            .limit(1);
        
        if (existingAdmin.length > 0) {
            console.log('✅ 管理员用户已存在');
            return;
        }
        
        // 创建默认管理员
        const adminId = crypto.randomUUID();
        const passwordHash = await hash('admin123', {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1
        });
        
        await db.insert(schema.user).values({
            id: adminId,
            username: 'admin',
            passwordHash: passwordHash,
            role: 'admin'
        });
        
        console.log('✅ 默认管理员创建成功');
        console.log('   用户名: admin');
        console.log('   密码: admin123');
        console.log('   🚨 请尽快登录并修改密码！');
    } catch (error) {
        console.error('创建默认管理员失败:', error);
        throw error;
    }
}

/**
 * 初始化数据库
 */
export async function initializeDatabase(): Promise<void> {
    console.log('🚀 开始初始化数据库...');
    
    const config = getDatabaseConfig();
    console.log(`📡 连接到数据库服务器: ${config.host}:${config.port}`);
    
    // 连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password
    });
    
    try {
        // 检查并创建数据库
        const dbExists = await checkDatabaseExists(connection);
        if (!dbExists) {
            console.log(`📋 数据库 '${DATABASE_NAME}' 不存在，正在创建...`);
            await createDatabase(connection);
        } else {
            console.log(`✅ 数据库 '${DATABASE_NAME}' 已存在`);
        }
        
        // 关闭初始连接
        await connection.end();
        
        // 连接到具体数据库，使用带时区的URL
        const dbConnection = await mysql.createConnection(config.uri);
        
        const db = drizzle(dbConnection, { schema, mode: 'default' });
        
        // 检查表是否存在
        const tablesExist = await checkTablesExist(dbConnection);
        if (!tablesExist) {
            console.log('📋 数据表不存在，正在创建...');
            await runMigrations(db);
        } else {
            console.log('✅ 数据表已存在');
        }
        
        // 创建默认管理员用户
        await createDefaultAdmin(db);
        
        // 关闭连接
        await dbConnection.end();
        
        console.log('🎉 数据库初始化完成！');
        
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        await connection.end();
        throw error;
    }
}

/**
 * 检查数据库连接
 */
export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        const config = getDatabaseConfig();
        const connection = await mysql.createConnection(config.uri);
        
        await connection.execute('SELECT 1');
        await connection.end();
        
        return true;
    } catch (error) {
        console.error('数据库连接检查失败:', error);
        return false;
    }
}
