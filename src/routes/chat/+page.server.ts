import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import OpenAI from 'openai';

// 从PRD中的配置
const TRANSLATE_API_URL = "http://127.0.0.1:8003/v1";
const TRANSLATE_MODEL = "Qwen/Qwen3-14B-FP8";

const DEFAULT_SYSTEM_PROMPT = `您是一位智能助手，擅长回答各种问题并提供有用的信息。请用友好、专业的语气回复用户。`;

export const actions: Actions = {
	chat: async (event) => {
		if (!event.locals.user) {
			return fail(401, { message: '请先登录' });
		}

		const formData = await event.request.formData();
		const message = formData.get('message');
		const systemPrompt = formData.get('systemPrompt');
		const chatHistory = formData.get('chatHistory');

		if (!message || typeof message !== 'string') {
			return fail(400, { message: '请输入消息内容' });
		}

		try {
			const client = new OpenAI({
				apiKey: "EMPTY",
				baseURL: TRANSLATE_API_URL,
			});

			// 构建消息历史
			const messages: any[] = [];

			// 添加系统提示
			const currentSystemPrompt = (typeof systemPrompt === 'string' && systemPrompt.trim()) 
				? systemPrompt.trim() 
				: DEFAULT_SYSTEM_PROMPT;
			
			messages.push({
				role: "system",
				content: currentSystemPrompt
			});

			// 不使用历史对轮对话，每次都是单轮对话
			// if (chatHistory && typeof chatHistory === 'string') {
			// 	try {
			// 		const history = JSON.parse(chatHistory);
			// 		if (Array.isArray(history)) {
			// 			for (const item of history) {
			// 				if (item.user && item.assistant) {
			// 					messages.push({
			// 						role: "user",
			// 						content: item.user
			// 					});
			// 					messages.push({
			// 						role: "assistant",
			// 						content: item.assistant
			// 					});
			// 				}
			// 			}
			// 		}
			// 	} catch (e) {
			// 		console.error('解析聊天历史失败:', e);
			// 	}
			// }

			// 添加当前用户消息
			messages.push({
				role: "user",
				content: message
			});

			// 调用API
			const chatResponse = await (client.chat.completions.create as any)({
				model: TRANSLATE_MODEL,
				temperature: 0.7,
				top_p: 0.8,
				max_tokens: 4096,
				messages: messages,
				extra_body:{
					"top_k": 20, 
					"chat_template_kwargs": {"enable_thinking": true},
				},
				stream: false,
			});

			const resp_message = chatResponse.choices[0].message as any;
			const response = resp_message.content;
			// 思考推理
			const reasoningContent = resp_message?.reasoning_content;
			// 使用统计
			const usage = chatResponse.usage;
			
			return {
				success: true,
				reasoningContent: reasoningContent,
				response: response,
				userMessage: message,
				usage: usage
			};

		} catch (error) {
			console.error('Chat API调用失败:', error);
			return fail(500, {
				message: `对话失败: ${error instanceof Error ? error.message : '未知错误'}`
			});
		}
	}
};

