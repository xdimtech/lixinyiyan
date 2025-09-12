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
		return async ({ result, update }: any) => {
			console.log('表单提交结果:', result);
			loading = false;
			
			if (result.type === 'success') {
				console.log('操作成功:', result.data?.message);
				closeModals();
				// 更新页面数据
				await update();
			} else if (result.type === 'failure') {
				console.error('操作失败:', result.data?.message);
				// 失败时不关闭模态框，让用户看到错误信息
			} else {
				console.log('未知结果类型:', result.type);
				loading = false;
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
			<div class="min-w-32">
				<label for="pageSize" class="block text-sm font-medium text-gray-700 mb-2">每页显示</label>
				<select
					id="pageSize"
					value={data.pagination.pageSize}
					on:change={handlePageSizeChange}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
								{#if user.role === 'admin'}
									<span class="text-gray-400 cursor-not-allowed" title="超级管理员不可删除">
										删除
									</span>
								{:else}
									<button
										on:click={() => openDeleteModal(user)}
										class="text-red-600 hover:text-red-500"
									>
										删除
									</button>
								{/if}
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
		<div 
			class="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 modal-overlay" 
			on:click={closeModals}
		on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && closeModals()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="role-modal-title"
		tabindex="-1"
		>
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<div 
				class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 modal-content" 
				on:click={(e: Event) => e.stopPropagation()}
				on:keydown={(e: KeyboardEvent) => e.stopPropagation()}
				role="document"
			>
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 id="role-modal-title" class="text-lg font-semibold text-gray-900">修改用户角色</h3>
						<button
							type="button"
							on:click={closeModals}
							class="text-gray-400 hover:text-gray-600 transition-colors"
							aria-label="关闭弹框"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
				
				<form 
					method="POST" 
					action="?/updateRole" 
					use:enhance={() => {
						loading = true;
						return handleSubmit('updateRole');
					}}
				>
					<div class="px-6 py-4">
						<input type="hidden" name="userId" value={selectedUser.id} />
						
						<div class="mb-4">
							<p class="text-sm text-gray-600 mb-4">
								当前用户: <span class="font-medium text-gray-900">{selectedUser.username}</span>
							</p>
							<p class="text-sm text-gray-600 mb-4">
								当前角色: <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 {getRoleInfo(selectedUser.role).color}">
									{getRoleInfo(selectedUser.role).label}
								</span>
							</p>
						</div>
						
						<div class="mb-6">
							<label for="role-select" class="block text-sm font-medium text-gray-700 mb-2">选择新角色</label>
							<select id="role-select" name="role" value={selectedUser.role} class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
								{#each roleOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>
					
					<div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
						<button
							type="button"
							on:click={closeModals}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center"
						>
							{#if loading}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								更新中...
							{:else}
								确认修改
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 重置密码模态框 -->
	{#if showPasswordModal && selectedUser}
		<div 
			class="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 modal-overlay" 
			on:click={closeModals}
		on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && closeModals()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="password-modal-title"
		tabindex="-1"
		>
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<div 
				class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 modal-content" 
				on:click={(e: Event) => e.stopPropagation()}
				on:keydown={(e: KeyboardEvent) => e.stopPropagation()}
				role="document"
			>
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 id="password-modal-title" class="text-lg font-semibold text-gray-900">重置用户密码</h3>
						<button
							type="button"
							on:click={closeModals}
							class="text-gray-400 hover:text-gray-600 transition-colors"
							aria-label="关闭弹框"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
				
				<form 
					method="POST" 
					action="?/resetPassword" 
					use:enhance={() => {
						loading = true;
						return handleSubmit('resetPassword');
					}}
				>
					<div class="px-6 py-4">
						<input type="hidden" name="userId" value={selectedUser.id} />
						
						<div class="mb-4">
							<p class="text-sm text-gray-600 mb-4">
								目标用户: <span class="font-medium text-gray-900">{selectedUser.username}</span>
							</p>
							<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
								<div class="flex">
									<svg class="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
									</svg>
									<p class="text-sm text-yellow-800">重置密码后，用户需要使用新密码重新登录</p>
								</div>
							</div>
						</div>
						
						<div class="mb-6">
							<label for="new-password" class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
							<input
								id="new-password"
								type="password"
								name="newPassword"
								bind:value={newPassword}
								placeholder="输入新密码..."
								minlength="6"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
								required
							/>
							<p class="text-xs text-gray-500 mt-1">密码长度至少6位</p>
						</div>
					</div>
					
					<div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
						<button
							type="button"
							on:click={closeModals}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading || !newPassword || newPassword.length < 6}
							class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center"
						>
							{#if loading}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								重置中...
							{:else}
								确认重置
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 删除确认模态框 -->
	{#if showDeleteModal && selectedUser}
		<div 
			class="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 modal-overlay" 
			on:click={closeModals}
		on:keydown={(e: KeyboardEvent) => e.key === 'Escape' && closeModals()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-modal-title"
		tabindex="-1"
		>
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<div 
				class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 modal-content" 
				on:click={(e: Event) => e.stopPropagation()}
				on:keydown={(e: KeyboardEvent) => e.stopPropagation()}
				role="document"
			>
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<svg class="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
							<h3 id="delete-modal-title" class="text-lg font-semibold text-gray-900">确认删除用户</h3>
						</div>
						<button
							type="button"
							on:click={closeModals}
							class="text-gray-400 hover:text-gray-600 transition-colors"
							aria-label="关闭弹框"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
				
				<form 
					method="POST" 
					action="?/deleteUser" 
					use:enhance={() => {
						loading = true;
						return handleSubmit('deleteUser');
					}}
				>
					<div class="px-6 py-4">
						<input type="hidden" name="userId" value={selectedUser.id} />
						
						<div class="mb-4">
							<p class="text-sm text-gray-600 mb-4">
								确定要删除用户 <span class="font-medium text-gray-900">{selectedUser.username}</span> 吗？
							</p>
							<div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
								<div class="flex">
									<svg class="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
									</svg>
									<div>
										<p class="text-sm text-red-800 font-medium">危险操作</p>
										<p class="text-sm text-red-700 mt-1">此操作不可恢复，用户的所有数据将被删除。</p>
									</div>
								</div>
							</div>
						</div>
					</div>
					
					<div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
						<button
							type="button"
							on:click={closeModals}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
						>
							{#if loading}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								删除中...
							{:else}
								确认删除
							{/if}
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
	
	/* 模态框动画 */
	.modal-overlay {
		animation: fadeIn 0.15s ease-out;
	}
	
	.modal-content {
		animation: modalSlideIn 0.2s ease-out;
		/* 防止渲染抖动 */
		backface-visibility: hidden;
		transform-style: preserve-3d;
		will-change: opacity, transform;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	
	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
</style>
