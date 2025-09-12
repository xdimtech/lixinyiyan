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
		}
	}> = [];
	let systemPrompt = '';
	let currentMessage = '';
	let isLoading = false;
	let chatContainer: HTMLElement;

	// 默认系统提示词
	const defaultSystemPrompt = '您是一位智能助手，擅长回答各种问题并提供有用的信息。请用友好、专业的语气回复用户。';

	// 预设的系统提示词选项
	const presetPrompts = [
		{
			name: '默认助手',
			prompt: defaultSystemPrompt
		},
		{
			name: '民国翻译专家', 
			prompt: '您是一位民国时期的翻译专家，擅长将现代中文转换为民国时期的表达风格。翻译时请注意：对于称呼使用"先生"、"女士"；对于日期使用民国纪年；语言风格采用文言文与白话文的交叉使用。'
		},
		{
			name: '文档分析师',
			prompt: '您是一位专业的文档分析师，擅长分析各种文档内容，提供结构化的总结和见解。请用专业、客观的语气分析用户提供的内容。'
		}
	];

	// 处理表单提交结果 - 现在在handleSubmit中处理

	const scrollToBottom = async () => {
		await tick();
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	};

	const handleSubmit = () => {
		if (!currentMessage.trim()) return;
		isLoading = true;
		return async ({ result }: any) => {
			isLoading = false;
			console.log('Submit result:', result);
			
			if (result.type === 'success' && result.data?.success) {
				console.log('Success! Adding to chat history:', result.data);
				chatHistory = [...chatHistory, {
					user: result.data.userMessage,
					assistant: result.data.response,
					reasoningContent: result.data.reasoningContent,
					usage: result.data.usage
				}];
				currentMessage = '';
				scrollToBottom();
			} else {
				console.log('Submit not successful:', result);
			}
		};
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

<div class="max-w-8xl mx-auto h-full flex flex-col">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-900">智能对话</h1>
		<button
			type="button"
			on:click={clearChat}
			class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
		>
			清空对话
		</button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
		<!-- 系统提示词设置 -->
		<div class="lg:col-span-1">
			<div class="bg-white rounded-lg shadow-sm p-4 h-fit">
				<h3 class="text-lg font-medium text-gray-900 mb-4">系统提示词</h3>
				
				<!-- 预设选项 -->
				<div class="mb-4">
					<div class="block text-sm font-medium text-gray-700 mb-2">
						预设选项
					</div>
					<div class="space-y-2">
						{#each presetPrompts as preset}
							<button
								type="button"
								on:click={() => selectPresetPrompt(preset.prompt)}
								class="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
							>
								{preset.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- 自定义提示词 -->
				<div>
					<label for="system-prompt" class="block text-sm font-medium text-gray-700 mb-2">
						自定义提示词
					</label>
					<textarea
						id="system-prompt"
						bind:value={systemPrompt}
						placeholder={defaultSystemPrompt}
						rows="6"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
					></textarea>
				</div>
			</div>
		</div>

		<!-- 对话区域 -->
		<div class="lg:col-span-3 flex flex-col">
			<!-- 消息历史 -->
			<div 
				bind:this={chatContainer}
				class="flex-1 bg-white rounded-lg shadow-sm p-4 overflow-y-auto mb-4"
				style="min-height: 400px; max-height: 600px;"
			>
				{#if chatHistory.length === 0}
					<div class="text-center text-gray-500 mt-8">
						<div class="text-4xl mb-4">💬</div>
						<p>开始与AI助手对话吧！</p>
						<p class="text-sm mt-2">您可以询问任何问题，AI会根据设定的系统提示词来回复。</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each chatHistory as chat}
							<!-- 用户消息 -->
							<div class="flex justify-end">
								<div class="max-w-xs lg:max-w-md bg-indigo-600 text-white rounded-lg px-4 py-2">
									<div class="text-sm">{chat.user}</div>
								</div>
							</div>
							
							<!-- AI回复 -->
							<div class="flex justify-start">
								<div class="max-w-xs lg:max-w-2xl bg-gray-100 text-gray-900 rounded-lg px-4 py-2 space-y-3">
									<!-- 推理过程 -->
									{#if chat.reasoningContent}
										<div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
											<div class="flex items-center mb-2">
												<svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
												</svg>
												<span class="text-sm font-medium text-blue-800">思考过程</span>
											</div>
											<div class="text-sm text-blue-700 whitespace-pre-wrap font-mono bg-blue-25 p-2 rounded">
												{chat.reasoningContent}
											</div>
										</div>
									{/if}
									
									<!-- 主要回复 -->
									<div class="text-sm">
										{@html formatMessage(chat.assistant)}
									</div>
									
									<!-- Usage信息 -->
									{#if chat.usage}
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
				method="POST" 
				action="?/chat" 
				use:enhance={handleSubmit}
				class="bg-white rounded-lg shadow-sm p-4"
			>
				<input type="hidden" name="systemPrompt" value={systemPrompt} />
				<input type="hidden" name="chatHistory" value={JSON.stringify(chatHistory)} />
				
				<div class="flex space-x-4">
					<div class="flex-1">
						<textarea
							name="message"
							bind:value={currentMessage}
							placeholder="输入您的消息..."
							rows="3"
							disabled={isLoading}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 resize-none"
						></textarea>
					</div>
					<div class="flex flex-col justify-end">
						<button
							type="submit"
							disabled={!currentMessage.trim() || isLoading}
							class="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
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
