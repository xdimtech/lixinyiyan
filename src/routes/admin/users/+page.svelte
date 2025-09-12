<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data: PageData;
	export let form: ActionData;

	let loading = false;
	let selectedUser: any = null;
	let showRoleModal = false;
	let showPasswordModal = false;
	let showDeleteModal = false;
	let newPassword = '';

	// 分页大小选项
	const pageSizeOptions = [10, 20, 50, 100];

	// 角色选项
	const roleOptions = [
		{ value: 'member', label: '普通用户', color: 'text-gray-600' },
		{ value: 'manager', label: '管理员', color: 'text-blue-600' },
		{ value: 'admin', label: '超级管理员', color: 'text-red-600' }
	];

	// 获取角色显示信息
	function getRoleInfo(role: string) {
		return roleOptions.find(r => r.value === role) || roleOptions[0];
	}

	// 格式化日期
	function formatDate(date: string | Date) {
		return new Date(date).toLocaleString('zh-CN');
	}

	// 处理搜索
	function handleSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.set('search', target.value);
		currentUrl.searchParams.set('page', '1'); // 重置到第一页
		goto(currentUrl.toString());
	}

	// 处理分页大小变化
	function handlePageSizeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.set('pageSize', target.value);
		currentUrl.searchParams.set('page', '1'); // 重置到第一页
		goto(currentUrl.toString());
	}

	// 处理排序
	function handleSort(column: string) {
		const currentUrl = new URL(window.location.href);
		const currentSort = currentUrl.searchParams.get('sortBy');
		const currentOrder = currentUrl.searchParams.get('sortOrder');
		
		if (currentSort === column) {
			// 切换排序方向
			currentUrl.searchParams.set('sortOrder', currentOrder === 'asc' ? 'desc' : 'asc');
		} else {
			// 新的排序列
			currentUrl.searchParams.set('sortBy', column);
			currentUrl.searchParams.set('sortOrder', 'asc');
		}
		goto(currentUrl.toString());
	}

	// 处理分页
	function handlePageChange(newPage: number) {
		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.set('page', newPage.toString());
		goto(currentUrl.toString());
	}

	// 打开角色修改模态框
	function openRoleModal(user: any) {
		selectedUser = user;
		showRoleModal = true;
	}

	// 打开密码重置模态框
	function openPasswordModal(user: any) {
		selectedUser = user;
		newPassword = '';
		showPasswordModal = true;
	}

	// 打开删除确认模态框
	function openDeleteModal(user: any) {
		selectedUser = user;
		showDeleteModal = true;
	}

	// 关闭所有模态框
	function closeModals() {
		showRoleModal = false;
		showPasswordModal = false;
		showDeleteModal = false;
		selectedUser = null;
		newPassword = '';
	}

	// 表单提交处理
	function handleSubmit(action: string) {
		loading = true;
		return async ({ result }: any) => {
			loading = false;
			if (result.type === 'success') {
				closeModals();
				// 刷新页面数据
				goto(window.location.href, { replaceState: true });
			}
		};
	}

	// 获取排序图标
	function getSortIcon(column: string) {
		const currentSort = $page.url.searchParams.get('sortBy');
		const currentOrder = $page.url.searchParams.get('sortOrder');
		
		if (currentSort !== column) return '↕️';
		return currentOrder === 'asc' ? '↑' : '↓';
	}
</script>

<svelte:head>
	<title>用户管理 - 立心译言</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-900">用户管理</h1>
		<a href="/admin" class="text-indigo-600 hover:text-indigo-500">← 返回管理面板</a>
	</div>

	<!-- 搜索和筛选 -->
	<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
		<div class="flex flex-col md:flex-row gap-4">
			<div class="flex-1">
				<label for="search" class="block text-sm font-medium text-gray-700 mb-2">搜索用户</label>
				<input
					type="text"
					id="search"
					placeholder="输入用户名搜索..."
					value={data.filters.search}
					on:input={handleSearch}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
			<div>
				<label for="pageSize" class="block text-sm font-medium text-gray-700 mb-2">每页显示</label>
				<select
					id="pageSize"
					value={data.pagination.pageSize}
					on:change={handlePageSizeChange}
					class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					{#each pageSizeOptions as size}
						<option value={size}>{size} 条</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- 用户列表 -->
	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">
				用户列表 (共 {data.pagination.totalCount} 条)
			</h2>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							<button
								on:click={() => handleSort('username')}
								class="flex items-center space-x-1 hover:text-gray-700"
							>
								<span>用户名</span>
								<span class="text-sm">{getSortIcon('username')}</span>
							</button>
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							角色
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							<button
								on:click={() => handleSort('createdAt')}
								class="flex items-center space-x-1 hover:text-gray-700"
							>
								<span>创建时间</span>
								<span class="text-sm">{getSortIcon('createdAt')}</span>
							</button>
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							最后更新
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
							操作
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.users as user}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{user.username}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 {getRoleInfo(user.role).color}">
									{getRoleInfo(user.role).label}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{formatDate(user.createdAt)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{formatDate(user.updatedAt)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
								<button
									on:click={() => openRoleModal(user)}
									class="text-indigo-600 hover:text-indigo-500"
								>
									修改角色
								</button>
								<button
									on:click={() => openPasswordModal(user)}
									class="text-yellow-600 hover:text-yellow-500"
								>
									重置密码
								</button>
								<button
									on:click={() => openDeleteModal(user)}
									class="text-red-600 hover:text-red-500"
								>
									删除
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- 分页 -->
		{#if data.pagination.totalPages > 1}
			<div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
				<div class="text-sm text-gray-700">
					显示第 {(data.pagination.page - 1) * data.pagination.pageSize + 1} 到 
					{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)} 条，
					共 {data.pagination.totalCount} 条记录
				</div>
				<div class="flex space-x-2">
					<button
						on:click={() => handlePageChange(data.pagination.page - 1)}
						disabled={!data.pagination.hasPrev}
						class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						上一页
					</button>
					
					{#each Array.from({length: Math.min(5, data.pagination.totalPages)}, (_, i) => {
						const start = Math.max(1, data.pagination.page - 2);
						return start + i;
					}) as pageNum}
						{#if pageNum <= data.pagination.totalPages}
							<button
								on:click={() => handlePageChange(pageNum)}
								class="px-3 py-1 text-sm border rounded-md {pageNum === data.pagination.page 
									? 'bg-indigo-600 text-white border-indigo-600' 
									: 'border-gray-300 hover:bg-gray-50'}"
							>
								{pageNum}
							</button>
						{/if}
					{/each}
					
					<button
						on:click={() => handlePageChange(data.pagination.page + 1)}
						disabled={!data.pagination.hasNext}
						class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						下一页
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- 修改角色模态框 -->
	{#if showRoleModal && selectedUser}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<h3 class="text-lg font-bold text-gray-900 mb-4">修改用户角色</h3>
				<p class="text-sm text-gray-600 mb-4">用户: {selectedUser.username}</p>
				
				<form method="POST" action="?/updateRole" use:enhance={handleSubmit('updateRole')}>
					<input type="hidden" name="userId" value={selectedUser.id} />
					<div class="mb-4">
						<label for="role-select" class="block text-sm font-medium text-gray-700 mb-2">选择角色</label>
						<select id="role-select" name="role" value={selectedUser.role} class="w-full px-3 py-2 border border-gray-300 rounded-md">
							{#each roleOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={closeModals}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
						>
							{loading ? '更新中...' : '确认修改'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 重置密码模态框 -->
	{#if showPasswordModal && selectedUser}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<h3 class="text-lg font-bold text-gray-900 mb-4">重置用户密码</h3>
				<p class="text-sm text-gray-600 mb-4">用户: {selectedUser.username}</p>
				
				<form method="POST" action="?/resetPassword" use:enhance={handleSubmit('resetPassword')}>
					<input type="hidden" name="userId" value={selectedUser.id} />
					<div class="mb-4">
						<label for="new-password" class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
						<input
							id="new-password"
							type="password"
							name="newPassword"
							bind:value={newPassword}
							placeholder="输入新密码..."
							minlength="6"
							class="w-full px-3 py-2 border border-gray-300 rounded-md"
							required
						/>
						<p class="text-xs text-gray-500 mt-1">密码长度至少6位</p>
					</div>
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={closeModals}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading || !newPassword || newPassword.length < 6}
							class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
						>
							{loading ? '重置中...' : '确认重置'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 删除确认模态框 -->
	{#if showDeleteModal && selectedUser}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<h3 class="text-lg font-bold text-gray-900 mb-4">确认删除用户</h3>
				<p class="text-sm text-gray-600 mb-4">
					确定要删除用户 <strong>{selectedUser.username}</strong> 吗？
				</p>
				<p class="text-sm text-red-600 mb-4">此操作不可恢复，用户的所有数据将被删除。</p>
				
				<form method="POST" action="?/deleteUser" use:enhance={handleSubmit('deleteUser')}>
					<input type="hidden" name="userId" value={selectedUser.id} />
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={closeModals}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
						>
							{loading ? '删除中...' : '确认删除'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 消息显示 -->
	{#if form?.message}
		<div class="fixed bottom-4 right-4 p-4 rounded-md shadow-lg {form.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
			{form.message}
		</div>
	{/if}

	{#if data.error}
		<div class="fixed bottom-4 right-4 p-4 rounded-md shadow-lg bg-red-50 text-red-800 border border-red-200">
			{data.error}
		</div>
	{/if}
</div>

<style>
	/* 确保模态框在最上层 */
	.z-50 {
		z-index: 50;
	}
</style>
