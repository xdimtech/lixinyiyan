<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let form: ActionData;

	let selectedFile: File | null = null;
	let uploading = false;
	let parsing = false;
	let currentStep = 1; // 1: 上传, 2: 解析中, 3: 完成
	
	// 当前任务数据
	let taskData: {
		taskId: string;
		fileName: string;
		fileSize: number;
		storedFileName?: string;
		dateDir?: string;
		filePath?: string;
		fileType?: string;
		parsedContent?: string;
		backend?: string;
		version?: string;
	} | null = null;

	// 解析结果状态
	let parseResult: {
		content: string;
		backend?: string;
		version?: string;
	} | null = null;

	// 文件预览URL
	let filePreviewUrl: string | null = null;

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] || null;
		selectedFile = file;
		
		// 如果是图片文件，创建预览URL
		if (file && file.type.startsWith('image/')) {
			filePreviewUrl = URL.createObjectURL(file);
		} else {
			filePreviewUrl = null;
		}
	};

	const handleUpload = () => {
		uploading = true;
		return async ({ result }: any) => {
			uploading = false;
			if (result.type === 'success' && result.data?.success) {
				taskData = result.data;
				currentStep = 2;
				// 自动开始解析
				setTimeout(() => {
					const parseForm = document.getElementById('parseForm') as HTMLFormElement;
					if (parseForm) {
						parseForm.requestSubmit();
					}
				}, 100);
			}
		};
	};

	const handleParse = () => {
		if (!taskData?.filePath) return;
		
		parsing = true;
		return async ({ result }: any) => {
			parsing = false;
			if (result.type === 'success' && result.data?.success) {
				parseResult = {
					content: result.data.parsedContent || '',
					backend: result.data.backend,
					version: result.data.version
				};
				currentStep = 3;
			}
		};
	};

	const resetFlow = () => {
		// 重置文件相关状态
		selectedFile = null;
		taskData = null;
		parseResult = null;
		currentStep = 1;
		
		// 重置操作状态
		uploading = false;
		parsing = false;
		
		// 清理预览URL
		if (filePreviewUrl) {
			URL.revokeObjectURL(filePreviewUrl);
			filePreviewUrl = null;
		}
		
		// 清空文件输入框
		const fileInput = document.getElementById('file') as HTMLInputElement;
		if (fileInput) fileInput.value = '';
	};

	// 获取文件图标
	const getFileIcon = (fileType: string | undefined) => {
		if (!fileType) return '📄';
		
		if (fileType.includes('pdf')) return '📕';
		if (fileType.includes('word') || fileType.includes('document')) return '📘';
		if (fileType.includes('text')) return '📄';
		if (fileType.includes('image')) return '🖼️';
		return '📄';
	};

	// 格式化文件大小
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	// 复制解析结果到剪贴板
	const copyToClipboard = async () => {
		if (!parseResult?.content) return;
		
		try {
			await navigator.clipboard.writeText(parseResult.content);
			// 简单的反馈提示
			const button = document.getElementById('copyButton');
			if (button) {
				const originalText = button.textContent;
				button.textContent = '已复制!';
				setTimeout(() => {
					button.textContent = originalText;
				}, 2000);
			}
		} catch (error) {
			console.error('Copy failed:', error);
		}
	};

	// 下载解析结果为文件
	const downloadResult = () => {
		if (!parseResult?.content || !taskData?.fileName) return;
		
		const blob = new Blob([parseResult.content], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${taskData.fileName.replace(/\.[^/.]+$/, "")}_parsed.md`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
</script>

<svelte:head>
	<title>文件解析 - 立心译言</title>
</svelte:head>

<div class="h-full flex flex-col max-w-8xl mx-auto">
	<!-- 标题栏 -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-4">
		<h1 class="text-2xl font-bold text-gray-900 mb-4">文件解析</h1>
		
		<!-- 步骤指示器 -->
		<div class="flex items-center justify-center">
			<div class="flex items-center">
				<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}">
					1
				</div>
				<span class="ml-2 text-sm font-medium {currentStep >= 1 ? 'text-indigo-600' : 'text-gray-500'}">
					上传文件
				</span>
			</div>
			<div class="flex-1 h-1 mx-8 {currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}" style="max-width: 120px;"></div>
			<div class="flex items-center">
				<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}">
					2
				</div>
				<span class="ml-2 text-sm font-medium {currentStep >= 2 ? 'text-indigo-600' : 'text-gray-500'}">
					解析处理
				</span>
			</div>
			<div class="flex-1 h-1 mx-8 {currentStep >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}" style="max-width: 120px;"></div>
			<div class="flex items-center">
				<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}">
					3
				</div>
				<span class="ml-2 text-sm font-medium {currentStep >= 3 ? 'text-indigo-600' : 'text-gray-500'}">
					查看结果
				</span>
			</div>
		</div>
	</div>

	{#if currentStep === 1}
		<!-- 步骤1: 文件上传 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<form 
				method="POST" 
				action="?/upload" 
				enctype="multipart/form-data"
				use:enhance={handleUpload}
			>
				<div class="mb-6">
					<label for="file" class="block text-sm font-medium text-gray-700 mb-2">
						选择文件进行解析
					</label>
					<div class="relative">
						<input
							id="file"
							name="file"
							type="file"
							accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
							required
							on:change={handleFileChange}
							class="block w-full h-16 text-sm text-gray-500 bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-0 file:px-4 file:h-16 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={uploading}
						/>
						<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div class="text-center">
								<svg class="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
									<path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
								<p class="mt-1 text-sm text-gray-600">点击选择文件或拖拽到此处</p>
								<p class="text-xs text-gray-500">支持 PDF, DOC, DOCX, TXT, JPG, PNG, WEBP</p>
							</div>
						</div>
					</div>
					{#if selectedFile}
						<div class="mt-4 p-4 bg-gray-50 rounded-lg">
							<div class="flex items-center space-x-3">
								<span class="text-2xl">{getFileIcon(selectedFile.type)}</span>
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">{selectedFile.name}</p>
									<p class="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						disabled={!selectedFile || uploading}
						class="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center text-lg"
					>
						{#if uploading}
							<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							上传中...
						{:else}
							开始解析
						{/if}
					</button>
				</div>
			</form>

			<!-- 使用说明 -->
			<div class="mt-8 bg-gray-50 rounded-lg p-4">
				<h3 class="text-lg font-medium text-gray-900 mb-3">使用说明</h3>
				<ul class="text-sm text-gray-600 space-y-2">
					<li>• 支持多种文件格式：PDF、Word文档、纯文本、图片等</li>
					<li>• 文件大小限制：最大50MB</li>
					<li>• 解析过程可能需要几分钟，请耐心等待</li>
					<li>• <strong class="text-orange-600">注意：解析任务一旦开始就无法取消</strong></li>
					<li>• 系统会自动识别文档内容并转换为Markdown格式</li>
					<li>• 支持表格、公式、图像等复杂内容的解析</li>
				</ul>
			</div>
		</div>
	{:else if currentStep === 2}
		<!-- 步骤2: 解析中 -->
		<!-- 隐藏的解析表单 -->
		<form 
			id="parseForm"
			method="POST" 
			action="?/parse" 
			style="display: none;"
			use:enhance={handleParse}
		>
			<input type="hidden" name="filePath" value={taskData?.filePath || ''} />
			<input type="hidden" name="fileName" value={taskData?.fileName || ''} />
		</form>
		
		<div class="bg-white rounded-lg shadow-md p-6 flex-1 flex items-center justify-center">
			{#if parsing}
				<div class="text-center">
					<div class="mb-6">
						<svg class="animate-spin h-16 w-16 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					</div>
					<h3 class="text-xl font-medium text-gray-900 mb-2">正在解析文件...</h3>
					<p class="text-gray-600 mb-4">解析过程可能需要几分钟时间，请耐心等待。解析任务一旦开始就无法取消。</p>
					{#if taskData}
						<div class="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
							<div class="flex items-center space-x-3">
								<span class="text-2xl">{getFileIcon(taskData.fileType)}</span>
								<div class="text-left">
									<p class="text-sm font-medium text-gray-900">{taskData.fileName}</p>
									<p class="text-xs text-gray-600">{formatFileSize(taskData.fileSize)}</p>
								</div>
							</div>
						</div>
					{/if}
					
					<div class="mt-6">
						<p class="text-sm text-gray-500 max-w-md mx-auto">
							解析任务已开始，无法中途取消。请耐心等待解析完成，或关闭页面稍后查看结果。
						</p>
					</div>
				</div>
			{/if}
		</div>
	{:else if currentStep === 3}
		<!-- 步骤3: 展示结果 - 左右分栏布局 -->
		<div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
			<!-- 左栏：原文件预览 -->
			<div class="bg-white rounded-lg shadow-md p-6 flex flex-col">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-medium text-gray-900">原文件</h3>
					<button
						on:click={resetFlow}
						class="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
					>
						解析新文件
					</button>
				</div>
				
				{#if taskData}
					<div class="mb-4 p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center space-x-3">
							<span class="text-2xl">{getFileIcon(taskData.fileType)}</span>
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-900">{taskData.fileName}</p>
								<p class="text-xs text-gray-600">
									{formatFileSize(taskData.fileSize)} • 
									{taskData.fileType?.split('/')[1]?.toUpperCase() || 'Unknown'}
								</p>
							</div>
						</div>
					</div>
				{/if}
				
				<div class="flex-1 border border-gray-200 rounded-lg p-4 overflow-auto bg-gray-50">
					{#if filePreviewUrl && taskData?.fileType?.startsWith('image/')}
						<!-- 图片预览 -->
						<div class="text-center">
							<img 
								src={filePreviewUrl} 
								alt="文件预览" 
								class="max-w-full h-auto rounded-lg shadow-sm"
							/>
						</div>
					{:else if taskData?.fileType?.includes('pdf')}
						<!-- PDF文件提示 -->
						<div class="text-center py-12">
							<span class="text-6xl mb-4 block">📕</span>
							<p class="text-gray-600">PDF文件预览</p>
							<p class="text-sm text-gray-500 mt-2">完整内容请查看右侧解析结果</p>
						</div>
					{:else}
						<!-- 其他文件类型提示 -->
						<div class="text-center py-12">
							<span class="text-6xl mb-4 block">{getFileIcon(taskData?.fileType)}</span>
							<p class="text-gray-600">文件内容预览</p>
							<p class="text-sm text-gray-500 mt-2">完整内容请查看右侧解析结果</p>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- 右栏：解析结果 -->
			<div class="bg-white rounded-lg shadow-md p-6 flex flex-col">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-medium text-gray-900">解析结果</h3>
					<div class="flex space-x-2">
						<button
							id="copyButton"
							on:click={copyToClipboard}
							class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
							disabled={!parseResult?.content}
						>
							<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
								<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
							</svg>
							复制
						</button>
						<button
							on:click={downloadResult}
							class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center"
							disabled={!parseResult?.content}
						>
							<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
							下载
						</button>
					</div>
				</div>
				
				{#if parseResult?.backend || parseResult?.version}
					<div class="mb-3 text-xs text-gray-500">
						{#if parseResult.backend}解析引擎: {parseResult.backend}{/if}
						{#if parseResult.version} • 版本: {parseResult.version}{/if}
					</div>
				{/if}
				
				<div class="flex-1 border border-gray-200 rounded-lg p-4 overflow-auto bg-gray-50">
					{#if parseResult?.content}
						<div class="prose prose-sm max-w-none">
							<!-- 简单的Markdown预览，使用pre标签保持格式 -->
							<pre class="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{parseResult.content}</pre>
						</div>
					{:else}
						<div class="text-center py-12 text-gray-500">
							<svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
							</svg>
							<p>暂无解析结果</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- 错误消息显示 -->
	{#if form?.message}
		<div class="mt-4 p-4 rounded-md bg-red-50 text-red-800">
			<div class="flex items-start">
				<svg class="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
				</svg>
				<div>
					<h4 class="text-sm font-medium text-red-900 mb-1">操作失败</h4>
					<p class="text-sm text-red-700">{form.message}</p>
				</div>
			</div>
		</div>
	{/if}
</div>
