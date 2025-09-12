<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

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
	
	// 图片放大状态
	let showImageModal = false;
	let modalImageUrl = '';
	let modalPageNum = 0;

	// 选择页面
	const selectPage = (index: number) => {
		selectedPageIndex = index;
		editingTranslation = false;
		editedTranslationText = selectedPage?.translateText || '';
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
				alert(result.data.message || '保存成功');
			} else {
				alert(result.data?.message || '保存失败');
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
</script>

<svelte:head>
	<title>任务审核 - {data.task.fileName} - 立心翻译</title>
</svelte:head>

<div class="max-w-8xl mx-auto h-screen flex flex-col">
	<!-- 顶部导航 -->
	<div class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button
					type="button"
					on:click={() => goto('/tasks')}
					class="text-gray-500 hover:text-gray-700"
				>
					← 返回任务列表
				</button>
				<div class="text-lg font-semibold text-gray-900">
					任务审核 - {data.task.fileName}
				</div>
			</div>
			<div class="text-sm text-gray-500">
				{parseTypeMap[data.task.parseType]} | 共{data.task.pageNum}页 | 
				创建时间: {formatDate(data.task.createdAt)}
			</div>
		</div>
	</div>

	<!-- 消息显示 -->
	{#if form?.message}
		<div class="mx-6 mt-4 p-4 rounded-md {form.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
			{form.message}
		</div>
	{/if}

	<!-- 主要内容区域 -->
	<div class="flex-1 flex overflow-hidden">
		<!-- 左侧页面列表 -->
		<div class="w-80 bg-white border-r border-gray-200 overflow-y-auto">
			<div class="p-4">
				<h3 class="text-lg font-medium text-gray-900 mb-4">PDF页面</h3>
				<div class="space-y-3">
					{#each data.pages as page, index}
						<div
							class="border rounded-lg overflow-hidden cursor-pointer transition-all {selectedPageIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}"
							on:click={() => selectPage(index)}
							on:keydown={(e: KeyboardEvent) => e.key === 'Enter' && selectPage(index)}
							role="button"
							tabindex="0"
						>
							<!-- 页面缩略图 -->
							<div class="aspect-[3/4] bg-gray-100 flex items-center justify-center relative group">
								{#if page.imageUrl}
									<img
										src={page.imageUrl}
										alt="第{page.pageNum}页"
										class="max-w-full max-h-full object-contain"
										loading="lazy"
									/>
									<!-- 放大图标 -->
									<button
										type="button"
										on:click|stopPropagation={() => showImageZoom(page.imageUrl, page.pageNum)}
										class="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
										title="放大查看"
										aria-label="放大查看第{page.pageNum}页"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
										</svg>
									</button>
								{:else}
									<div class="text-gray-400">
										第{page.pageNum}页
									</div>
								{/if}
							</div>
							<!-- 页面信息 -->
							<div class="p-3 bg-gray-50">
								<div class="text-sm font-medium text-gray-900">
									第 {page.pageNum} 页
								</div>
								<div class="text-xs text-gray-500 mt-1">
									{#if page.ocrText}
										OCR: {page.ocrText.substring(0, 20)}...
									{:else}
										无OCR数据
									{/if}
								</div>
								{#if page.translateText}
									<div class="text-xs text-green-600 mt-1">
										已翻译
									</div>
								{:else if data.task.parseType === 'translate'}
									<div class="text-xs text-yellow-600 mt-1">
										待翻译
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 右侧详情面板 -->
		<div class="flex-1 flex flex-col overflow-hidden">
			{#if selectedPage}
				<!-- 页面标题 -->
				<div class="bg-white border-b border-gray-200 px-6 py-4">
					<h2 class="text-xl font-semibold text-gray-900">
						第 {selectedPage.pageNum} 页详情
					</h2>
				</div>

				<!-- 内容区域 - 左右两栏布局 -->
				<div class="flex-1 flex overflow-hidden">
					<!-- 左栏：OCR结果 -->
					<div class="flex-1 flex flex-col border-r border-gray-200">
						<div class="bg-gray-50 px-4 py-3 border-b border-gray-200 h-14 flex items-center">
							<h3 class="text-lg font-medium text-gray-900">OCR识别结果</h3>
						</div>
						<div class="flex-1 overflow-y-auto p-4">
							<div class="bg-white rounded-lg border border-gray-200 p-4 h-full">
								{#if selectedPage.ocrText}
									<pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed h-full overflow-y-auto">{selectedPage.ocrText}</pre>
								{:else}
									<div class="text-gray-400 italic flex items-center justify-center h-full">
										无OCR数据
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- 右栏：翻译结果 -->
					<div class="flex-1 flex flex-col">
						<div class="bg-gray-50 px-4 py-3 border-b border-gray-200 h-14 flex items-center justify-between">
							<h3 class="text-lg font-medium text-gray-900">
								{data.task.parseType === 'translate' ? '翻译结果' : '翻译区域'}
							</h3>
							{#if data.task.parseType === 'translate'}
								<div class="flex items-center space-x-2">
									{#if editingTranslation}
										<!-- 编辑模式的按钮 -->
										<button
											type="submit"
											form="translation-form"
											disabled={saving}
											class="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:bg-green-300 text-sm"
										>
											{saving ? '保存中...' : '保存翻译'}
										</button>
										<button
											type="button"
											on:click={cancelEdit}
											disabled={saving}
											class="bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-400 disabled:bg-gray-200 text-sm"
										>
											取消
										</button>
									{:else}
										<!-- 非编辑模式的按钮 -->
										<button
											type="button"
											on:click={startEditTranslation}
											class="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm"
										>
											编辑翻译
										</button>
									{/if}
								</div>
							{/if}
						</div>
						<div class="flex-1 overflow-y-auto p-4">
							{#if data.task.parseType === 'translate'}
								{#if editingTranslation}
									<!-- 编辑模式 -->
									<form 
										id="translation-form"
										method="POST" 
										action="?/saveTranslation" 
										use:enhance={saveTranslation}
										class="h-full"
									>
										<input type="hidden" name="pageNum" value={selectedPage.pageNum} />
										<textarea
											name="translationText"
											bind:value={editedTranslationText}
											placeholder="请输入翻译内容..."
											class="w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono leading-relaxed resize-none"
											required
										></textarea>
									</form>
								{:else}
									<!-- 展示模式 -->
									<div class="bg-white rounded-lg border border-gray-200 p-4 h-full">
										{#if selectedPage.translateText}
											<pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed h-full overflow-y-auto">{selectedPage.translateText}</pre>
										{:else}
											<div class="text-gray-400 italic flex items-center justify-center h-full">
												暂无翻译结果，点击"编辑翻译"添加翻译
											</div>
										{/if}
									</div>
								{/if}
							{:else}
								<!-- 仅OCR模式 -->
								<div class="bg-gray-100 rounded-lg border border-gray-200 p-4 h-full flex items-center justify-center">
									<div class="text-gray-500 italic text-center">
										<div class="text-lg mb-2">当前任务为仅识别模式</div>
										<div class="text-sm">不包含翻译功能</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<!-- 未选择页面 -->
				<div class="flex-1 flex items-center justify-center text-gray-500">
					<div class="text-center">
						<div class="text-lg mb-2">请选择左侧页面进行审核</div>
						<div class="text-sm">共 {data.pages.length} 页可供审核</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- 图片放大模态框 -->
{#if showImageModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
		on:click={closeImageModal}
		on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && closeImageModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="relative max-w-full max-h-full p-4">
			<!-- 关闭按钮 -->
			<button
				type="button"
				on:click={closeImageModal}
				class="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 z-10"
				title="关闭"
				aria-label="关闭图片放大视图"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
			
			<!-- 页面标题 -->
			<div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
				第 {modalPageNum} 页
			</div>
			
			<!-- 放大的图片 -->
			<button
				type="button"
				class="max-w-full max-h-full"
				on:click|stopPropagation
				aria-label="图片内容区域"
			>
				<img
					src={modalImageUrl}
					alt="第{modalPageNum}页放大图"
					class="max-w-full max-h-full object-contain rounded-lg"
				/>
			</button>
		</div>
	</div>
{/if}

<style>
	/* 确保滚动条样式 */
	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: #f1f1f1;
	}
	
	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background: #c1c1c1;
		border-radius: 3px;
	}
	
	:global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
		background: #a1a1a1;
	}
</style>
