import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import OpenAI from 'openai';

// 从PRD中的配置
const TRANSLATE_API_URL = "http://127.0.0.1:8003/v1";
const TRANSLATE_MODEL = "Qwen/Qwen3-14B-FP8";

const DEFAULT_SYSTEM_PROMPT = `您是一位智能助手，擅长回答各种问题并提供有用的信息。请用友好、专业的语气回复用户。`;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, { message: '请先登录' });
	}

	const body = await request.json();
	const { message, systemPrompt, chatHistory } = body;

	if (!message || typeof message !== 'string') {
		throw error(400, { message: '请输入消息内容' });
	}

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

	// 添加历史对话
	if (chatHistory && Array.isArray(chatHistory)) {
		for (const item of chatHistory) {
			if (item.user && item.assistant) {
				messages.push({
					role: "user",
					content: item.user
				});
				messages.push({
					role: "assistant",
					content: item.assistant
				});
			}
		}
	}

	// 添加当前用户消息
	messages.push({
		role: "user",
		content: message
	});

	try {
		// 创建一个ReadableStream来处理流式输出
		const stream = new ReadableStream({
			async start(controller) {
				try {
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
						stream: true,
					});

					let fullResponse = '';
					let reasoningContent = '';
					let usage = null;

					// 处理流式响应
					for await (const chunk of chatResponse) {
						if (chunk.choices && chunk.choices[0]) {
							const delta = chunk.choices[0].delta;
							
							// 处理推理内容
							if (delta?.reasoning_content) {
								reasoningContent += delta.reasoning_content;
								// 发送推理内容更新
								const data = JSON.stringify({
									type: 'reasoning',
									content: delta.reasoning_content,
									fullReasoning: reasoningContent
								}) + '\n';
								controller.enqueue(new TextEncoder().encode(data));
							}
							
							// 处理主要回复内容
							if (delta?.content) {
								fullResponse += delta.content;
								// 发送内容更新
								const data = JSON.stringify({
									type: 'content',
									content: delta.content,
									fullContent: fullResponse
								}) + '\n';
								controller.enqueue(new TextEncoder().encode(data));
							}
						}
						
						// 处理usage信息
						if (chunk.usage) {
							usage = chunk.usage;
						}
					}

					// 发送完成信号
					const finalData = JSON.stringify({
						type: 'complete',
						fullContent: fullResponse,
						fullReasoning: reasoningContent,
						usage: usage,
						userMessage: message
					}) + '\n';
					controller.enqueue(new TextEncoder().encode(finalData));
					
					controller.close();
				} catch (err) {
					console.error('流式聊天错误:', err);
					const errorData = JSON.stringify({
						type: 'error',
						message: err instanceof Error ? err.message : '未知错误'
					}) + '\n';
					controller.enqueue(new TextEncoder().encode(errorData));
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'application/x-ndjson',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			},
		});

	} catch (err) {
		console.error('Chat API调用失败:', err);
		throw error(500, {
			message: `对话失败: ${err instanceof Error ? err.message : '未知错误'}`
		});
	}
};
