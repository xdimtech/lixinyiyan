<script lang="ts">
	// No data needed for home page
</script>

<svelte:head>
	<title>立心译言</title>
	<meta name="description" content="PDF文档智能识别翻译管理系统" />
</svelte:head>

<!-- 背景装饰 -->
<div class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 -z-10"></div>
<div class="absolute inset-0 opacity-30 -z-10" style="background-image: radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.3) 1px, transparent 0); background-size: 20px 20px;"></div>

<div class="max-w-7xl mx-auto relative h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
	<!-- 头部介绍区域 -->
	<div class="text-center mb-4 pt-2 flex-shrink-0">
		<div class="mb-4">
			<div class="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
				<span class="text-white text-lg font-bold">立</span>
			</div>
		</div>
		<h1 class="text-2xl font-bold mb-2">
			<span class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent">
				欢迎使用立心译言
			</span>
		</h1>
		<p class="text-base text-gray-600 max-w-2xl mx-auto">
			专业的PDF文档智能识别翻译管理系统<br>
			<span class="text-indigo-600 font-medium">轻松上传 • 智能识别 • 精准翻译</span>
		</p>
	</div>

	<!-- 功能卡片区域 -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
		<!-- 文件上传卡片 -->
		<div class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl p-4 transition-all duration-300 hover:-translate-y-2 border border-gray-100">
			<div class="text-center">
				<div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
				</div>
				<h3 class="text-base font-bold text-gray-900 mb-1">文件上传</h3>
				<p class="text-gray-600 mb-3 text-sm">上传PDF文件，选择处理方式，开启智能翻译之旅</p>
				<a
					href="/upload"
					class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
					style="color: white !important; text-decoration: none;"
				>
					开始上传
					<svg class="w-4 h-4 ml-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>

		<!-- 任务管理卡片 -->
		<div class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl p-4 transition-all duration-300 hover:-translate-y-2 border border-gray-100">
			<div class="text-center">
				<div class="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
					</svg>
				</div>
				<h3 class="text-base font-bold text-gray-900 mb-1">任务管理</h3>
				<p class="text-gray-600 mb-3 text-sm">实时查看处理进度，轻松下载翻译结果</p>
				<a
					href="/tasks"
					class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
					style="color: white !important; text-decoration: none;"
				>
					查看任务
					<svg class="w-4 h-4 ml-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>

		<!-- 智能对话卡片 -->
		<div class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl p-4 transition-all duration-300 hover:-translate-y-2 border border-gray-100">
			<div class="text-center">
				<div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
					<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
					</svg>
				</div>
				<h3 class="text-base font-bold text-gray-900 mb-1">智能对话</h3>
				<p class="text-gray-600 mb-3 text-sm">与AI助手智能对话，获得专业翻译建议</p>
				<a
					href="/chat"
					class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 font-medium rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
					style="color: white !important; text-decoration: none;"
				>
					开始对话
					<svg class="w-4 h-4 ml-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- 系统功能展示区域 -->
	<div class="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 flex-1 overflow-y-auto">
		<div class="text-center mb-6">
			<h2 class="text-xl font-bold mb-2">
				<span class="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
					系统核心功能
				</span>
			</h2>
			<p class="text-gray-600 text-sm">专业的AI驱动翻译处理流程</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="group flex items-start space-x-3 p-3 rounded-2xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-300">
				<div class="flex-shrink-0">
					<div class="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
				</div>
				<div class="flex-1">
					<h4 class="font-bold text-gray-900 text-sm mb-1">PDF智能拆分</h4>
					<p class="text-gray-600 text-xs">自动将PDF文档精确拆分为高质量单页图片，保持原始格式与清晰度</p>
				</div>
			</div>
			
			<div class="group flex items-start space-x-3 p-3 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
				<div class="flex-shrink-0">
					<div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
					</div>
				</div>
				<div class="flex-1">
					<h4 class="font-bold text-gray-900 text-sm mb-1">OCR智能识别</h4>
					<p class="text-gray-600 text-xs">采用先进OCR技术，高精度识别图片中的文字内容，支持多种语言</p>
				</div>
			</div>
			
			<div class="group flex items-start space-x-3 p-3 rounded-2xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
				<div class="flex-shrink-0">
					<div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
						</svg>
					</div>
				</div>
				<div class="flex-1">
					<h4 class="font-bold text-gray-900 text-sm mb-1">民国风格翻译</h4>
					<p class="text-gray-600 text-xs">专业AI翻译引擎，将现代文字转换为典雅的民国时期表达风格</p>
				</div>
			</div>
			
			<div class="group flex items-start space-x-3 p-3 rounded-2xl hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-300">
				<div class="flex-shrink-0">
					<div class="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
				</div>
				<div class="flex-1">
					<h4 class="font-bold text-gray-900 text-sm mb-1">高效批量处理</h4>
					<p class="text-gray-600 text-xs">支持多用户并发处理，智能任务调度，高效完成大批量翻译工作</p>
				</div>
			</div>
		</div>
		
		<!-- 底部装饰 -->
		<div class="mt-6 pt-4 border-t border-gray-100">
			<div class="flex justify-center items-center flex-wrap gap-x-4 gap-y-2 text-gray-400">
				<div class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-indigo-400 rounded-full"></div>
					<span class="text-sm">专业可靠</span>
				</div>
				<div class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-purple-400 rounded-full"></div>
					<span class="text-sm">安全高效</span>
				</div>
				<div class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-blue-400 rounded-full"></div>
					<span class="text-sm">智能便捷</span>
				</div>
				<div class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-green-400 rounded-full"></div>
					<span class="text-sm">大模型应用</span>
				</div>
				<div class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-orange-400 rounded-full"></div>
					<span class="text-sm">人工智能+新质生产力</span>
				</div>
			</div>
			
			<!-- 技术支持信息 -->
			<div class="mt-3 text-center">
				<p class="text-sm text-gray-500">
					技术支持：<span class="font-medium text-gray-600">广州鲸浪科技有限公司</span>
				</p>
			</div>
		</div>
	</div>
</div>