import { db } from './db';
import * as table from './db/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * 提示词配置接口
 */
export interface PromptConfig {
	id: number;
	prompt1: string; // OCR提示词
	prompt2: string; // 翻译提示词
	operator: string;
	operatorUsername?: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * 提示词配置 Provider
 * 负责管理提示词的内存缓存和数据库同步
 */
class PromptProvider {
	private static instance: PromptProvider;
	private currentConfig: PromptConfig | null = null;
	private isInitialized = false;

	private constructor() {}

	/**
	 * 获取单例实例
	 */
	public static getInstance(): PromptProvider {
		if (!PromptProvider.instance) {
			PromptProvider.instance = new PromptProvider();
		}
		return PromptProvider.instance;
	}

	/**
	 * 初始化提示词配置
	 * 从数据库加载最新的提示词配置到内存
	 */
	public async initialize(): Promise<void> {
		try {
			console.log('🔄 正在初始化提示词配置...');
			
			const prompts = await db
				.select({
					id: table.metaPrompt.id,
					prompt1: table.metaPrompt.prompt1,
					prompt2: table.metaPrompt.prompt2,
					operator: table.metaPrompt.operator,
					operatorUsername: table.user.username,
					createdAt: table.metaPrompt.createdAt,
					updatedAt: table.metaPrompt.updatedAt
				})
				.from(table.metaPrompt)
				.innerJoin(table.user, eq(table.metaPrompt.operator, table.user.id))
				.orderBy(desc(table.metaPrompt.updatedAt))
				.limit(1);

			if (prompts.length > 0) {
				this.currentConfig = prompts[0];
				console.log('✅ 提示词配置已加载到内存');
				console.log(`📝 OCR提示词长度: ${this.currentConfig.prompt1.length} 字符`);
				console.log(`🌍 翻译提示词长度: ${this.currentConfig.prompt2.length} 字符`);
				console.log(`👤 最后更新者: ${this.currentConfig.operatorUsername || 'Unknown'}`);
			} else {
				console.log('⚠️  数据库中暂无提示词配置，将使用默认配置');
				await this.createDefaultConfig();
			}

			this.isInitialized = true;
		} catch (error) {
			console.error('❌ 初始化提示词配置失败:', error);
			throw error;
		}
	}

	/**
	 * 创建默认配置
	 */
	private async createDefaultConfig(): Promise<void> {
		const defaultPrompt1 = `你是一个专业的OCR文字识别助手。请仔细分析图片中的所有文字内容，并按照以下要求进行识别：

1. 准确识别所有可见的文字，包括标题、正文、标注、图表文字等
2. 保持原有的段落结构和格式
3. 对于表格内容，请尽量保持表格结构
4. 如果有多列文字，请按照阅读顺序从左到右、从上到下识别
5. 对于不清晰的文字，请标注[模糊]
6. 对于无法识别的字符，请用[?]表示

请直接输出识别的文字内容，不要添加任何解释或说明。`;

		const defaultPrompt2 = `你是一个专业的翻译助手。请将以下文本翻译成中文，并遵循以下要求：

1. 保持原文的段落结构和格式
2. 准确传达原文的意思和语气
3. 使用地道的中文表达
4. 对于专业术语，请使用准确的中文对应词汇
5. 保持原文中的数字、日期、人名、地名等专有名词的准确性
6. 如果遇到无法确定含义的词汇，请保留原文并在后面用括号标注

请直接输出翻译结果，不要添加任何解释或说明。

待翻译文本：`;

		try {
			// 查找第一个管理员用户
			const adminUsers = await db
				.select({ id: table.user.id, username: table.user.username })
				.from(table.user)
				.where(eq(table.user.role, 'admin'))
				.limit(1);

			if (adminUsers.length === 0) {
				console.log('⚠️  未找到管理员用户，跳过创建默认配置');
				return;
			}

			const adminUser = adminUsers[0];

			// 创建默认配置
			const result = await db.insert(table.metaPrompt).values({
				prompt1: defaultPrompt1,
				prompt2: defaultPrompt2,
				operator: adminUser.id
			});

			// 重新查询创建的配置
			const newConfig = await db
				.select({
					id: table.metaPrompt.id,
					prompt1: table.metaPrompt.prompt1,
					prompt2: table.metaPrompt.prompt2,
					operator: table.metaPrompt.operator,
					operatorUsername: table.user.username,
					createdAt: table.metaPrompt.createdAt,
					updatedAt: table.metaPrompt.updatedAt
				})
				.from(table.metaPrompt)
				.innerJoin(table.user, eq(table.metaPrompt.operator, table.user.id))
				.where(eq(table.metaPrompt.id, result[0].insertId))
				.limit(1);

			if (newConfig.length > 0) {
				this.currentConfig = newConfig[0];
				console.log('✅ 已创建并加载默认提示词配置');
				console.log(`👤 创建者: ${adminUser.username}`);
			}
		} catch (error) {
			console.error('❌ 创建默认配置失败:', error);
		}
	}

	/**
	 * 获取当前提示词配置
	 */
	public getConfig(): PromptConfig | null {
		if (!this.isInitialized) {
			console.warn('⚠️  提示词配置尚未初始化，请先调用 initialize()');
		}
		return this.currentConfig;
	}

	/**
	 * 获取 OCR 提示词
	 */
	public getOcrPrompt(): string {
		const config = this.getConfig();
		return config?.prompt1 || '';
	}

	/**
	 * 获取翻译提示词
	 */
	public getTranslatePrompt(): string {
		const config = this.getConfig();
		return config?.prompt2 || '';
	}

	/**
	 * 更新提示词配置
	 * 同时更新数据库和内存缓存
	 */
	public async updateConfig(prompt1: string, prompt2: string, operatorId: string): Promise<PromptConfig> {
		try {
			console.log('🔄 正在更新提示词配置...');

			// 插入新的配置记录到数据库
			const result = await db.insert(table.metaPrompt).values({
				prompt1: prompt1.trim(),
				prompt2: prompt2.trim(),
				operator: operatorId
			});

			// 查询更新后的配置（包含用户名）
			const updatedConfig = await db
				.select({
					id: table.metaPrompt.id,
					prompt1: table.metaPrompt.prompt1,
					prompt2: table.metaPrompt.prompt2,
					operator: table.metaPrompt.operator,
					operatorUsername: table.user.username,
					createdAt: table.metaPrompt.createdAt,
					updatedAt: table.metaPrompt.updatedAt
				})
				.from(table.metaPrompt)
				.innerJoin(table.user, eq(table.metaPrompt.operator, table.user.id))
				.where(eq(table.metaPrompt.id, result[0].insertId))
				.limit(1);

			if (updatedConfig.length > 0) {
				// 更新内存缓存
				this.currentConfig = updatedConfig[0];
				console.log('✅ 提示词配置已更新');
				console.log(`👤 更新者: ${this.currentConfig.operatorUsername}`);
				console.log(`📝 OCR提示词长度: ${this.currentConfig.prompt1.length} 字符`);
				console.log(`🌍 翻译提示词长度: ${this.currentConfig.prompt2.length} 字符`);
				
				return this.currentConfig;
			} else {
				throw new Error('更新后无法查询到配置');
			}
		} catch (error) {
			console.error('❌ 更新提示词配置失败:', error);
			throw error;
		}
	}

	/**
	 * 重新加载配置（从数据库刷新内存缓存）
	 */
	public async reload(): Promise<void> {
		console.log('🔄 正在重新加载提示词配置...');
		this.isInitialized = false;
		await this.initialize();
	}

	/**
	 * 检查是否已初始化
	 */
	public isReady(): boolean {
		return this.isInitialized && this.currentConfig !== null;
	}

	/**
	 * 获取配置统计信息
	 */
	public getStats(): { hasConfig: boolean; ocrPromptLength: number; translatePromptLength: number; lastUpdated?: string; operator?: string } {
		const config = this.getConfig();
		return {
			hasConfig: config !== null,
			ocrPromptLength: config?.prompt1.length || 0,
			translatePromptLength: config?.prompt2.length || 0,
			lastUpdated: config?.updatedAt.toISOString(),
			operator: config?.operatorUsername
		};
	}
}

// 导出单例实例
export const promptProvider = PromptProvider.getInstance();
