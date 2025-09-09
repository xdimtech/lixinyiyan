<script lang="ts">
	// No data needed for home page
</script>

<svelte:head>
	<title>立心译言</title>
	<meta name="description" content="PDF文档智能识别翻译管理系统" />
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="text-center mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-4">
			欢迎使用立心译言
		</h1>
		<p class="text-xl text-gray-600">
			上传PDF文档，自动识别文字并翻译为民国风格中文
		</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- 功能卡片 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="text-center">
				<div class="text-4xl mb-4">📁</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">文件上传</h3>
				<p class="text-gray-600 mb-4">上传PDF文件，选择处理方式</p>
				<a
					href="/upload"
					class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
				>
					开始上传
				</a>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="text-center">
				<div class="text-4xl mb-4">📋</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">任务管理</h3>
				<p class="text-gray-600 mb-4">查看处理进度和下载结果</p>
				<a
					href="/tasks"
					class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
				>
					查看任务
				</a>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="text-center">
				<div class="text-4xl mb-4">💬</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">智能对话</h3>
				<p class="text-gray-600 mb-4">与AI助手进行智能对话</p>
				<a
					href="/chat"
					class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
				>
					开始对话
				</a>
			</div>
		</div>
	</div>

	<div class="mt-12 bg-white rounded-lg shadow-md p-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-4">系统功能</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="flex items-start space-x-3">
				<div class="text-green-500 text-xl">✓</div>
				<div>
					<h4 class="font-semibold text-gray-900">PDF转图片</h4>
					<p class="text-gray-600">自动将PDF文档拆分为单页图片</p>
				</div>
			</div>
			<div class="flex items-start space-x-3">
				<div class="text-green-500 text-xl">✓</div>
				<div>
					<h4 class="font-semibold text-gray-900">OCR文字识别</h4>
					<p class="text-gray-600">智能识别图片中的文字内容</p>
				</div>
			</div>
			<div class="flex items-start space-x-3">
				<div class="text-green-500 text-xl">✓</div>
				<div>
					<h4 class="font-semibold text-gray-900">民国风格翻译</h4>
					<p class="text-gray-600">将识别文字翻译为民国时期表达风格</p>
				</div>
			</div>
			<div class="flex items-start space-x-3">
				<div class="text-green-500 text-xl">✓</div>
				<div>
					<h4 class="font-semibold text-gray-900">批量处理</h4>
					<p class="text-gray-600">支持多用户同时提交处理任务</p>
				</div>
			</div>
		</div>
	</div>
</div>