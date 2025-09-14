<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data: PageData;
	export let form: ActionData;

	let cleaningDirectory: string | null = null;
	let cleaningDateRange: string | null = null;
	
	// 日期过滤器状态
	let startDateFilter = data.startDate || '';
	let endDateFilter = data.endDate || '';
	let showDateFilters = false;

	const handleCleanDirectory = (path: string, name: string) => {
		cleaningDirectory = path;
		return async ({ result, update }: any) => {
			cleaningDirectory = null;
			// 确保更新页面状态以显示form结果和重新加载数据
			await update();
		};
	};

	const handleCleanDateRange = (basePath: string, name: string) => {
		cleaningDateRange = basePath;
		return async ({ result, update }: any) => {
			cleaningDateRange = null;
			await update();
		};
	};

	// 应用日期过滤器
	const applyDateFilter = () => {
		const params = new URLSearchParams();
		if (startDateFilter) params.set('startDate', startDateFilter);
		if (endDateFilter) params.set('endDate', endDateFilter);
		goto(`?${params.toString()}`);
	};

	// 清除日期过滤器
	const clearDateFilter = () => {
		startDateFilter = '';
		endDateFilter = '';
		goto('/admin/capacity');
	};

	// 计算总容量百分比
	function calculatePercentage(size: number): number {
		if (data.totalSize === 0) return 0;
		return (size / data.totalSize) * 100;
	}

	// 获取容量等级的颜色
	function getSizeColor(percentage: number): string {
		if (percentage >= 50) return 'text-red-600';
		if (percentage >= 25) return 'text-yellow-600';
		return 'text-green-600';
	}

	// 获取进度条颜色
	function getProgressColor(percentage: number): string {
		if (percentage >= 50) return 'bg-red-500';
		if (percentage >= 25) return 'bg-yellow-500';
		return 'bg-green-500';
	}
</script>

<svelte:head>
	<title>容量管理 - 立心译言</title>
</svelte:head>

<div class="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
	<div class="max-w-6xl mx-auto">
		<!-- 页面头部 -->
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<a href="/admin" class="text-indigo-600 hover:text-indigo-800 mr-2" aria-label="返回管理页面">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
					</svg>
				</a>
				<h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">容量管理</h1>
			</div>
			<p class="text-gray-600">监控和管理系统存储空间占用</p>
		</div>

		<!-- 日期过滤器 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-8">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">日期过滤器</h2>
				<button
					on:click={() => showDateFilters = !showDateFilters}
					class="text-indigo-600 hover:text-indigo-800 flex items-center"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
					</svg>
					{showDateFilters ? '隐藏过滤器' : '显示过滤器'}
				</button>
			</div>
			
			{#if showDateFilters}
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
					<div>
						<label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
						<input
							type="date"
							id="startDate"
							bind:value={startDateFilter}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>
					<div>
						<label for="endDate" class="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
						<input
							type="date"
							id="endDate"
							bind:value={endDateFilter}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>
					<div class="flex space-x-2">
						<button
							on:click={applyDateFilter}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 flex items-center"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"></path>
							</svg>
							应用过滤
						</button>
						<button
							on:click={clearDateFilter}
							class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 flex items-center"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
							清除过滤
						</button>
					</div>
				</div>
				
				{#if data.startDate || data.endDate}
					<div class="mt-4 p-3 bg-blue-50 rounded-lg">
						<div class="flex items-center">
							<svg class="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
							</svg>
							<span class="text-blue-800">
								当前过滤: {data.startDate || '最早'} 到 {data.endDate || '最新'}
							</span>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- 总容量统计 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-8">
			<h2 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">存储总览</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="text-center">
					<div class="text-3xl font-bold text-gray-900">{data.totalSizeFormatted}</div>
					<div class="text-sm text-gray-600">总占用空间</div>
				</div>
				<div class="text-center">
					<div class="text-3xl font-bold text-indigo-600">{data.totalFiles}</div>
					<div class="text-sm text-gray-600">文件总数</div>
				</div>
				<div class="text-center">
					<div class="text-3xl font-bold text-purple-600">{data.directories.filter(d => d.exists).length}</div>
					<div class="text-sm text-gray-600">活跃目录</div>
				</div>
			</div>
		</div>

		<!-- 目录容量详情 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-8">
			<h2 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">目录详情</h2>
			
			<div class="space-y-6">
				{#each data.directories as directory}
					<div class="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200">
						<div class="flex items-center justify-between mb-4">
							<div>
								<h3 class="font-semibold text-lg text-gray-900">{directory.name}</h3>
								<p class="text-sm text-gray-500 font-mono">{directory.path}</p>
							</div>
							<div class="flex items-center space-x-4">
								{#if directory.exists}
									<div class="text-right">
										<div class="text-lg font-bold {getSizeColor(calculatePercentage(directory.size))}">{directory.sizeFormatted}</div>
										<div class="text-sm text-gray-600">{directory.fileCount} 个文件</div>
										{#if directory.isDateBased && directory.dateSubdirs}
											<div class="text-xs text-gray-500">{directory.dateSubdirs.length} 个日期目录</div>
										{/if}
									</div>
									
									<!-- 清理按钮组 -->
									<div class="flex flex-col space-y-2">
										<!-- 普通清理按钮 -->
										<form method="POST" action="?/cleanDirectory" use:enhance={() => handleCleanDirectory(directory.path, directory.name)}>
											<input type="hidden" name="path" value={directory.path} />
											<input type="hidden" name="name" value={directory.name} />
											<button
												type="submit"
												disabled={cleaningDirectory === directory.path || directory.fileCount === 0}
												class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
											>
												{#if cleaningDirectory === directory.path}
													<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
														<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
													清理中...
												{:else}
													<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
													</svg>
													清理全部
												{/if}
											</button>
										</form>
										
										<!-- 日期范围清理按钮（仅对支持日期的目录显示） -->
										{#if directory.isDateBased && (data.startDate || data.endDate) && directory.dateSubdirs && directory.dateSubdirs.length > 0}
											<form method="POST" action="?/cleanDateRange" use:enhance={() => handleCleanDateRange(directory.path, directory.name)}>
												<input type="hidden" name="basePath" value={directory.path} />
												<input type="hidden" name="name" value={directory.name} />
												<input type="hidden" name="startDate" value={data.startDate || ''} />
												<input type="hidden" name="endDate" value={data.endDate || ''} />
												<button
													type="submit"
													disabled={cleaningDateRange === directory.path}
													class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm"
												>
													{#if cleaningDateRange === directory.path}
														<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
														清理中...
													{:else}
														<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
														</svg>
														清理日期范围
													{/if}
												</button>
											</form>
										{/if}
									</div>
								{:else}
									<div class="text-right">
										<div class="text-lg font-bold text-gray-400">目录不存在</div>
										{#if directory.error}
											<div class="text-sm text-red-600">{directory.error}</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
						
						{#if directory.exists && data.totalSize > 0}
							<!-- 容量占比进度条 -->
							<div class="mt-4">
								<div class="flex justify-between text-sm text-gray-600 mb-2">
									<span>占总容量比例</span>
									<span>{calculatePercentage(directory.size).toFixed(1)}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div 
										class="h-2 rounded-full {getProgressColor(calculatePercentage(directory.size))}" 
										style="width: {calculatePercentage(directory.size)}%"
									></div>
								</div>
							</div>
						{/if}
						
						<!-- 日期子目录详情 -->
						{#if directory.isDateBased && directory.dateSubdirs && directory.dateSubdirs.length > 0}
							<div class="mt-6 border-t pt-4">
								<div class="flex items-center justify-between mb-3">
									<h4 class="font-medium text-gray-900">日期目录详情</h4>
									<span class="text-sm text-gray-500">按日期倒序排列</span>
								</div>
								<div class="space-y-2 max-h-64 overflow-y-auto">
									{#each directory.dateSubdirs as dateDir}
										<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div class="flex-1">
												<div class="flex items-center space-x-3">
													<span class="font-mono text-sm font-medium text-gray-900">{dateDir.date}</span>
													<span class="text-sm text-gray-600">{dateDir.sizeFormatted}</span>
													<span class="text-xs text-gray-500">{dateDir.fileCount} 文件</span>
													<span class="text-xs text-gray-500">{dateDir.taskCount} 任务</span>
												</div>
												<div class="text-xs text-gray-400 font-mono mt-1">{dateDir.path}</div>
											</div>
											<div class="flex items-center space-x-2">
												<!-- 单个日期目录清理按钮 -->
												<form method="POST" action="?/cleanDirectory" use:enhance={() => handleCleanDirectory(dateDir.path, `${directory.name} - ${dateDir.date}`)}>
													<input type="hidden" name="path" value={dateDir.path} />
													<input type="hidden" name="name" value="{directory.name} - {dateDir.date}" />
													<button
														type="submit"
														disabled={cleaningDirectory === dateDir.path || dateDir.fileCount === 0}
														class="bg-red-400 text-white px-3 py-1 rounded text-xs hover:bg-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
													>
														{#if cleaningDirectory === dateDir.path}
															<svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
																<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
																<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
															</svg>
														{:else}
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
															</svg>
														{/if}
													</button>
												</form>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- 操作说明 -->
		<div class="bg-amber-50 border border-amber-200 rounded-xl p-6">
			<h3 class="text-lg font-semibold text-amber-800 mb-2">⚠️ 重要说明</h3>
			<ul class="text-sm text-amber-700 space-y-1">
				<li>• 清理操作将删除目录下的所有文件，请谨慎操作</li>
				<li>• 建议在清理前先确认目录中的文件不再需要</li>
				<li>• 清理操作不可撤销，请确保已做好数据备份</li>
				<li>• 系统会自动跳过无法访问的文件和目录</li>
				<li>• <strong>日期归档功能</strong>：图片、OCR、翻译目录已按日期（YYYY-MM-DD）进行归档管理</li>
				<li>• 使用日期过滤器可以查看和清理特定日期范围内的文件</li>
				<li>• "清理全部"会删除整个目录，"清理日期范围"只删除过滤范围内的文件</li>
			</ul>
		</div>

		<!-- 消息显示 -->
		{#if form?.message}
			<div class="mt-6 p-4 rounded-lg {form.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
				<div class="flex items-start">
					{#if form.success}
						<svg class="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
						</svg>
					{:else}
						<svg class="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
						</svg>
					{/if}
					<div>
						{form.message}
						{#if form.success && form.deletedFiles}
							<div class="mt-2 text-sm">
								删除文件数: {form.deletedFiles} | 释放空间: {form.freedSpace}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		{#if data.error}
			<div class="mt-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
					</svg>
					{data.error}
				</div>
			</div>
		{/if}
	</div>
</div>
