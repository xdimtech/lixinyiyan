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

<!-- 背景装饰 -->
<div class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 -z-10"></div>
<div class="absolute inset-0 opacity-30 -z-10" style="background-image: radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.3) 1px, transparent 0); background-size: 20px 20px;"></div>

<div class="max-w-7xl mx-auto relative">
	<!-- 上下布局 -->
	<div class="space-y-6 min-h-[calc(100vh-8rem)]">
		<!-- 上部：使用说明 -->
		<div class="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
			<div class="flex items-center mb-4">
				<div class="w-6 h-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center mr-2">
					<svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="text-xl font-bold text-gray-900">使用说明</h2>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="flex items-start space-x-3">
					<div class="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mt-1">
						<span class="text-blue-600 text-xs font-bold">1</span>
					</div>
					<div>
						<h4 class="font-bold text-gray-900 text-sm mb-1">选择PDF文件</h4>
						<p class="text-gray-600 text-xs">支持PDF格式，最大50MB，可拖拽上传</p>
					</div>
				</div>
				
				<div class="flex items-start space-x-3">
					<div class="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mt-1">
						<span class="text-green-600 text-xs font-bold">2</span>
					</div>
					<div>
						<h4 class="font-bold text-gray-900 text-sm mb-1">选择处理类型</h4>
						<p class="text-gray-600 text-xs">仅识别文本或识别并翻译为民国风格</p>
					</div>
				</div>
				
				<div class="flex items-start space-x-3">
					<div class="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mt-1">
						<span class="text-purple-600 text-xs font-bold">3</span>
					</div>
					<div>
						<h4 class="font-bold text-gray-900 text-sm mb-1">提交任务</h4>
						<p class="text-gray-600 text-xs">点击处理按钮，系统自动开始处理</p>
					</div>
				</div>
				
				<div class="flex items-start space-x-3">
					<div class="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mt-1">
						<span class="text-orange-600 text-xs font-bold">4</span>
					</div>
					<div>
						<h4 class="font-bold text-gray-900 text-sm mb-1">查看结果</h4>
						<p class="text-gray-600 text-xs">在任务列表页面查看进度和下载结果</p>
					</div>
				</div>
			</div>
		</div>

		<!-- 下部：上传配置 -->
		<div class="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative flex-1">
			<!-- 主体突出装饰 -->
			<div class="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
			<div class="relative bg-white rounded-3xl h-full">
			<div class="flex items-center mb-6">
				<div class="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3">
					<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-gray-900">上传配置</h2>
			</div>
		
		<form 
			method="POST" 
			action="?/upload" 
			enctype="multipart/form-data"
			use:enhance={handleSubmit}
			class="space-y-4 h-full flex flex-col"
		>
			<!-- 文件选择区域 -->
			<div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
				<div class="flex items-center mb-4">
					<div class="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-2">
						<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<label for="file" class="text-base font-bold text-gray-900">
						选择PDF文件
					</label>
				</div>
				
				<div class="relative group">
					<input
						id="file"
						name="file"
						type="file"
						accept=".pdf"
						required
						on:change={handleFileChange}
						class="block w-full h-12 text-sm text-gray-500 bg-white border-2 border-gray-300 border-dashed rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-0 file:px-4 file:h-12 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-50 file:to-blue-100 file:text-blue-700 hover:file:from-blue-100 hover:file:to-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={uploading}
					/>
					<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
						{#if !selectedFile}
							<div class="text-center">
								<svg class="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
								</svg>
								<p class="text-xs text-gray-500">拖拽文件或点击选择</p>
							</div>
						{/if}
					</div>
				</div>
				
				{#if selectedFile}
					<div class="mt-3 p-3 bg-white rounded-xl border border-green-200 shadow-sm">
						<div class="flex items-center">
							<div class="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mr-3">
								<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<div>
								<p class="font-medium text-gray-900 text-sm">{selectedFile.name}</p>
								<p class="text-xs text-gray-600">大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- 处理类型选择 -->
			<div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 flex-1">
				<div class="flex items-center mb-4">
					<div class="w-5 h-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
						<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<legend class="text-base font-bold text-gray-900">
						处理类型
					</legend>
				</div>
				
				<div class="space-y-3">
					<label class="group cursor-pointer">
						<div class="flex items-start p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200 group-hover:shadow-md">
							<input
								type="radio"
								name="parseType"
								value="only_ocr"
								bind:group={parseType}
								class="mt-1 mr-3 text-purple-600 focus:ring-purple-500 w-4 h-4"
								disabled={uploading}
							/>
							<div class="flex-1">
								<div class="flex items-center mb-1">
									<div class="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mr-2">
										<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</div>
									<div class="font-bold text-gray-900">仅识别文本</div>
								</div>
								<div class="text-gray-600 text-sm leading-relaxed">
									使用先进OCR技术，精确识别PDF中的文字内容
								</div>
							</div>
						</div>
					</label>
					
					<label class="group cursor-pointer">
						<div class="flex items-start p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200 group-hover:shadow-md">
							<input
								type="radio"
								name="parseType"
								value="translate"
								bind:group={parseType}
								class="mt-1 mr-3 text-purple-600 focus:ring-purple-500 w-4 h-4"
								disabled={uploading}
							/>
							<div class="flex-1">
								<div class="flex items-center mb-1">
									<div class="w-6 h-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center mr-2">
										<svg class="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
										</svg>
									</div>
									<div class="font-bold text-gray-900">识别并翻译</div>
								</div>
								<div class="text-gray-600 text-sm leading-relaxed">
									先识别文字，再转换为典雅的民国时期表达风格
								</div>
							</div>
						</div>
					</label>
				</div>
			</div>

			<!-- 提交按钮 -->
			<div class="flex justify-center mt-auto pt-2">
				<button
					type="submit"
					disabled={!selectedFile || uploading}
					class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
					style="color: white !important; text-decoration: none;"
				>
					{#if uploading}
						<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						处理中...
					{:else}
						<svg class="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						开始处理任务
					{/if}
				</button>
			</div>
		</form>

		<!-- 消息显示区域 -->
		{#if successMessage}
			<div class="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
				<div class="flex items-center">
					<div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
						<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h4 class="font-bold text-green-900">任务提交成功！</h4>
						<p class="text-green-800 text-sm">{successMessage}</p>
						{#if taskId}
							<p class="text-xs text-green-700 mt-1">任务ID: <code class="bg-green-100 px-2 py-1 rounded font-mono">{taskId}</code></p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		{#if form?.message && !successMessage}
			<div class="p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200">
				<div class="flex items-center">
					<div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
						<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h4 class="font-bold text-red-900">处理失败</h4>
						<p class="text-red-800 text-sm">{form.message}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- 调试信息 -->
		{#if form}
			<div class="p-3 bg-gray-100 rounded-lg text-xs">
				<strong>调试信息:</strong><br />
				Form data: {JSON.stringify(form, null, 2)}<br />
				Success message: {successMessage}<br />
				Task ID: {taskId}
			</div>
		{/if}
			</div>
		</div>
	</div>
</div>
