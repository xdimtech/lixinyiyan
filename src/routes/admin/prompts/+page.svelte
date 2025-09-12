<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;
	export let form: ActionData;

	let submitting = false;
	let prompt1 = data.currentPrompts?.prompt1 || '';
	let prompt2 = data.currentPrompts?.prompt2 || '';

	// 默认提示词模板
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

	const handleSubmit = () => {
		submitting = true;
		return async ({ result }: any) => {
			submitting = false;
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	};

	const resetToDefault = () => {
		prompt1 = defaultPrompt1;
		prompt2 = defaultPrompt2;
	};

	const resetToCurrent = () => {
		prompt1 = data.currentPrompts?.prompt1 || '';
		prompt2 = data.currentPrompts?.prompt2 || '';
	};
</script>

<svelte:head>
	<title>提示词管理 - 立心译言</title>
</svelte:head>

<div class="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
	<div class="max-w-6xl mx-auto">
		<div class="mb-8">
			<h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">提示词管理</h1>
			<p class="text-gray-600">配置 OCR 识别和翻译功能的提示词模板</p>
		</div>

		{#if data.currentPrompts}
			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-6">
				<h2 class="text-lg font-semibold text-gray-800 mb-4">当前配置信息</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div>
						<span class="font-medium text-gray-600">最后更新者：</span>
						<span class="text-gray-800">{data.currentPrompts.operatorUsername}</span>
					</div>
					<div>
						<span class="font-medium text-gray-600">创建时间：</span>
						<span class="text-gray-800">{new Date(data.currentPrompts.createdAt).toLocaleString('zh-CN')}</span>
					</div>
					<div>
						<span class="font-medium text-gray-600">更新时间：</span>
						<span class="text-gray-800">{new Date(data.currentPrompts.updatedAt).toLocaleString('zh-CN')}</span>
					</div>
				</div>
			</div>
		{/if}

		<form method="POST" action="?/updatePrompts" use:enhance={handleSubmit}>
			<div class="space-y-6">
				<!-- OCR提示词 -->
				<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
					<div class="flex items-center justify-between mb-4">
						<label for="prompt1" class="block text-lg font-semibold text-gray-800">
							OCR 识别提示词
						</label>
						<span class="text-sm text-gray-500">
							{prompt1.length}/10000 字符
						</span>
					</div>
					<textarea
						id="prompt1"
						name="prompt1"
						bind:value={prompt1}
						rows="12"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm font-mono"
						placeholder="请输入 OCR 识别提示词..."
						maxlength="10000"
						required
					></textarea>
					<p class="mt-2 text-sm text-gray-600">
						此提示词将用于指导 AI 进行图片文字识别，影响 OCR 的准确性和输出格式。
					</p>
				</div>

				<!-- 翻译提示词 -->
				<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
					<div class="flex items-center justify-between mb-4">
						<label for="prompt2" class="block text-lg font-semibold text-gray-800">
							翻译提示词
						</label>
						<span class="text-sm text-gray-500">
							{prompt2.length}/10000 字符
						</span>
					</div>
					<textarea
						id="prompt2"
						name="prompt2"
						bind:value={prompt2}
						rows="12"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm font-mono"
						placeholder="请输入翻译提示词..."
						maxlength="10000"
						required
					></textarea>
					<p class="mt-2 text-sm text-gray-600">
						此提示词将用于指导 AI 进行文本翻译，影响翻译的质量和风格。
					</p>
				</div>

				<!-- 操作按钮 -->
				<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
					<div class="flex flex-wrap gap-4">
						<button
							type="submit"
							disabled={submitting}
							class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
						>
							{#if submitting}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								保存中...
							{:else}
								保存提示词
							{/if}
						</button>

						<button
							type="button"
							on:click={resetToCurrent}
							class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
						>
							重置为当前配置
						</button>

						<button
							type="button"
							on:click={resetToDefault}
							class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
						>
							使用默认模板
						</button>

						<a
							href="/admin"
							class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
						>
							返回管理页面
						</a>
					</div>
				</div>
			</div>
		</form>

		<!-- 消息显示 -->
		{#if form?.message}
			<div class="mt-6 p-4 rounded-lg {form.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
				<div class="flex items-center">
					{#if form.success}
						<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
						</svg>
					{:else}
						<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
					{/if}
					{form.message}
				</div>
			</div>
		{/if}
	</div>
</div>
