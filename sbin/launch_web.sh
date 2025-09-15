#!/bin/bash

# 🚀 简化的桌面Web服务启动器
# 直接调用 start-production.sh 脚本并提供浏览器提示

# 确保脚本有执行权限
chmod +x "$0"

# 检查是否安装了zenity（图形化对话框工具）
if ! command -v zenity &> /dev/null; then
    echo "正在安装图形化工具zenity..."
    sudo apt update > /dev/null 2>&1
    sudo apt install -y zenity > /dev/null 2>&1
fi

# 获取脚本所在目录的上级目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 检查 start-production.sh 是否存在
if [ ! -f "start-production.sh" ]; then
    zenity --error --title="启动失败" \
        --text="❌ 未找到 start-production.sh 脚本\n\n请确保该文件存在于项目根目录" \
        --width=400
    exit 1
fi

# 确保 start-production.sh 有执行权限
chmod +x start-production.sh

# 设置环境变量
export HOST=${HOST:-"localhost"}
export PORT=${PORT:-"3000"}
SERVICE_URL="http://$HOST:$PORT"

# 显示启动提示
zenity --info --title="Web服务启动器" \
    --text="即将启动 Lixin 智能识别翻译系统\n\n项目路径: $PROJECT_ROOT\n\n请等待启动完成..." \
    --width=400

# 启动通知
zenity --notification --text="正在启动Web服务..."

# 创建临时日志文件
TEMP_LOG=$(mktemp /tmp/lixin_web_XXXXXX.log)

# 在后台启动 start-production.sh 并记录日志
echo "$(date '+%Y-%m-%d %H:%M:%S') 开始启动Web服务..." > "$TEMP_LOG"
nohup ./start-production.sh >> "$TEMP_LOG" 2>&1 &
START_PID=$!

# 等待服务启动
check_service_startup() {
    local timeout=60  # 超时时间60秒
    local interval=2  # 检查间隔2秒
    local elapsed=0
    local port=${PORT:-3000}
    
    while [ $elapsed -lt $timeout ]; do
        # 检查进程是否还在运行
        if ! ps -p $START_PID > /dev/null 2>&1; then
            # 进程已结束，检查是否是正常启动完成
            sleep 2
            if ss -tulpn 2>/dev/null | grep -q ":$port"; then
                return 0  # 服务启动成功
            else
                return 1  # 进程异常退出
            fi
        fi
        
        # 检查端口是否已监听
        if ss -tulpn 2>/dev/null | grep -q ":$port"; then
            return 0  # 服务启动成功
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    return 2  # 超时
}

# 显示启动进度
(
    echo "20" ; echo "# 正在启动服务..."
    check_service_startup
    STARTUP_RESULT=$?
    echo "100" ; echo "# 启动检查完成"
) | zenity --progress --title="启动进度" --text="正在启动Web服务..." --percentage=0 --auto-close --width=400

# 处理启动结果
if [ $STARTUP_RESULT -eq 0 ]; then
    # 启动成功
    SUCCESS_TEXT="✅ Web服务启动成功！\n\n"
    SUCCESS_TEXT+="🌐 服务地址: $SERVICE_URL\n"
    SUCCESS_TEXT+="📁 项目路径: $PROJECT_ROOT\n\n"
    SUCCESS_TEXT+="💡 请在浏览器中访问上述地址使用系统"
    
    zenity --info --title="启动成功" --text="$SUCCESS_TEXT" --width=450
    
    # 询问是否打开浏览器
    if zenity --question --title="打开浏览器" \
        --text="Web服务已成功启动！\n\n是否要在浏览器中打开服务？\n\n地址: $SERVICE_URL" \
        --width=400; then
        # 尝试打开浏览器
        if command -v xdg-open &> /dev/null; then
            xdg-open "$SERVICE_URL" &
        elif command -v firefox &> /dev/null; then
            firefox "$SERVICE_URL" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "$SERVICE_URL" &
        elif command -v chromium-browser &> /dev/null; then
            chromium-browser "$SERVICE_URL" &
        else
            zenity --info --title="浏览器" \
                --text="请手动在浏览器中打开：\n\n$SERVICE_URL" \
                --width=350
        fi
    fi
    
    # 显示管理提示
    zenity --info --title="服务管理" \
        --text="服务已在后台运行\n\n要停止服务，请在终端中使用 Ctrl+C\n或关闭相关的终端窗口" \
        --width=400

else
    # 启动失败
    ERROR_TEXT="❌ Web服务启动失败\n\n"
    if [ $STARTUP_RESULT -eq 1 ]; then
        ERROR_TEXT+="原因: 启动脚本异常退出\n"
    else
        ERROR_TEXT+="原因: 启动超时\n"
    fi
    ERROR_TEXT+="📄 查看日志文件: $TEMP_LOG\n\n"
    ERROR_TEXT+="💡 建议检查:\n"
    ERROR_TEXT+="- bun 是否正确安装\n"
    ERROR_TEXT+="- 依赖是否完整\n"
    ERROR_TEXT+="- 端口是否被占用"
    
    zenity --error --title="启动失败" --text="$ERROR_TEXT" --width=450
    
    # 询问是否查看日志
    if zenity --question --title="查看日志" \
        --text="是否要查看详细的启动日志？" \
        --width=300; then
        if command -v gedit &> /dev/null; then
            gedit "$TEMP_LOG" &
        elif command -v kate &> /dev/null; then
            kate "$TEMP_LOG" &
        else
            zenity --text-info --title="启动日志" --filename="$TEMP_LOG" --width=800 --height=600
        fi
    fi
fi

# 清理临时文件（延迟删除，以便用户查看日志）
(sleep 300 && rm -f "$TEMP_LOG") &

echo "桌面启动脚本执行完成"
