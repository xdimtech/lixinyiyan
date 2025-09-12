<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let form: ActionData;
</script>

<svelte:head>
	<title>用户登录</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<!-- 系统名称 -->
			<div class="text-center mb-8">
				<h1 class="text-2xl font-bold text-gray-900 mb-2">
					立心译言
				</h1>
				<p class="text-lg text-gray-600 font-medium">
					智能翻译管理系统
				</p>
				<div class="mt-4 w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full"></div>
			</div>
			
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				登录您的账户
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				还没有账户？
				<a href="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
					立即注册
				</a>
			</p>
		</div>

		<form class="mt-8 space-y-6" method="POST" action="?/login" use:enhance>
			<div class="space-y-4">
				<div class="relative group">
					<label for="username" class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
					<div class="relative">
						<input
							id="username"
							name="username"
							type="text"
							required
							class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ease-in-out hover:border-gray-400 bg-white shadow-sm"
							placeholder="请输入用户名"
						/>
						<div class="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-focus-within:opacity-20 transition-opacity duration-200 pointer-events-none"></div>
					</div>
				</div>
				<div class="relative group">
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1">密码</label>
					<div class="relative">
						<input
							id="password"
							name="password"
							type="password"
							required
							class="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ease-in-out hover:border-gray-400 bg-white shadow-sm"
							placeholder="请输入密码"
						/>
						<div class="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-focus-within:opacity-20 transition-opacity duration-200 pointer-events-none"></div>
					</div>
				</div>
			</div>

			{#if form?.message}
				<div class="text-red-600 text-sm text-center">
					{form.message}
				</div>
			{/if}

			<div>
				<button
					type="submit"
					class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
				>
					<span class="relative">登录</span>
					<div class="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
				</button>
			</div>
		</form>
	</div>
</div>
