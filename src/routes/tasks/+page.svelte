<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

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

	let usernameFilter = data.usernameFilter || '';

	const handleFilter = () => {
		const params = new URLSearchParams();
		if (usernameFilter.trim()) {
			params.set('username', usernameFilter.trim());
		}
		goto(`/tasks?${params.toString()}`);
	};

	const formatDate = (dateString: string | Date) => {
		const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
		return date.toLocaleString('zh-CN');
	};
</script>

<svelte:head>
	<title>任务列表 - 智能识别翻译系统</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-900">任务列表</h1>
		<a
			href="/upload"
			class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
		>
			新建任务
		</a>
	</div>

	<!-- 筛选器 -->
	<div class="bg-white rounded-lg shadow-sm p-4 mb-6">
		<div class="flex items-center space-x-4">
			<div class="flex-1">
				<label for="username-filter" class="block text-sm font-medium text-gray-700 mb-1">
					按用户名筛选
				</label>
				<input
					id="username-filter"
					type="text"
					bind:value={usernameFilter}
					placeholder="输入用户名..."
					class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
				/>
			</div>
			<div class="flex space-x-2">
				<button
					type="button"
					on:click={handleFilter}
					class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
				>
					筛选
				</button>
				<button
					type="button"
					on:click={() => { usernameFilter = ''; handleFilter(); }}
					class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
				>
					清除
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

	<!-- 任务列表 -->
	<div class="bg-white shadow-sm rounded-lg overflow-hidden">
		{#if data.tasks.length === 0}
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
						{#each data.tasks as task}
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

	<!-- 统计信息 -->
	{#if data.tasks.length > 0}
		<div class="mt-6 bg-gray-50 rounded-lg p-4">
			<h3 class="text-lg font-medium text-gray-900 mb-2">统计信息</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
				<div>
					<span class="text-gray-600">总任务数:</span>
					<span class="font-semibold text-gray-900">{data.tasks.length}</span>
				</div>
				<div>
					<span class="text-gray-600">已完成:</span>
					<span class="font-semibold text-green-600">
						{data.tasks.filter(t => t.status === 2).length}
					</span>
				</div>
				<div>
					<span class="text-gray-600">处理中:</span>
					<span class="font-semibold text-blue-600">
						{data.tasks.filter(t => t.status === 1).length}
					</span>
				</div>
				<div>
					<span class="text-gray-600">等待中:</span>
					<span class="font-semibold text-yellow-600">
						{data.tasks.filter(t => t.status === 0).length}
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
