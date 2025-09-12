<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let form: ActionData;

	let selectedFile: File | null = null;
	let parseType = 'only_ocr';
	let uploading = false;

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		selectedFile = target.files?.[0] || null;
	};

	let successMessage = '';
	let taskId = '';

	const handleSubmit = () => {
		uploading = true;
		successMessage = '';
		taskId = '';
		return async ({ result }: any) => {
			uploading = false;
			if (result.type === 'success') {
				selectedFile = null;
				const fileInput = document.getElementById('file') as HTMLInputElement;
				if (fileInput) fileInput.value = '';
				
				// 处理成功响应
				if (result.data) {
					if (Array.isArray(result.data) && result.data.length >= 4) {
						successMessage = result.data[2];
						taskId = result.data[3];
					} else if (typeof result.data === 'object') {
						successMessage = result.data.message || '文件上传成功';
						taskId = result.data.taskId || '';
					}
				}
			}
		};
	};
</script>

<svelte:head>
	<title>文件上传 - 立心译言</title>
</svelte:head>

<div class="max-w-8xl mx-auto">
	<div class="bg-white rounded-lg shadow-md p-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">文件上传</h1>
		
		<form 
			method="POST" 
			action="?/upload" 
			enctype="multipart/form-data"
			use:enhance={handleSubmit}
		>
			<!-- 文件选择 -->
			<div class="mb-6">
				<label for="file" class="block text-sm font-medium text-gray-700 mb-2">
					选择PDF文件
				</label>
				<div class="relative">
					<input
						id="file"
						name="file"
						type="file"
						accept=".pdf"
						required
						on:change={handleFileChange}
						class="block w-full h-12 text-sm text-gray-500 bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-0 file:px-4 file:h-12 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={uploading}
					/>
				</div>
				{#if selectedFile}
					<p class="mt-2 text-sm text-gray-600">
						已选择: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
					</p>
				{/if}
			</div>

			<!-- 处理类型选择 -->
			<div class="mb-6">
				<fieldset>
					<legend class="block text-sm font-medium text-gray-700 mb-3">
						处理类型
					</legend>
				<div class="space-y-3">
					<label class="flex items-center">
						<input
							type="radio"
							name="parseType"
							value="only_ocr"
							bind:group={parseType}
							class="mr-3 text-indigo-600 focus:ring-indigo-500"
							disabled={uploading}
						/>
						<div>
							<div class="font-medium text-gray-900">仅识别文本</div>
							<div class="text-sm text-gray-600">
								只对PDF的每一页进行文字识别，生成TXT文件
							</div>
						</div>
					</label>
					
					<label class="flex items-center">
						<input
							type="radio"
							name="parseType"
							value="translate"
							bind:group={parseType}
							class="mr-3 text-indigo-600 focus:ring-indigo-500"
							disabled={uploading}
						/>
						<div>
							<div class="font-medium text-gray-900">识别并翻译</div>
							<div class="text-sm text-gray-600">
								先识别文字，然后翻译为民国时期的中文表达风格
							</div>
						</div>
					</label>
				</div>
				</fieldset>
			</div>

			<!-- 提交按钮 -->
			<div class="flex justify-end">
				<button
					type="submit"
					disabled={!selectedFile || uploading}
					class="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
				>
					{#if uploading}
						<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						上传中...
					{:else}
						提交任务
					{/if}
				</button>
			</div>
		</form>

		<!-- 成功消息显示 -->
		{#if successMessage}
			<div class="mt-4 p-4 rounded-md bg-green-50 text-green-800">
				{successMessage}
				{#if taskId}
					<br />任务ID: {taskId}
				{/if}
			</div>
		{/if}

		<!-- 错误消息显示 -->
		{#if form?.message && !successMessage}
			<div class="mt-4 p-4 rounded-md bg-red-50 text-red-800">
				{form.message}
			</div>
		{/if}

		<!-- 调试信息 -->
		{#if form}
			<div class="mt-4 p-4 bg-gray-100 rounded-md text-sm">
				<strong>调试信息:</strong><br />
				Form data: {JSON.stringify(form, null, 2)}<br />
				Success message: {successMessage}<br />
				Task ID: {taskId}
			</div>
		{/if}

		<!-- 使用说明 -->
		<div class="mt-8 bg-gray-50 rounded-lg p-4">
			<h3 class="text-lg font-medium text-gray-900 mb-3">使用说明</h3>
			<ul class="text-sm text-gray-600 space-y-2">
				<li>• 支持上传PDF格式文件，最大文件大小50MB</li>
				<li>• 仅识别文本：适用于需要提取PDF中文字内容的场景</li>
				<li>• 识别并翻译：适用于需要将内容转换为民国时期表达风格的场景</li>
				<li>• 提交后可在"任务列表"页面查看处理进度和下载结果</li>
			</ul>
		</div>
	</div>
</div>
