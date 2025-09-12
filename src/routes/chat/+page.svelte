<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	export let form: ActionData;

	let chatHistory: Array<{
		user: string, 
		assistant: string,
		reasoningContent?: string,
		usage?: {
			prompt_tokens: number,
			completion_tokens: number,
			total_tokens: number
		},
		isLoading?: boolean,
		isStreaming?: boolean
	}> = [];
	let systemPrompt = '';
	let currentMessage = '';
	let isLoading = false;
	let chatContainer: HTMLElement;

	// 默认系统提示词
	const defaultSystemPrompt = `您是一位民国时期的翻译专家，擅长将现代中文转换为民国时期的表达风格。翻译时请注意：对于称呼使用"先生"、"女士"。对于日期使用民国纪年。语言风格采用文言文与白话文的交叉使用。遇到人名如果没有合适的翻译请保留
	原文翻译完毕后不要输出任何注释与背景补充，请把注释与背景补充放到你的思考过程中。`;
	// 预设的系统提示词选项
	const presetPrompts = [
		{
			name: '民国翻译专家', 
			prompt: defaultSystemPrompt
		},
		{
			name: '对话助手',
			prompt: '您是一位智能助手，擅长回答各种问题并提供有用的信息。请用友好、专业的语气回复用户。'
		},
	];

	// 处理表单提交结果 - 现在在handleSubmit中处理

	const scrollToBottom = async () => {
		await tick();
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	};

	// 流式聊天函数
	const handleStreamChat = async () => {
		if (!currentMessage.trim()) return;
		
		// 立即显示用户消息
		const userMessage = currentMessage.trim();
		const newChatIndex = chatHistory.length;
		
		chatHistory = [...chatHistory, {
			user: userMessage,
			assistant: '',
			reasoningContent: '',
			isLoading: true,
			isStreaming: true
		}];
		currentMessage = '';
		scrollToBottom();
		
		isLoading = true;
		
		try {
			const response = await fetch('/api/chat-stream', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: userMessage,
					systemPrompt: systemPrompt,
					chatHistory: chatHistory.slice(0, -1) // 不包含当前正在处理的消息
				})
			});

			if (!response.ok) {
				throw new Error('网络请求失败');
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('无法读取响应流');
			}

			const decoder = new TextDecoder();
			
			while (true) {
				const { done, value } = await reader.read();
				
				if (done) break;
				
				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());
				
				for (const line of lines) {
					try {
						const data = JSON.parse(line);
						
						// 更新对应的聊天记录
						chatHistory = chatHistory.map((chat, index) => {
							if (index === newChatIndex) {
								if (data.type === 'reasoning') {
									return {
										...chat,
										reasoningContent: data.fullReasoning
									};
								} else if (data.type === 'content') {
									return {
										...chat,
										assistant: data.fullContent
									};
								} else if (data.type === 'complete') {
									return {
										...chat,
										assistant: data.fullContent,
										reasoningContent: data.fullReasoning,
										usage: data.usage,
										isLoading: false,
										isStreaming: false
									};
								} else if (data.type === 'error') {
									return {
										...chat,
										assistant: `错误: ${data.message}`,
										isLoading: false,
										isStreaming: false
									};
								}
							}
							return chat;
						});
						
						// 实时滚动到底部
						scrollToBottom();
					} catch (e) {
						console.error('解析流数据失败:', e);
					}
				}
			}
		} catch (error) {
			console.error('流式聊天失败:', error);
			// 更新错误状态
			chatHistory = chatHistory.map((chat, index) => {
				if (index === newChatIndex) {
					return {
						...chat,
						assistant: '抱歉，发生了错误。请重试。',
						isLoading: false,
						isStreaming: false
					};
				}
				return chat;
			});
		} finally {
			isLoading = false;
		}
	};


	const clearChat = () => {
		chatHistory = [];
		currentMessage = '';
	};

	const selectPresetPrompt = (prompt: string) => {
		systemPrompt = prompt;
	};

	const formatMessage = (text: string) => {
		// 简单的格式化：将换行符转换为<br>，保持代码块等格式
		return text
			.replace(/\n/g, '<br>')
			.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded"><code>$1</code></pre>');
	};
</script>

<svelte:head>
	<title>智能对话 - 立心译言</title>
</svelte:head>

<div class="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden p-4">
		<!-- 系统提示词设置 -->
		<div class="lg:col-span-1">
			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 flex flex-col h-full">
				<h3 class="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">系统提示词</h3>
				
				<!-- 预设选项 -->
				<div class="mb-6">
					<div class="block text-sm font-semibold text-gray-800 mb-3">
						预设选项
					</div>
					<div class="space-y-3">
						{#each presetPrompts as preset}
							<button
								type="button"
								on:click={() => selectPresetPrompt(preset.prompt)}
								class="w-full text-left px-4 py-3 text-sm bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all duration-200 hover:shadow-md"
							>
								{preset.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- 自定义提示词 -->
				<div class="flex-1 flex flex-col">
					<label for="system-prompt" class="block text-sm font-semibold text-gray-800 mb-3">
						自定义提示词
					</label>
					<textarea
						id="system-prompt"
						bind:value={systemPrompt}
						placeholder={defaultSystemPrompt}
						class="flex-1 w-full px-4 py-3 border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none bg-white/70 backdrop-blur-sm transition-all duration-200"
					></textarea>
				</div>
			</div>
		</div>

		<!-- 对话区域 -->
		<div class="lg:col-span-3 flex flex-col relative h-full">
			<!-- 消息历史 -->
			<div 
				bind:this={chatContainer}
				class="flex-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 overflow-y-auto mb-38"
			>
				{#if chatHistory.length === 0}
					<div class="text-center text-gray-600 mt-16">
						<div class="text-6xl mb-6 filter drop-shadow-lg">💬</div>
						<h2 class="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">开始与AI助手对话吧！</h2>
						<p class="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">您可以询问任何问题，AI会根据设定的系统提示词来回复。</p>
					</div>
				{:else}
					<div class="space-y-6">
						{#each chatHistory as chat}
							<!-- 用户消息 -->
							<div class="flex justify-end">
								<div class="max-w-xs lg:max-w-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 rounded-2xl rounded-br-md px-5 py-3 shadow-lg">
									<div class="text-sm font-medium">{chat.user}</div>
								</div>
							</div>
							
							<!-- AI回复 -->
							<div class="flex justify-start">
								<div class="max-w-xs lg:max-w-2xl bg-white/90 backdrop-blur-sm text-gray-900 rounded-2xl rounded-bl-md px-5 py-4 space-y-3 shadow-lg border border-gray-200/50">
									{#if chat.isLoading && !chat.isStreaming}
										<!-- Loading状态 -->
										<div class="flex items-center space-x-2">
											<svg class="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											<span class="text-sm text-gray-500">AI正在思考中...</span>
										</div>
									{:else if chat.isStreaming}
										<!-- 流式输出状态 -->
										<div class="flex items-center space-x-2">
											<div class="flex space-x-1">
												<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
												<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
												<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
											</div>
											<span class="text-sm text-blue-600">正在生成回复...</span>
										</div>
									{/if}
									
									<!-- 推理过程 (流式输出时也显示) -->
									{#if chat.reasoningContent}
										<div class="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-lg shadow-sm">
											<div class="flex items-center mb-3">
												<svg class="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
												</svg>
												<span class="text-sm font-semibold text-amber-800">思考过程</span>
												{#if chat.isStreaming}
													<span class="ml-2 text-xs text-amber-600 animate-pulse bg-amber-100 px-2 py-1 rounded-full">实时生成中...</span>
												{/if}
											</div>
											<div class="text-sm text-amber-800 whitespace-pre-wrap font-mono bg-white/70 backdrop-blur-sm p-3 rounded-lg border border-amber-200">
												{chat.reasoningContent}
												{#if chat.isStreaming}
													<span class="inline-block w-2 h-4 bg-amber-600 animate-pulse ml-1">|</span>
												{/if}
											</div>
										</div>
									{/if}
									
									<!-- 主要回复 (流式输出时也显示) -->
									{#if chat.assistant}
										<div class="text-sm">
											{@html formatMessage(chat.assistant)}
											{#if chat.isStreaming}
												<span class="inline-block w-2 h-4 bg-gray-600 animate-pulse ml-1">|</span>
											{/if}
										</div>
									{/if}
									
									<!-- Usage信息 (完成后显示) -->
									{#if chat.usage && !chat.isStreaming}
										<div class="bg-gray-50 border border-gray-200 p-2 rounded text-xs text-gray-600">
											<div class="flex items-center mb-1">
												<svg class="w-3 h-3 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
												</svg>
												<span class="font-medium">Token使用统计</span>
											</div>
											<div class="flex space-x-4 text-xs">
												<span>输入: {chat.usage.prompt_tokens}</span>
												<span>输出: {chat.usage.completion_tokens}</span>
												<span>总计: {chat.usage.total_tokens}</span>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- 输入区域 -->
			<form 
				on:submit|preventDefault={handleStreamChat}
				class="absolute bottom-4 left-0 right-0 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/30 p-6"
			>
				<div class="flex space-x-5">
					<div class="flex-1">
						<textarea
							name="message"
							bind:value={currentMessage}
							placeholder="输入您的消息..."
							rows="3"
							disabled={isLoading}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white/80 backdrop-blur-sm transition-all duration-200 text-gray-800 placeholder-gray-400"
						></textarea>
					</div>
					<div class="flex flex-col justify-end space-y-3">
						<button
							type="button"
							on:click={clearChat}
							class="bg-gradient-to-r from-slate-500 to-slate-600 text-white px-6 py-3 rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 min-w-[120px] flex items-center justify-center"
						>
							清空对话
						</button>
						<button
							type="submit"
							disabled={!currentMessage.trim() || isLoading}
							class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 min-w-[120px]"
						>
							{#if isLoading}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								发送中...
							{:else}
								发送
							{/if}
						</button>
					</div>
				</div>
			</form>

			<!-- 错误消息 -->
			{#if form?.message && !form?.success}
				<div class="mt-4 p-4 bg-red-50 text-red-800 rounded-md">
					{form.message}
				</div>
			{/if}
		</div>
	</div>
</div>
