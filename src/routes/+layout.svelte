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
	{ href: '/chat', label: '智能对话', icon: '💬' },
	{ href: '/pdf-split', label: 'PDF拆分', icon: '🔧' }
];

// 管理员菜单项
const adminItems = [
	{ href: '/admin', label: '系统管理', icon: '⚙️' },
	{ href: '/admin/users', label: '用户管理', icon: '👥' }
];
</script>

{#if needsAuth}
	<!-- 未登录用户重定向到登录页 -->
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<h2 class="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
			<a href="/login" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700" style="color: white !important; text-decoration: none;">
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
		<nav class="bg-white backdrop-blur-md bg-opacity-95 shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between h-16">
					<div class="flex items-center space-x-3">
						<!-- Logo/品牌图标 -->
						<div class="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
							<span class="text-white text-sm font-bold">立</span>
						</div>
						<h1 class="text-xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
							立心译言
						</h1>
					</div>
					<div class="flex items-center space-x-6">
						<!-- 用户信息 -->
						<div class="flex items-center space-x-3">
							<div class="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full">
								<span class="text-gray-600 text-sm font-medium">
									{data.user?.username?.charAt(0)?.toUpperCase() || 'U'}
								</span>
							</div>
							<span class="text-sm font-medium text-gray-700">
								欢迎，<span class="text-indigo-600">{data.user?.username}</span>
							</span>
						</div>
						<!-- 退出登录按钮 -->
						<form method="POST" action="/logout?/logout" use:enhance>
							<button
								type="submit"
								class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all duration-200 ease-in-out"
							>
								<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
								</svg>
								退出登录
							</button>
						</form>
					</div>
				</div>
			</div>
		</nav>

		<div class="flex h-screen pt-16">
			<!-- 侧边栏 -->
			<aside class="w-64 bg-white shadow-sm h-full overflow-y-auto">
				<nav class="mt-8">
					<div class="px-4 space-y-2">
						{#each navItems as item}
							<a
								href={item.href}
								class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
									{$page.url.pathname === item.href
									? 'bg-indigo-100 text-indigo-700'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
								style="text-decoration: none; {$page.url.pathname === item.href ? 'color: rgb(67 56 202) !important;' : 'color: rgb(75 85 99) !important;'}"
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
										{$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/admin')
										? 'bg-indigo-100 text-indigo-700'
										: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
									style="text-decoration: none; {$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/admin') ? 'color: rgb(67 56 202) !important;' : 'color: rgb(75 85 99) !important;'}"
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
			<main class="flex-1 p-8 h-full overflow-y-auto">
				{@render children()}
			</main>
		</div>
	</div>
{/if}