<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getUsersWithTaskCount, type UserWithTaskCount } from '$lib/api/users';
	import { filterTasks, type Task, type TaskPagination } from '$lib/api/tasks';

	export let data: PageData;
	export let form: ActionData;

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

<div class="max-w-8xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-900">任务列表</h1>
		<a
			href="/upload"
			class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
			style="color: white !important;"
		>
			新建任务
		</a>
	</div>

	<!-- 筛选器 -->
	<div class="bg-white rounded-lg shadow-sm p-4 mb-6">
		<div class="flex items-end justify-between space-x-4">
			<!-- 左侧筛选框组 -->
			<div class="flex items-end space-x-4">
				<div class="w-64">
					<label for="username-filter" class="block text-sm font-medium text-gray-700 mb-1">
						按用户名筛选
					</label>
					<select
						id="username-filter"
						bind:value={selectedUserId}
						on:change={handleFilter}
						class="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					>
						<option value="">-- 选择用户名 --</option>
						{#each data.users as user}
							<option value={user.id}>{user.username}</option>
						{/each}
					</select>
				</div>
				<div class="w-48">
					<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
						按状态筛选
					</label>
					<select
						id="status-filter"
						bind:value={selectedStatus}
						on:change={handleFilter}
						class="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					>
						<option value="">-- 选择状态 --</option>
						<option value="0">等待中</option>
						<option value="1">处理中</option>
						<option value="2">已完成</option>
						<option value="3">失败</option>
					</select>
				</div>
			</div>
			
			<!-- 右侧按钮组 -->
			<div class="flex space-x-2">
				<button
					type="button"
					on:click={clearFilter}
					class="h-10 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
				>
					清除
				</button>
				<!-- 用户统计按钮 -->
				<button
					type="button"
					on:click={loadUserStats}
					disabled={loadingStats}
					class="h-10 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-purple-300"
				>
					{loadingStats ? '加载中...' : '用户统计'}
				</button>
			</div>
		</div>
	</div>

	<!-- 消息显示 -->
	{#if form?.message}
		<div class="mb-4 p-4 rounded-md {form.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
			{form.message}
		</div>
	{/if}

	{#if data.error}
		<div class="mb-4 p-4 rounded-md bg-red-50 text-red-800">
			{data.error}
		</div>
	{/if}

	<!-- 用户统计显示 -->
	{#if showUserStats && userStats.length > 0}
		<div class="mb-6 bg-white rounded-lg shadow-sm p-4">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-lg font-medium text-gray-900">用户任务统计</h3>
				<button
					type="button"
					on:click={() => showUserStats = false}
					class="text-gray-400 hover:text-gray-600"
				>
					✕
				</button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each userStats as stat}
					<div class="bg-gray-50 p-3 rounded-lg">
						<div class="flex justify-between items-center">
							<span class="text-sm font-medium text-gray-900">{stat.username}</span>
							<span class="text-lg font-bold text-indigo-600">{stat.taskCount}</span>
						</div>
						<div class="text-xs text-gray-500">个任务</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 任务列表 -->
	<div class="bg-white shadow-sm rounded-lg overflow-hidden">
		{#if filteredTasks.length === 0}
			<div class="text-center py-12">
				<div class="text-gray-500 text-lg">暂无任务记录</div>
				<a
					href="/upload"
					class="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
				>
					创建第一个任务
				</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								任务ID
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								用户名
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								文件名
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								处理类型
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								页数
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								状态
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								创建时间
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								操作
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each filteredTasks as task}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									#{task.id}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{task.username}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
									{task.fileName}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{parseTypeMap[task.parseType]}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{task.pageNum || '-'}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {statusMap[task.status].class}">
										{statusMap[task.status].label}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatDate(task.createdAt)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
									{#if task.status === 2}
										<form method="POST" action="?/download" use:enhance class="inline">
											<input type="hidden" name="taskId" value={task.id} />
											<button
												type="submit"
												class="text-indigo-600 hover:text-indigo-900"
											>
												下载
											</button>
										</form>
										<a
											href="/tasks/review/{task.id}"
											class="text-green-600 hover:text-green-900"
										>
											去审核
										</a>
									{/if}
									
									{#if task.userId === data.currentUser?.id || data.currentUser?.role === 'admin'}
										<form method="POST" action="?/delete" use:enhance class="inline">
											<input type="hidden" name="taskId" value={task.id} />
											<button
												type="submit"
												class="text-red-600 hover:text-red-900"
												on:click={() => confirm('确定要删除这个任务吗？')}
											>
												删除
											</button>
										</form>
									{/if}
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
		<div class="mt-6 flex items-center justify-between">
			<div class="text-sm text-gray-700">
				显示第 {(pagination.page - 1) * pagination.pageSize + 1} 到 
				{Math.min(pagination.page * pagination.pageSize, pagination.total)} 条，
				共 {pagination.total} 条记录
			</div>
			
			<div class="flex items-center space-x-2">
				<!-- 上一页 -->
				<button
					type="button"
					on:click={() => handlePageChange(currentPage - 1)}
					disabled={!pagination.hasPrev}
					class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					上一页
				</button>
				
				<!-- 页码 -->
				{#each Array.from({length: Math.min(5, pagination?.totalPages || 0)}, (_, i) => {
					const startPage = Math.max(1, (pagination?.page || 1) - 2);
					const endPage = Math.min(pagination?.totalPages || 1, startPage + 4);
					return startPage + i;
				}).filter(page => page <= (pagination?.totalPages || 1)) as page}
					<button
						type="button"
						on:click={() => handlePageChange(page)}
						class="px-3 py-2 text-sm font-medium border rounded-md
							{page === pagination?.page 
								? 'text-white bg-indigo-600 border-indigo-600' 
								: 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}"
					>
						{page}
					</button>
				{/each}
				
				<!-- 下一页 -->
				<button
					type="button"
					on:click={() => handlePageChange(currentPage + 1)}
					disabled={!pagination.hasNext}
					class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					下一页
				</button>
			</div>
		</div>
	{/if}

	<!-- 统计信息 -->
	{#if filteredTasks.length > 0}
		<div class="mt-6 bg-gray-50 rounded-lg p-4">
			<h3 class="text-lg font-medium text-gray-900 mb-2">
				统计信息 
				{#if selectedUserId || selectedStatus}
					<span class="text-sm text-gray-500">
						(筛选条件: 
						{#if selectedUserId}
							用户: {data.users.find(u => u.id === selectedUserId)?.username || '未知用户'}
						{/if}
						{#if selectedUserId && selectedStatus}, {/if}
						{#if selectedStatus}
							状态: {statusMap[parseInt(selectedStatus)].label}
						{/if}
						)
					</span>
				{/if}
			</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
				<div>
					<span class="text-gray-600">
						{pagination ? '总记录数' : '总任务数'}:
					</span>
					<span class="font-semibold text-gray-900">
						{pagination ? pagination.total : filteredTasks.length}
					</span>
				</div>
				<div>
					<span class="text-gray-600">当前页已完成:</span>
					<span class="font-semibold text-green-600">
						{filteredTasks.filter(t => t.status === 2).length}
					</span>
				</div>
				<div>
					<span class="text-gray-600">当前页处理中:</span>
					<span class="font-semibold text-blue-600">
						{filteredTasks.filter(t => t.status === 1).length}
					</span>
				</div>
				<div>
					<span class="text-gray-600">当前页等待中:</span>
					<span class="font-semibold text-yellow-600">
						{filteredTasks.filter(t => t.status === 0).length}
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
