#!/bin/bash

# 🚀 Bun 生产环境启动脚本

set -e  # 遇到错误立即退出

echo "🔧 准备启动 Lixin 智能识别翻译系统..."

# 检查 bun 是否安装
if ! command -v bun &> /dev/null; then
    echo "❌ 错误: 未找到 bun，请先安装 bun"
    echo "💡 安装命令: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# 检查环境配置
if [ ! -f ".env" ]; then
    echo "⚠️  警告: 未找到 .env 文件，将使用默认配置"
    echo "💡 建议: 复制 .env.example 到 .env 并配置数据库连接"
fi

# 设置生产环境变量
export NODE_ENV=production
export HOST=${HOST:-"0.0.0.0"}
export PORT=${PORT:-"3000"}
export BODY_SIZE_LIMIT=${BODY_SIZE_LIMIT:-"30M"}

echo "📦 安装依赖..."
bun install --frozen-lockfile

echo "🏗️  构建应用..."
bun run build

echo "🗂️  创建必要目录..."
mkdir -p ~/data/lixin/{uploads,images,ocr,translate,logs,temp}

echo "🌟 启动生产服务器..."
echo "📍 地址: http://$HOST:$PORT"
echo "🛑 按 Ctrl+C 停止服务"

# 使用 bun 运行构建后的应用
exec bun run start
