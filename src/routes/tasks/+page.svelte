<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getUsersWithTaskCount, type UserWithTaskCount } from '$lib/api/users';
	import { filterTasks, type Task, type TaskPagination } from '$lib/api/tasks';

	export let data: PageData;
	export let form: ActionData;

	// 消息自动消失
	let messageTimeout: NodeJS.Timeout | null = null;
	let showMessage = false;
	
	// 监听form变化，自动显示和隐藏消息
	$: if (form?.message) {
		showMessage = true;
		if (messageTimeout) {
			clearTimeout(messageTimeout);
		}
		messageTimeout = setTimeout(() => {
			showMessage = false;
		}, 3000); // 3秒后自动消失
	}

	// 状态映射
	const statusMap: Record<number, { label: string; class: string }> = {
		0: { label: '等待中', class: 'bg-yellow-100 text-yellow-800' },
		1: { label: '处理中', class: 'bg-blue-100 text-blue-800' },
		2: { label: '已完成', class: 'bg-green-100 text-green-800' },
		3: { label: '失败', class: 'bg-red-100 text-red-800' }
	};

	// 处理类型映射
	const parseTypeMap: Record<string, string> = {
		'only_ocr': '仅识别文本',
		'translate': '识别并翻译'
	};

	let selectedUserId = '';
	let selectedStatus = ''; // 选择的状态
	let filteredTasks: Task[] = data.tasks; // 筛选后的任务列表
	let pagination: TaskPagination | null = null; // 分页信息
	let currentPage = 1; // 当前页码
	let pageSize = 10; // 每页数量
	let userStats: UserWithTaskCount[] = [];
	let loadingStats = false;
	let showUserStats = false;
	let refreshing = false;

	// 使用POST请求筛选任务
	const handleFilter = async (page = 1) => {
		try {
			// 构建筛选条件
			const filters: any = {
				page,
				pageSize
			};
			
			if (selectedUserId.trim()) {
				filters.userId = selectedUserId;
			}
			
			if (selectedStatus.trim()) {
				filters.status = parseInt(selectedStatus);
			}
			
			// 执行筛选
			const result = await filterTasks(filters);
			filteredTasks = result.data || [];
			pagination = result.pagination || null;
			currentPage = page;
		} catch (error) {
			console.error('筛选任务失败:', error);
			alert('筛选任务失败，请稍后重试');
		}
	};

	// 刷新当前页数据
	const handleRefresh = async () => {
		refreshing = true;
		try {
			await handleFilter(currentPage);
		} finally {
			refreshing = false;
		}
	};

	// 清除筛选
	const clearFilter = async () => {
		selectedUserId = '';
		selectedStatus = '';
		await handleFilter(1); // 重置到第一页
	};

	// 分页处理函数
	const handlePageChange = async (page: number) => {
		await handleFilter(page);
	};

	// 组件加载时初始化分页数据
	onMount(() => {
		handleFilter(1);
	});

	const formatDate = (dateString: string) => {
		// 后端现在返回 'YYYY-MM-DD HH:mm:ss' 格式的字符串，已经是中国时区
		if (dateString.includes('T') || dateString.includes('Z')) {
			// ISO格式
			return new Date(dateString).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
		} else {
			// 'YYYY-MM-DD HH:mm:ss' 格式，添加时区信息后格式化显示
			const date = new Date(dateString + ' +08:00');
			return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
		}
	};

	// 加载用户任务统计
	const loadUserStats = async () => {
		loadingStats = true;
		try {
			userStats = await getUsersWithTaskCount();
			showUserStats = true;
		} catch (error) {
			console.error('加载用户统计失败:', error);
		} finally {
			loadingStats = false;
		}
	};

</script>

<svelte:head>
	<title>任务列表 - 立心翻译</title>
</svelte:head>

<div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

	<!-- 筛选器 -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">筛选条件</h2>
		<div class="flex items-end justify-between space-x-6">
			<!-- 左侧筛选框组 -->
			<div class="flex items-end space-x-6">
				<div class="w-64">
					<label for="username-filter" class="block text-sm font-medium text-gray-700 mb-2">
						按用户名筛选
					</label>
					<select
						id="username-filter"
						bind:value={selectedUserId}
						on:change={handleFilter}
						class="block w-full h-11 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
					>
						<option value="">全部用户</option>
						{#each data.users as user}
							<option value={user.id}>{user.username}</option>
						{/each}
					</select>
				</div>
				<div class="w-48">
					<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-2">
						按状态筛选
					</label>
					<select
						id="status-filter"
						bind:value={selectedStatus}
						on:change={handleFilter}
						class="block w-full h-11 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
					>
						<option value="">全部状态</option>
						<option value="0">等待中</option>
						<option value="1">处理中</option>
						<option value="2">已完成</option>
						<option value="3">失败</option>
					</select>
				</div>
			</div>
			
			<!-- 右侧按钮组 -->
			<div class="flex space-x-3">
				<button
					type="button"
					on:click={clearFilter}
					class="h-11 w-[100px] bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 border border-gray-300 font-medium transform"
				>
					<span class="flex items-center justify-center w-full">
						清除筛选
					</span>
				</button>
				<button
					type="button"
					on:click={handleRefresh}
					disabled={refreshing}
					class="h-11 w-[100px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:from-blue-300 disabled:to-indigo-300 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 shadow-md font-medium transform relative overflow-hidden"
				>
					<!-- 加载中的背景闪烁效果 -->
					{#if refreshing}
						<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
					{/if}
					
					<span class="flex items-center justify-center w-full relative z-10">
						{#if refreshing}
							<!-- 更精美的旋转图标 -->
							<svg class="animate-spin h-4 w-4 text-white mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<!-- 文字渐变动效 -->
							<span class="text-xs animate-pulse">刷新中</span>
						{:else}
							<!-- 刷新图标 -->
							<svg class="h-4 w-4 text-white mr-1 transition-transform duration-200 hover:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2M15 15v5h.582M4.582 15A8.001 8.001 0 0015.582 15m0 0V15a8 8 0 11-15.356-2" />
							</svg>
							<span class="text-sm">刷新</span>
						{/if}
					</span>
				</button>
			</div>
		</div>
	</div>

	<!-- 消息显示 -->
	{#if form?.message && showMessage}
		<div class="mb-6 p-4 rounded-xl {form.success ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border border-red-200'} relative transition-all duration-300 shadow-sm">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="w-2 h-2 rounded-full {form.success ? 'bg-green-500' : 'bg-red-500'} mr-3"></div>
				</div>
				<div class="font-medium">{form.message}</div>
			</div>
			<button 
				type="button" 
				on:click={() => showMessage = false}
				class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
			>
				<span class="sr-only">关闭</span>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
				</svg>
			</button>
		</div>
	{/if}

	{#if data.error}
		<div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border border-red-200 shadow-sm">
			<div class="flex items-center">
				<div class="w-2 h-2 rounded-full bg-red-500 mr-3"></div>
				<div class="font-medium">{data.error}</div>
			</div>
		</div>
	{/if}

	<!-- 用户统计显示 -->
	{#if showUserStats && userStats.length > 0}
		<div class="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
			<div class="flex justify-between items-center mb-6">
				<h3 class="text-xl font-semibold text-gray-900">用户任务统计</h3>
				<button
					type="button"
					on:click={() => showUserStats = false}
					class="text-gray-400 hover:text-gray-600 transition-colors p-1"
				>
					<span class="sr-only">关闭</span>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
					</svg>
				</button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{#each userStats as stat}
					<div class="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100 hover:shadow-md transition-shadow">
						<div class="flex justify-between items-center">
							<span class="text-sm font-semibold text-gray-900">{stat.username}</span>
							<span class="text-2xl font-bold text-indigo-600">{stat.taskCount}</span>
						</div>
						<div class="text-xs text-indigo-600 mt-1 font-medium">个任务</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 任务列表 -->
	<div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
		{#if filteredTasks.length === 0}
			<div class="text-center py-16">
				<div class="text-gray-400 text-lg mb-2">暂无任务记录</div>
				<p class="text-gray-500 mb-6">还没有任何任务，创建您的第一个任务吧</p>
				<a
					href="/upload"
					class="inline-block bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-md font-medium"
				>
					创建第一个任务
				</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gradient-to-r from-gray-50 to-gray-100">
						<tr>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								任务ID
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								用户名
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								文件名
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								处理类型
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								页数/进度
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								状态
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								创建时间
							</th>
							<th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								操作
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-100">
						{#each filteredTasks as task, index}
							<tr class="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-150 {index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}">
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									<span class="bg-gray-100 px-2 py-1 rounded-md text-xs">#{task.id}</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									<div class="font-medium">{task.username}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs">
									<div class="truncate" title="{task.fileName}">{task.fileName}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
										{parseTypeMap[task.parseType]}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{#if task.pageNum && task.pageNum > 0}
										<div class="flex flex-col space-y-1">
											<span class="font-mono text-xs">{task.curPage || 0}/{task.pageNum}</span>
											{#if task.status === 1}
												<!-- 处理中显示进度条 -->
												<div class="w-16 bg-gray-200 rounded-full h-1.5">
													<div 
														class="bg-gradient-to-r from-indigo-500 to-blue-500 h-1.5 rounded-full transition-all duration-300" 
														style="width: {Math.round(((task.curPage || 0) / task.pageNum) * 100)}%"
													></div>
												</div>
												<span class="text-xs text-gray-500">{Math.round(((task.curPage || 0) / task.pageNum) * 100)}%</span>
											{:else}
												<span class="text-xs text-gray-500">
													{task.status === 2 ? '已完成' : task.status === 0 ? '等待中' : '失败'}
												</span>
											{/if}
										</div>
									{:else}
										<span class="font-mono">-</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full {statusMap[task.status].class}">
										{statusMap[task.status].label}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									<div class="font-mono text-xs">{formatDate(task.createdAt)}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<div class="flex items-center space-x-3">
										{#if task.status === 2}
											<form method="POST" action="?/download" use:enhance class="inline">
												<input type="hidden" name="taskId" value={task.id} />
												<button
													type="submit"
													class="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
												>
													下载
												</button>
											</form>
											<!-- 只有任务创建者或管理员/经理才能审核 -->
											{#if task.userId === data.currentUser?.id || data.currentUser?.role === 'admin' || data.currentUser?.role === 'manager'}
												<a
													href="/tasks/review/{task.id}"
													class="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
												>
													去审核
												</a>
											{/if}
										{/if}
										
										{#if task.userId === data.currentUser?.id || data.currentUser?.role === 'admin'}
											<form method="POST" action="?/delete" use:enhance={({ formElement, formData, action, cancel, submitter }) => {
												if (!confirm('确定要删除这个任务吗？')) {
													cancel();
													return;
												}
												return async ({ result }) => {
													// 删除成功后重新加载任务列表
													if (result.type === 'success') {
														await handleFilter(currentPage);
													}
												};
											}} class="inline">
												<input type="hidden" name="taskId" value={task.id} />
												<button
													type="submit"
													class="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
												>
													删除
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- 分页组件 -->
	{#if pagination && pagination.totalPages > 1}
		<div class="mt-8 bg-white rounded-xl border border-gray-200 p-6">
			<div class="flex items-center justify-between">
				<div class="text-sm text-gray-600">
					<span class="font-medium text-gray-900">
						显示第 {(pagination.page - 1) * pagination.pageSize + 1} 到 
						{Math.min(pagination.page * pagination.pageSize, pagination.total)} 条
					</span>
					，共 <span class="font-semibold text-indigo-600">{pagination.total}</span> 条记录
				</div>
				
				<div class="flex items-center space-x-1">
					<!-- 上一页 -->
					<button
						type="button"
						on:click={() => handlePageChange(currentPage - 1)}
						disabled={!pagination.hasPrev}
						class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 transition-all duration-200"
					>
						上一页
					</button>
					
					<!-- 页码 -->
					<div class="flex items-center space-x-1 mx-4">
						{#each Array.from({length: Math.min(5, pagination?.totalPages || 0)}, (_, i) => {
							const startPage = Math.max(1, (pagination?.page || 1) - 2);
							const endPage = Math.min(pagination?.totalPages || 1, startPage + 4);
							return startPage + i;
						}).filter(page => page <= (pagination?.totalPages || 1)) as page}
							<button
								type="button"
								on:click={() => handlePageChange(page)}
								class="px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200
									{page === pagination?.page 
										? 'text-white bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-600 shadow-md' 
										: 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400'}"
							>
								{page}
							</button>
						{/each}
					</div>
					
					<!-- 下一页 -->
					<button
						type="button"
						on:click={() => handlePageChange(currentPage + 1)}
						disabled={!pagination.hasNext}
						class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 transition-all duration-200"
					>
						下一页
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- 统计信息 -->
	{#if filteredTasks.length > 0}
		<div class="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
			<div class="mb-6">
				<h3 class="text-xl font-semibold text-gray-900 mb-1">统计信息</h3>
				{#if selectedUserId || selectedStatus}
					<div class="text-sm text-gray-600">
						<span class="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium mr-2">
							筛选条件
						</span>
						{#if selectedUserId}
							<span class="text-gray-700">
								用户: <span class="font-medium">{data.users.find(u => u.id === selectedUserId)?.username || '未知用户'}</span>
							</span>
						{/if}
						{#if selectedUserId && selectedStatus}
							<span class="mx-2 text-gray-400">|</span>
						{/if}
						{#if selectedStatus}
							<span class="text-gray-700">
								状态: <span class="font-medium">{statusMap[parseInt(selectedStatus)].label}</span>
							</span>
						{/if}
					</div>
				{/if}
			</div>
			
			<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
				<div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
					<div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
						{pagination ? '总记录数' : '总任务数'}
					</div>
					<div class="text-2xl font-bold text-gray-900">
						{pagination ? pagination.total : filteredTasks.length}
					</div>
				</div>
				
				<div class="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
					<div class="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">
						当前页已完成
					</div>
					<div class="text-2xl font-bold text-green-600">
						{filteredTasks.filter(t => t.status === 2).length}
					</div>
				</div>
				
				<div class="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
					<div class="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">
						当前页处理中
					</div>
					<div class="text-2xl font-bold text-blue-600">
						{filteredTasks.filter(t => t.status === 1).length}
					</div>
				</div>
				
				<div class="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm">
					<div class="text-xs font-medium text-yellow-600 uppercase tracking-wider mb-1">
						当前页等待中
					</div>
					<div class="text-2xl font-bold text-yellow-600">
						{filteredTasks.filter(t => t.status === 0).length}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
