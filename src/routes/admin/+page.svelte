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

<div class="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
	<div class="max-w-6xl mx-auto">
		<h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8" style="text-align: left !important;">系统管理</h1>

		<!-- 系统统计 -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
							<div class="text-white text-xl font-bold">U</div>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-semibold text-gray-600">用户总数</p>
						<p class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{data.stats.totalUsers}</p>
					</div>
				</div>
			</div>

			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center">
							<div class="text-white text-xl font-bold">T</div>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-semibold text-gray-600">任务总数</p>
						<p class="text-3xl font-bold text-gray-900">{data.stats.totalTasks}</p>
					</div>
				</div>
			</div>

			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
							<div class="text-white text-xl font-bold">W</div>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-semibold text-gray-600">等待处理</p>
						<p class="text-3xl font-bold text-amber-600">{data.stats.pendingTasks}</p>
					</div>
				</div>
			</div>

			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
							<div class="text-white text-xl font-bold">P</div>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-semibold text-gray-600">处理中</p>
						<p class="text-3xl font-bold text-blue-600">{data.stats.processingTasks}</p>
					</div>
				</div>
			</div>

			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
							<div class="text-white text-xl font-bold">C</div>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-semibold text-gray-600">已完成</p>
						<p class="text-3xl font-bold text-green-600">{data.stats.completedTasks}</p>
					</div>
				</div>
			</div>

			<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
							<div class="text-white text-xl font-bold">F</div>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-semibold text-gray-600">处理失败</p>
						<p class="text-3xl font-bold text-red-600">{data.stats.failedTasks}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- 操作面板 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-8">
			<h2 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">系统操作</h2>
			
			<div class="space-y-4">
				<div class="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200/50 rounded-xl hover:shadow-lg transition-all duration-200">
					<div>
						<h3 class="font-semibold text-gray-900 text-lg">处理待处理任务</h3>
						<p class="text-sm text-gray-600 mt-1">手动触发处理所有等待中的任务</p>
					</div>
					<form method="POST" action="?/processTasks" use:enhance={handleProcessTasks}>
						<button
							type="submit"
							disabled={processing}
							class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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

		<!-- 管理功能 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 mb-8">
			<h2 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">管理功能</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<a
					href="/admin/users"
					class="block p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-300 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
				>
					<div class="flex items-center">
						<div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4">
							<div class="text-white text-lg font-bold">👥</div>
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">用户管理</h3>
							<p class="text-sm text-gray-600">管理系统用户</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/prompts"
					class="block p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-xl hover:from-amber-100 hover:to-amber-200 hover:border-amber-300 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
				>
					<div class="flex items-center">
						<div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-4">
							<div class="text-white text-lg font-bold">📝</div>
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">提示词管理</h3>
							<p class="text-sm text-gray-600">配置OCR和翻译提示词</p>
						</div>
					</div>
				</a>
			</div>
		</div>

		<!-- 快捷链接 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
			<h2 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">快捷操作</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<a
					href="/tasks"
					class="block p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl hover:from-slate-100 hover:to-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
				>
					<div class="flex items-center">
						<div class="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center mr-4">
							<div class="text-white text-lg font-bold">T</div>
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">任务列表</h3>
							<p class="text-sm text-gray-600">查看所有任务</p>
						</div>
					</div>
				</a>

				<a
					href="/upload"
					class="block p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-200 hover:border-blue-300 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
				>
					<div class="flex items-center">
						<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-4">
							<div class="text-white text-lg font-bold">U</div>
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">文件上传</h3>
							<p class="text-sm text-gray-600">创建新任务</p>
						</div>
					</div>
				</a>

				<a
					href="/chat"
					class="block p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl hover:from-purple-100 hover:to-purple-200 hover:border-purple-300 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
				>
					<div class="flex items-center">
						<div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
							<div class="text-white text-lg font-bold">C</div>
						</div>
						<div>
							<h3 class="font-semibold text-gray-900">智能对话</h3>
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
</div>
