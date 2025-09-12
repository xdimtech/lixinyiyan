import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import OpenAI from 'openai';

// 从PRD中的配置
const TRANSLATE_API_URL = "http://127.0.0.1:8003/v1";
const TRANSLATE_MODEL = "Qwen/Qwen3-14B-FP8";

const DEFAULT_SYSTEM_PROMPT = `# 角色
您是一位民国时期的翻译专家，擅长将英文文本翻译为民国时期的表达风格。

# 任务
输入英文文本内容，你需要用民国时期的中文表达进行翻译。你一定要一句一句仔细思考，结合历史背景推敲。

# 背景资料
中华民国的年份范围是从 1912 年 1 月 1 日中华民国成立开始，到 1949 年 10 月 1 日中华人民共和国成立为止， 1949 年 10 月 1 日开始就不是民国时期，按照新中国的普通话直接翻译。

在民国时期，日期表达会使用 “民国纪年”，同时星期的说法与现在一致。“上周日” 可表达为 “上星期日”，若结合具体年份，需将公元年份转换为民国纪年（民国纪年 = 公元年份 - 1911）。

# 技能

- 对于称呼使用"先生"、"女士"。
- 民国时期的表达风格是白话文，参考该时期胡适和鲁迅等人的写作风格。
- 遇到人名如果没有合适的翻译请保留，遇到政治词汇请结合历史背景推测。
-  原文翻译完毕后不要输出任何注释与背景补充，请把注释与背景补充放到你的思考过程中。

- **一定要用简体中文输出，不要用繁体字**`;


export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, { message: '请先登录' });
	}

	const body = await request.json();
	const { message, image, imageType, systemPrompt, chatHistory } = body;

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

	// 禁止添加历史对话
	// if (chatHistory && Array.isArray(chatHistory)) {
	// 	for (const item of chatHistory) {
	// 		if (item.user && item.assistant) {
	// 			// 构建用户消息，可能包含图片
	// 			let userMessage: any;
	// 			if (item.userImage && item.userImageType) {
	// 				// 用户消息包含图片
	// 				userMessage = {
	// 					role: "user",
	// 					content: [
	// 						{
	// 							type: "text",
	// 							text: item.user
	// 						},
	// 						{
	// 							type: "image_url",
	// 							image_url: {
	// 								url: `data:${item.userImageType};base64,${item.userImage}`
	// 							}
	// 						}
	// 					]
	// 				};
	// 			} else {
	// 				// 纯文本用户消息
	// 				userMessage = {
	// 					role: "user",
	// 					content: item.user
	// 				};
	// 			}
				
	// 			messages.push(userMessage);
	// 			messages.push({
	// 				role: "assistant",
	// 				content: item.assistant
	// 			});
	// 		}
	// 	}
	// }

	// 添加当前用户消息
	let currentUserMessage: any;
	if (image && imageType) {
		// 当前消息包含图片
		currentUserMessage = {
			role: "user",
			content: [
				{
					type: "text",
					text: message
				},
				{
					type: "image_url",
					image_url: {
						url: `data:${imageType};base64,${image}`,
						detail: "low"
					}
				}
			]
		};
	} else {
		// 纯文本消息
		currentUserMessage = {
			role: "user",
			content: message
		};
	}
	messages.push(currentUserMessage);

	console.log('messages', messages);

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
