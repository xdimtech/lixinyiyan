<script lang="ts">
import '../app.css';
import type { LayoutData } from './$types';
import { page } from '$app/stores';
import { enhance } from '$app/forms';

let { children, data }: { children: any; data: LayoutData } = $props();

// 公开页面（不需要登录的页面）
const publicPages = ['/login', '/register'];
const isPublicPage = $derived(publicPages.includes($page.url.pathname));

// 如果未登录且不在公开页面，需要显示登录提示
const needsAuth = $derived(!data.user && !isPublicPage);

// 导航菜单项
const navItems = [
	{ href: '/', label: '首页', icon: '🏠' },
	{ href: '/upload', label: '文件上传', icon: '📁' },
	{ href: '/tasks', label: '任务列表', icon: '📋' },
	{ href: '/chat', label: '智能对话', icon: '💬' }
];

// 管理员菜单项
const adminItems = [
	{ href: '/admin', label: '系统管理', icon: '⚙️' }
];
</script>

{#if needsAuth}
	<!-- 未登录用户重定向到登录页 -->
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<h2 class="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
			<a href="/login" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
				前往登录
			</a>
		</div>
	</div>
{:else if isPublicPage}
	<!-- 公开页面：登录/注册页面 -->
	{@render children()}
{:else}
	<!-- 已登录用户的主界面 -->
	<div class="min-h-screen bg-gray-50">
		<!-- 顶部导航栏 -->
		<nav class="bg-white shadow-sm border-b">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between h-16">
					<div class="flex items-center">
						<h1 class="text-xl font-semibold text-gray-900">智能识别翻译系统</h1>
					</div>
					<div class="flex items-center space-x-4">
						<span class="text-sm text-gray-700">欢迎，{data.user?.username}</span>
						<form method="POST" action="/logout?/logout" use:enhance>
							<button
								type="submit"
								class="text-sm text-gray-500 hover:text-gray-700"
							>
								退出登录
							</button>
						</form>
					</div>
				</div>
			</div>
		</nav>

		<div class="flex">
			<!-- 侧边栏 -->
			<aside class="w-64 bg-white shadow-sm min-h-screen">
				<nav class="mt-8">
					<div class="px-4 space-y-2">
						{#each navItems as item}
							<a
								href={item.href}
								class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
									{$page.url.pathname === item.href
									? 'bg-indigo-100 text-indigo-700'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
							>
								<span class="mr-3">{item.icon}</span>
								{item.label}
							</a>
						{/each}
						
						{#if data.user?.role === 'admin'}
							<div class="pt-4 mt-4 border-t border-gray-200">
								<div class="px-4 mb-2">
									<span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
										管理功能
									</span>
								</div>
								{#each adminItems as item}
									<a
										href={item.href}
										class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
											{$page.url.pathname === item.href
											? 'bg-red-100 text-red-700'
											: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
									>
										<span class="mr-3">{item.icon}</span>
										{item.label}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</nav>
			</aside>

			<!-- 主内容区域 -->
			<main class="flex-1 p-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}