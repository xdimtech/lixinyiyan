<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fade, slide, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let data: PageData;
	export let form: ActionData;

	// 状态映射
	const parseTypeMap: Record<string, string> = {
		'only_ocr': '仅识别文本',
		'translate': '识别并翻译'
	};

	// 当前选中的页面
	let selectedPageIndex = 0;
	$: selectedPage = data.pages[selectedPageIndex];

	// 翻译内容编辑状态
	let editingTranslation = false;
	let editedTranslationText = '';
	let saving = false;
	
	// 消息提示状态
	let showMessage = false;
	let messageText = '';
	let messageType: 'success' | 'error' = 'success';
	let messageTimeout: NodeJS.Timeout | null = null;
	
	// 图片放大状态
	let showImageModal = false;
	let modalImageUrl = '';
	let modalPageNum = 0;

	// 显示消息提示
	const showNotification = (text: string, type: 'success' | 'error' = 'success', duration = 3000) => {
		// 清除之前的定时器
		if (messageTimeout) {
			clearTimeout(messageTimeout);
		}
		
		messageText = text;
		messageType = type;
		showMessage = true;
		
		// 自动隐藏
		messageTimeout = setTimeout(() => {
			showMessage = false;
		}, duration);
	};
	
	// 手动关闭消息
	const closeMessage = () => {
		if (messageTimeout) {
			clearTimeout(messageTimeout);
		}
		showMessage = false;
	};
	
	// 选择页面
	const selectPage = (index: number) => {
		selectedPageIndex = index;
		editingTranslation = false;
		editedTranslationText = selectedPage?.translateText || '';
		// 切换页面时隐藏消息
		closeMessage();
	};

	// 开始编辑翻译
	const startEditTranslation = () => {
		editingTranslation = true;
		editedTranslationText = selectedPage?.translateText || '';
	};

	// 取消编辑
	const cancelEdit = () => {
		editingTranslation = false;
		editedTranslationText = '';
	};

	// 保存翻译
	const saveTranslation = () => {
		saving = true;
		return async ({ result }: any) => {
			saving = false;
			if (result.type === 'success' && result.data?.success) {
				// 更新页面数据
				if (selectedPage) {
					selectedPage.translateText = editedTranslationText;
				}
				editingTranslation = false;
				showNotification(result.data.message || '保存成功', 'success');
			} else {
				showNotification(result.data?.message || '保存失败', 'error');
			}
		};
	};

	// 格式化日期
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
	};

	// 初始化编辑文本
	$: if (selectedPage && !editingTranslation) {
		editedTranslationText = selectedPage.translateText || '';
	}
	
	// 显示图片放大模态框
	const showImageZoom = (imageUrl: string, pageNum: number) => {
		modalImageUrl = imageUrl;
		modalPageNum = pageNum;
		showImageModal = true;
	};
	
	// 关闭图片放大模态框
	const closeImageModal = () => {
		showImageModal = false;
		modalImageUrl = '';
		modalPageNum = 0;
	};
	
	// 组件销毁时清理定时器
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (messageTimeout) {
			clearTimeout(messageTimeout);
		}
	});
</script>

<svelte:head>
	<title>任务审核 - {data.task.fileName} - 立心翻译</title>
</svelte:head>

<div class="w-full h-[calc(100vh-8rem)] flex flex-col">
	<!-- 顶部导航 -->
	<div class="bg-white rounded-t-2xl shadow-sm border border-gray-200 px-6 py-5">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button
					type="button"
					on:click={() => goto('/tasks')}
					class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					返回任务列表
				</button>
				<div class="flex items-center space-x-3">
					<div class="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
						<svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h1 class="text-xl font-bold text-gray-900">任务审核</h1>
						<p class="text-sm text-gray-600 truncate max-w-md" title="{data.task.fileName}">
							{data.task.fileName}
						</p>
					</div>
				</div>
			</div>
			<div class="hidden lg:flex items-center space-x-6 text-sm">
				<div class="flex items-center space-x-2">
					<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						{parseTypeMap[data.task.parseType]}
					</span>
					<span class="text-gray-500">•</span>
					<span class="font-medium text-gray-700">共 {data.task.pageNum} 页</span>
				</div>
				<div class="text-gray-500">
					创建时间: <span class="font-medium">{formatDate(data.task.createdAt)}</span>
				</div>
			</div>
		</div>
		<!-- 移动端信息显示 -->
		<div class="lg:hidden mt-4 pt-4 border-t border-gray-100">
			<div class="flex flex-wrap items-center gap-3 text-sm">
				<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
					{parseTypeMap[data.task.parseType]}
				</span>
				<span class="text-gray-600">共 {data.task.pageNum} 页</span>
				<span class="text-gray-500 text-xs">
					{formatDate(data.task.createdAt)}
				</span>
			</div>
		</div>
	</div>

	<!-- 消息显示 -->
	{#if form?.message}
		<div class="mx-6 mt-4 p-4 rounded-xl shadow-sm border transition-all duration-300 {form.success ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200'}">
			<div class="flex items-center">
				<div class="w-5 h-5 rounded-full mr-3 flex items-center justify-center {form.success ? 'bg-green-100' : 'bg-red-100'}">
					{#if form.success}
						<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					{:else}
						<svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{/if}
				</div>
				<span class="font-medium">{form.message}</span>
			</div>
		</div>
	{/if}


	<!-- 主要内容区域 -->
	<div class="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50">
		<!-- 左侧页面列表 -->
		<div class="w-full lg:w-80 xl:w-96 bg-white border-r border-gray-200 overflow-y-auto lg:max-h-full">
			<div class="p-4 sm:p-6">
				<div class="flex items-center mb-4 sm:mb-6">
					<div class="w-6 h-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mr-3">
						<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-900">PDF页面</h3>
					<span class="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
						{data.pages.length}
					</span>
				</div>
				<div class="space-y-3">
					{#each data.pages as page, index}
						<div
							class="group border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md {selectedPageIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'}"
							on:click={() => selectPage(index)}
							on:keydown={(e: KeyboardEvent) => e.key === 'Enter' && selectPage(index)}
							role="button"
							tabindex="0"
						>
							<!-- 页面缩略图 -->
							<div class="aspect-[3/4] bg-gray-100 flex items-center justify-center relative overflow-hidden">
								{#if page.imageUrl}
									<img
										src={page.imageUrl}
										alt="第{page.pageNum}页"
										class="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
										loading="lazy"
									/>
									<!-- 放大图标 -->
									<button
										type="button"
										on:click|stopPropagation={() => showImageZoom(page.imageUrl, page.pageNum)}
										class="absolute top-2 right-2 bg-black bg-opacity-60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-opacity-80 hover:scale-110"
										title="放大查看"
										aria-label="放大查看第{page.pageNum}页"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
										</svg>
									</button>
								{:else}
									<div class="text-gray-400 text-sm flex flex-col items-center">
										<svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										第{page.pageNum}页
									</div>
								{/if}
							</div>
							<!-- 页面信息 -->
							<div class="p-3 {selectedPageIndex === index ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-gray-50 group-hover:bg-white'}">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-semibold text-gray-900">
										第 {page.pageNum} 页
									</span>
									{#if page.translateText}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
											<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											已翻译
										</span>
									{:else if data.task.parseType === 'translate'}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
											<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											待翻译
										</span>
									{/if}
								</div>
								<div class="text-xs text-gray-600">
									{#if page.ocrText}
										<span class="inline-flex items-center">
											<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
											OCR: {page.ocrText.substring(0, 20)}...
										</span>
									{:else}
										<span class="text-gray-400 italic">无OCR数据</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 右侧详情面板 -->
		<div class="flex-1 flex flex-col overflow-hidden lg:max-h-full">
			{#if selectedPage}
			<!-- 页面标题 -->
			<div class="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5" 
				 in:fade={{ duration: 300, easing: quintOut }}>
				<div class="flex items-center">
					<div class="w-8 h-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center mr-3">
						<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-gray-900">
							第 {selectedPage.pageNum} 页详情
						</h2>
						<p class="text-sm text-gray-600 mt-1">
							{#if selectedPage.ocrText}
								已识别 {selectedPage.ocrText.length} 个字符
							{:else}
								暂无识别内容
							{/if}
						</p>
					</div>
				</div>
			</div>

			<!-- 内容区域 - 左右两栏布局 -->
			<div class="flex-1 flex flex-col lg:flex-row overflow-hidden" 
				 in:slide={{ duration: 400, easing: quintOut, axis: 'x' }}>
				<!-- 左栏：OCR结果 -->
				<div class="w-full lg:w-1/2 flex flex-col border-r border-gray-200 lg:max-h-full bg-white">
					<div class="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between min-h-[4.5rem]">
						<div class="flex items-center">
							<div class="w-6 h-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mr-3">
								<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							</div>
							<h3 class="text-lg font-semibold text-gray-900">OCR识别结果</h3>
						</div>
						<!-- 空的右侧区域，用于保持布局一致性 -->
						<div class="flex items-center">
							<!-- 这里可以添加OCR相关的操作按钮（如果需要的话） -->
						</div>
					</div>
					<div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
						<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 h-full"
							 in:fade={{ duration: 350, delay: 100, easing: quintOut }}>
								{#if selectedPage.ocrText}
									<pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed h-full overflow-y-auto">{selectedPage.ocrText}</pre>
								{:else}
									<div class="text-gray-400 italic flex items-center justify-center h-full">
										<div class="text-center">
											<svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
											<p class="text-lg font-medium">无OCR数据</p>
											<p class="text-sm mt-1">该页面暂未进行文字识别</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

				<!-- 右栏：翻译结果 -->
				<div class="w-full lg:w-1/2 flex flex-col bg-white lg:max-h-full">
					<div class="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between min-h-[4.5rem]">
						<div class="flex items-center">
							<div class="w-6 h-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mr-3">
								<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
								</svg>
							</div>
							<h3 class="text-lg font-semibold text-gray-900">
								{data.task.parseType === 'translate' ? '翻译结果' : '翻译区域'}
							</h3>
						</div>
						{#if data.task.parseType === 'translate'}
							<div class="flex items-center space-x-2">
								{#if editingTranslation}
									<!-- 编辑模式的按钮 -->
									<button
										type="submit"
										form="translation-form"
										disabled={saving}
										class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-green-300 disabled:to-emerald-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
									>
										{#if saving}
											<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											保存中...
										{:else}
											<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											保存翻译
										{/if}
									</button>
									<button
										type="button"
										on:click={cancelEdit}
										disabled={saving}
										class="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-200"
									>
										<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
										取消
									</button>
								{:else}
									<!-- 非编辑模式的按钮 -->
									<button
										type="button"
										on:click={startEditTranslation}
										class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
									>
										<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
										编辑翻译
									</button>
								{/if}
							</div>
						{/if}
					</div>
					<div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
						<!-- 确保翻译区域始终有内容显示 -->
						<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 h-full"
								 in:fade={{ duration: 350, delay: 150, easing: quintOut }}>
								{#if data.task.parseType === 'translate'}
									{#if editingTranslation}
										<!-- 编辑模式 -->
										<form 
											id="translation-form"
											method="POST" 
											action="?/saveTranslation" 
											use:enhance={saveTranslation}
											class="h-full flex flex-col"
										>
											<input type="hidden" name="pageNum" value={selectedPage.pageNum} />
											<textarea
												name="translationText"
												bind:value={editedTranslationText}
												placeholder="请输入翻译内容..."
												class="flex-1 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono leading-relaxed resize-none transition-all duration-200"
												required
											></textarea>
										</form>
									{:else}
										<!-- 展示模式 -->
										{#if selectedPage.translateText && selectedPage.translateText.trim()}
											<pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed h-full overflow-y-auto">{selectedPage.translateText}</pre>
										{:else}
											<div class="text-gray-400 italic flex items-center justify-center h-full">
												{#if selectedPage.ocrText && selectedPage.ocrText.trim()}
													<div class="text-center">
														<div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
															<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
															</svg>
														</div>
														<h4 class="text-lg font-semibold text-gray-700 mb-2">待翻译内容</h4>
														<p class="text-sm text-gray-600 mb-3">OCR识别已完成，请点击"编辑翻译"添加翻译内容</p>
														<div class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
															<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
															</svg>
															识别到 {selectedPage.ocrText.length} 个字符
														</div>
													</div>
												{:else}
													<div class="text-center">
														<div class="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
															<svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
															</svg>
														</div>
														<h4 class="text-lg font-semibold text-gray-700 mb-2">无内容可翻译</h4>
														<p class="text-sm text-gray-600">OCR识别结果为空，无法进行翻译</p>
													</div>
												{/if}
											</div>
										{/if}
									{/if}
								{:else}
									<!-- 仅OCR模式 -->
									<div class="text-gray-500 italic flex items-center justify-center h-full">
										<div class="text-center">
											<div class="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
												<svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											</div>
											<h4 class="text-lg font-semibold text-gray-600 mb-2">当前任务为仅识别模式</h4>
											<p class="text-sm text-gray-500">不包含翻译功能</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- 未选择页面 -->
				<div class="flex-1 flex items-center justify-center text-gray-500 bg-white">
					<div class="text-center p-8">
						<div class="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
							<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-700 mb-3">请选择页面进行审核</h3>
						<p class="text-gray-500 mb-4">从左侧列表中选择一个页面开始审核工作</p>
						<div class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							共 {data.pages.length} 页可供审核
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- 图片放大模态框 -->
{#if showImageModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300"
		on:click={closeImageModal}
		on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && closeImageModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		in:fade={{ duration: 300 }}
	>
		<div class="relative max-w-6xl max-h-[95vh] w-full h-full flex items-center justify-center">
			<!-- 顶部工具栏 -->
			<div class="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
				<!-- 页面标题 -->
				<div class="flex items-center bg-white bg-opacity-90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full shadow-lg">
					<div class="w-5 h-5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mr-2">
						<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<span class="font-semibold text-sm">第 {modalPageNum} 页</span>
				</div>
				
				<!-- 关闭按钮 -->
				<button
					type="button"
					on:click={closeImageModal}
					class="bg-white bg-opacity-90 backdrop-blur-sm text-gray-700 p-3 rounded-full hover:bg-opacity-100 hover:text-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl"
					title="关闭"
					aria-label="关闭图片放大视图"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
			
			<!-- 放大的图片容器 -->
			<div
				class="w-full h-full flex items-center justify-center p-16"
				on:click|stopPropagation
				on:keydown={(e: KeyboardEvent) => e.key === 'Enter' && e.stopPropagation()}
				role="button"
				tabindex="0"
				aria-label="图片内容区域"
			>
				<img
					src={modalImageUrl}
					alt="第{modalPageNum}页放大图"
					class="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105"
					style="max-width: min(90vw, 1400px); max-height: min(80vh, 1000px);"
					in:fade={{ duration: 400, delay: 100 }}
				/>
			</div>
			
			<!-- 底部提示 -->
			<div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
				<div class="bg-white bg-opacity-90 backdrop-blur-sm text-gray-600 px-4 py-2 rounded-full shadow-lg text-sm">
					<span class="flex items-center">
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
						</svg>
						点击空白区域或按 ESC 键关闭
					</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Toast 消息提示 -->
{#if showMessage}
	<div 
		class="fixed top-4 right-4 z-50 max-w-sm w-full sm:w-auto sm:min-w-80"
		in:fly={{ x: 300, duration: 400, easing: quintOut }}
		out:fly={{ x: 300, duration: 200 }}
	>
		<div class="mx-4 sm:mx-0 p-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 {messageType === 'success' ? 'bg-white/95 text-green-800 border-green-200 shadow-green-100/50' : 'bg-white/95 text-red-800 border-red-200 shadow-red-100/50'}">
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<div class="w-6 h-6 rounded-full mr-3 flex items-center justify-center {messageType === 'success' ? 'bg-green-100' : 'bg-red-100'}">
						{#if messageType === 'success'}
							<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						{/if}
					</div>
					<span class="font-medium text-sm">{messageText}</span>
				</div>
				<button
					type="button"
					on:click={closeMessage}
					class="ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 hover:bg-gray-100 rounded-md"
					aria-label="关闭消息"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* 优化滚动条样式 */
	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 8px;
	}
	
	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: #f8fafc;
		border-radius: 4px;
	}
	
	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background: linear-gradient(180deg, #cbd5e1, #94a3b8);
		border-radius: 4px;
		border: 1px solid #e2e8f0;
	}
	
	:global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
		background: linear-gradient(180deg, #94a3b8, #64748b);
	}
	
	/* 添加一些额外的动画效果 */
	:global(.group:hover .group-hover\:scale-105) {
		transform: scale(1.05);
	}
	
	/* 确保按钮的渐变效果 */
	:global(.bg-gradient-to-r) {
		background-size: 200% 100%;
		transition: background-position 0.3s ease;
	}
	
	:global(.bg-gradient-to-r:hover) {
		background-position: right center;
	}
</style>
