<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
	export let form: ActionData;

	let processing = false;

	const handleProcessTasks = () => {
		processing = true;
		return async ({ result }: any) => {
			processing = false;
		};
	};
</script>

<svelte:head>
	<title>系统管理 - 立心译言</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">系统管理</h1>

	<!-- 系统统计 -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
		<div class="bg-white rounded-lg shadow-sm p-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="text-2xl">👥</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">用户总数</p>
					<p class="text-2xl font-semibold text-gray-900">{data.stats.totalUsers}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="text-2xl">📋</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">任务总数</p>
					<p class="text-2xl font-semibold text-gray-900">{data.stats.totalTasks}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="text-2xl">⏳</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">等待处理</p>
					<p class="text-2xl font-semibold text-yellow-600">{data.stats.pendingTasks}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="text-2xl">⚡</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">处理中</p>
					<p class="text-2xl font-semibold text-blue-600">{data.stats.processingTasks}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="text-2xl">✅</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">已完成</p>
					<p class="text-2xl font-semibold text-green-600">{data.stats.completedTasks}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-6">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="text-2xl">❌</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">处理失败</p>
					<p class="text-2xl font-semibold text-red-600">{data.stats.failedTasks}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- 操作面板 -->
	<div class="bg-white rounded-lg shadow-sm p-6 mb-8">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">系统操作</h2>
		
		<div class="space-y-4">
			<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
				<div>
					<h3 class="font-medium text-gray-900">处理待处理任务</h3>
					<p class="text-sm text-gray-600">手动触发处理所有等待中的任务</p>
				</div>
				<form method="POST" action="?/processTasks" use:enhance={handleProcessTasks}>
					<button
						type="submit"
						disabled={processing}
						class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
					>
						{#if processing}
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							处理中...
						{:else}
							开始处理
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- 快捷链接 -->
	<div class="bg-white rounded-lg shadow-sm p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<a
				href="/tasks"
				class="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
			>
				<div class="flex items-center">
					<div class="text-xl mr-3">📋</div>
					<div>
						<h3 class="font-medium text-gray-900">任务列表</h3>
						<p class="text-sm text-gray-600">查看所有任务</p>
					</div>
				</div>
			</a>

			<a
				href="/upload"
				class="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
			>
				<div class="flex items-center">
					<div class="text-xl mr-3">📁</div>
					<div>
						<h3 class="font-medium text-gray-900">文件上传</h3>
						<p class="text-sm text-gray-600">创建新任务</p>
					</div>
				</div>
			</a>

			<a
				href="/chat"
				class="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
			>
				<div class="flex items-center">
					<div class="text-xl mr-3">💬</div>
					<div>
						<h3 class="font-medium text-gray-900">智能对话</h3>
						<p class="text-sm text-gray-600">AI助手</p>
					</div>
				</div>
			</a>
		</div>
	</div>

	<!-- 消息显示 -->
	{#if form?.message}
		<div class="mt-4 p-4 rounded-md {form.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
			{form.message}
		</div>
	{/if}

	{#if data.error}
		<div class="mt-4 p-4 rounded-md bg-red-50 text-red-800">
			{data.error}
		</div>
	{/if}
</div>
