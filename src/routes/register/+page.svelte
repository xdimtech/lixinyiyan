<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let form: ActionData;
</script>

<svelte:head>
	<title>用户注册</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				创建新账户
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				已有账户？
				<a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
					立即登录
				</a>
			</p>
		</div>

		<form class="mt-8 space-y-6" method="POST" action="?/register" use:enhance>
			<div class="rounded-md shadow-sm -space-y-px">
				<div>
					<label for="username" class="sr-only">用户名</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="用户名"
					/>
				</div>
				<div>
					<label for="password" class="sr-only">密码</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="密码"
					/>
				</div>
				<div>
					<label for="confirmPassword" class="sr-only">确认密码</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="确认密码"
					/>
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
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					注册
				</button>
			</div>
		</form>
	</div>
</div>
