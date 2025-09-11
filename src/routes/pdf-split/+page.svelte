<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let form: ActionData;

	let selectedFile: File | null = null;
	let uploading = false;
	let splitting = false;
	let exporting = false;
	let currentStep = 1; // 1: 上传, 2: 显示图片, 3: 完成
	
	// 当前任务数据
	let taskData: {
		taskId: string;
		fileName: string;
		fileSize: number;
		images?: Array<{
			id: number;
			name: string;
			url: string;
			selected: boolean;
		}>;
	} | null = null;

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		selectedFile = target.files?.[0] || null;
	};

	const handleUpload = () => {
		uploading = true;
		return async ({ result }: any) => {
			uploading = false;
			if (result.type === 'success' && result.data?.success) {
				taskData = result.data;
				currentStep = 2;
				// 自动提交拆分表单
				setTimeout(() => {
					const splitForm = document.getElementById('splitForm') as HTMLFormElement;
					if (splitForm) {
						splitForm.requestSubmit();
					}
				}, 100);
			}
		};
	};

	const handleSplit = () => {
		if (!taskData?.taskId) return;
		
		splitting = true;
		return async ({ result }: any) => {
			splitting = false;
			if (result.type === 'success' && result.data?.success) {
				if (taskData) {
					taskData = { 
						...taskData, 
						images: result.data.images 
					};
				}
			}
		};
	};

	const togglePageSelection = (pageId: number) => {
		if (!taskData?.images) return;
		
		taskData.images = taskData.images.map(img => 
			img.id === pageId ? { ...img, selected: !img.selected } : img
		);
	};

	const selectAllPages = () => {
		if (!taskData?.images) return;
		
		taskData.images = taskData.images.map(img => ({ ...img, selected: true }));
	};

	const deselectAllPages = () => {
		if (!taskData?.images) return;
		
		taskData.images = taskData.images.map(img => ({ ...img, selected: false }));
	};

	let exportSuccess = false;
	let exportMessage = '';

	const handleExport = async () => {
		if (!taskData?.taskId || !taskData?.images) return;
		
		const selectedPages = taskData.images
			.filter(img => img.selected)
			.map(img => img.id);
			
		if (selectedPages.length === 0) {
			alert('请至少选择一页');
			return;
		}
		
		exporting = true;
		exportSuccess = false;
		exportMessage = '';
		
		try {
			const formData = new FormData();
			formData.append('taskId', taskData.taskId);
			formData.append('selectedPages', JSON.stringify(selectedPages));
			
			const response = await fetch('?/export', {
				method: 'POST',
				body: formData
			});
			
			const result = await response.json();
			if (result.type === 'success' && result.data?.success) {
				exportSuccess = true;
				exportMessage = `成功导出包含 ${selectedPages.length} 页的PDF文件`;
				
				// 直接触发下载
				if (result.data.downloadUrl) {
					// 创建下载链接
					const link = document.createElement('a');
					link.href = result.data.downloadUrl;
					link.download = `selected-pages-${taskData.taskId}.pdf`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
				}
			} else {
				exportMessage = result.data?.message || '导出失败，请重试';
			}
		} catch (error) {
			console.error('Export error:', error);
			exportMessage = '导出过程中出现错误，请重试';
		} finally {
			exporting = false;
		}
	};

	const resetFlow = () => {
		selectedFile = null;
		taskData = null;
		currentStep = 1;
		exportSuccess = false;
		exportMessage = '';
		const fileInput = document.getElementById('file') as HTMLInputElement;
		if (fileInput) fileInput.value = '';
	};

	$: selectedCount = taskData?.images?.filter(img => img.selected).length || 0;
</script>

<svelte:head>
	<title>PDF拆分 - 立心译言</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<div class="bg-white rounded-lg shadow-md p-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">PDF拆分</h1>
		
		<!-- 步骤指示器 -->
		<div class="mb-8">
			<div class="flex items-center justify-center">
				<div class="flex items-center">
					<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}">
						1
					</div>
					<span class="ml-2 text-sm font-medium {currentStep >= 1 ? 'text-indigo-600' : 'text-gray-500'}">
						上传PDF
					</span>
				</div>
				<div class="flex-1 h-1 mx-8 {currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}" style="max-width: 120px;"></div>
				<div class="flex items-center">
					<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}">
						2
					</div>
					<span class="ml-2 text-sm font-medium {currentStep >= 2 ? 'text-indigo-600' : 'text-gray-500'}">
						选择页面并导出
					</span>
				</div>
			</div>
		</div>

		{#if currentStep === 1}
			<!-- 步骤1: 文件上传 -->
			<form 
				method="POST" 
				action="?/upload" 
				enctype="multipart/form-data"
				use:enhance={handleUpload}
			>
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
							开始拆分
						{/if}
					</button>
				</div>
			</form>
		{:else if currentStep === 2}
			<!-- 步骤2: 页面选择 -->
			<!-- 隐藏的拆分表单 -->
			<form 
				id="splitForm"
				method="POST" 
				action="?/split" 
				style="display: none;"
				use:enhance={handleSplit}
			>
				<input type="hidden" name="taskId" value={taskData?.taskId || ''} />
			</form>
			
			<div class="space-y-6">
				{#if splitting}
					<div class="text-center py-8">
						<svg class="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<p class="text-gray-600">正在拆分PDF...</p>
					</div>
				{:else if taskData?.images}
					<!-- 文件信息 -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="text-lg font-medium text-gray-900 mb-2">文件信息</h3>
						<p class="text-sm text-gray-600">
							文件名: {taskData.fileName} | 
							文件大小: {(taskData.fileSize / 1024 / 1024).toFixed(2)} MB | 
							总页数: {taskData.images.length} | 
							已选择: {selectedCount} 页
						</p>
					</div>

					<!-- 批量操作 -->
					<div class="flex space-x-4">
						<button
							on:click={selectAllPages}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							全选
						</button>
						<button
							on:click={deselectAllPages}
							class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
						>
							全不选
						</button>
						<button
							on:click={handleExport}
							disabled={selectedCount === 0 || exporting}
							class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
						>
							{#if exporting}
								<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								导出中...
							{:else}
								确认导出 ({selectedCount}页)
							{/if}
						</button>
					</div>

					<!-- 图片网格 -->
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{#each taskData.images as image}
							<div class="relative">
								<div 
									class="border-2 rounded-lg p-2 cursor-pointer transition-colors {image.selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}"
									on:click={() => togglePageSelection(image.id)}
									role="button"
									tabindex="0"
									on:keydown={(e: KeyboardEvent) => e.key === 'Enter' && togglePageSelection(image.id)}
								>
									<!-- 图片预览 -->
									<div class="aspect-[3/4] bg-gray-200 rounded-md overflow-hidden">
										<img 
											src={image.url} 
											alt="第{image.id}页"
											class="w-full h-full object-cover"
											loading="lazy"
											on:error={() => {
												// 图片加载失败时显示占位符
												console.error('Failed to load image:', image.url);
											}}
										/>
									</div>
									
									<!-- 选中状态指示器 -->
									<div class="absolute top-1 right-1">
										<div class="w-6 h-6 rounded-full {image.selected ? 'bg-indigo-600' : 'bg-gray-300'} flex items-center justify-center">
											{#if image.selected}
												<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
												</svg>
											{/if}
										</div>
									</div>
								</div>
								
								<!-- 页码标签 -->
								<div class="text-center mt-2">
									<span class="text-sm text-gray-600">第 {image.id} 页</span>
								</div>
							</div>
						{/each}
					</div>

					<!-- 导出状态消息 -->
					{#if exportMessage}
						<div class="mt-6">
							{#if exportSuccess}
								<div class="bg-green-50 border border-green-200 rounded-lg p-4">
									<div class="flex items-start">
										<svg class="w-5 h-5 text-green-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
										<div class="flex-1">
											<h4 class="text-sm font-medium text-green-900 mb-1">导出成功</h4>
											<p class="text-sm text-green-700">{exportMessage}</p>
											<p class="text-xs text-green-600 mt-1">PDF文件已开始下载，请查看浏览器下载文件夹</p>
										</div>
										<button
											on:click={resetFlow}
											class="ml-4 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
										>
											处理新文件
										</button>
									</div>
								</div>
							{:else}
								<div class="bg-red-50 border border-red-200 rounded-lg p-4">
									<div class="flex items-start">
										<svg class="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
										<div>
											<h4 class="text-sm font-medium text-red-900 mb-1">导出失败</h4>
											<p class="text-sm text-red-700">{exportMessage}</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- 错误消息显示 -->
		{#if form?.message}
			<div class="mt-4 p-4 rounded-md bg-red-50 text-red-800">
				{form.message}
			</div>
		{/if}

		<!-- 调试信息 -->
		{#if false}
		<div class="mt-4 p-4 bg-gray-100 rounded-md text-sm">
			<strong>调试信息:</strong><br />
			Current Step: {currentStep}<br />
			Task Data: {JSON.stringify(taskData, null, 2)}<br />
			Splitting: {splitting}<br />
			Images Count: {taskData?.images?.length || 0}
		</div>
		{/if}

		<!-- 使用说明 -->
		{#if currentStep === 1}
			<div class="mt-8 bg-gray-50 rounded-lg p-4">
				<h3 class="text-lg font-medium text-gray-900 mb-3">使用说明</h3>
				<ul class="text-sm text-gray-600 space-y-2">
					<li>• 支持上传PDF格式文件，最大文件大小50MB</li>
					<li>• 系统会自动将PDF按页拆分为高质量图片预览</li>
					<li>• 默认选中所有页面，您可以点击图片取消选择不需要的页面</li>
					<li>• 导出的PDF只包含您选择的页面，保持原始质量和格式</li>
					<li>• 使用PDF-lib技术确保完整的页面提取和重组</li>
				</ul>
			</div>
		{/if}
	</div>
</div>
