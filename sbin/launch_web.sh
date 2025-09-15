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

# 加载 bun 环境变量
if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
fi

if [ -f "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
fi

# 设置环境变量
export HOST=${HOST:-"0.0.0.0"}
export PORT=${PORT:-"3000"}

# 获取局域网IP地址用于SERVICE_URL显示
get_local_ip() {
    # 尝试多种方式获取局域网IP
    local ip=""
    
    # 方法1: 使用 ip route (Linux)
    if command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' | head -1)
    fi
    
    # 方法2: 使用 hostname -I (Linux)
    if [ -z "$ip" ] && command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    
    # 方法3: 使用 ifconfig (macOS/Linux)
    if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | grep -v '169.254.' | awk '{print $2}' | head -1)
    fi
    
    # 方法4: 使用 route 和 netstat (备用)
    if [ -z "$ip" ] && command -v route >/dev/null 2>&1; then
        ip=$(route get default 2>/dev/null | grep interface | awk '{print $2}' | xargs ifconfig 2>/dev/null | grep 'inet ' | awk '{print $2}' | head -1)
    fi
    
    # 如果都获取不到，使用默认值
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo "$ip"
}

# 获取局域网IP用于显示
LOCAL_IP=$(get_local_ip)
SERVICE_URL="http://$LOCAL_IP:$PORT"

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
echo "$(date '+%Y-%m-%d %H:%M:%S') 服务监听地址: $HOST:$PORT" >> "$TEMP_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') 局域网访问地址: $SERVICE_URL" >> "$TEMP_LOG"
nohup ./start-production.sh >> "$TEMP_LOG" 2>&1 &
START_PID=$!

# 等待服务启动
check_service_startup() {
    local timeout=60  # 超时时间60秒
    local interval=2  # 检查间隔2秒
    local elapsed=0
    local port=${PORT:-3000}
    
    echo "开始检测服务启动状态，端口: $port" >> "$TEMP_LOG"
    
    while [ $elapsed -lt $timeout ]; do
        # 检查端口是否已监听 (兼容Ubuntu和macOS)
        local port_listening=false
        
        if command -v ss >/dev/null 2>&1; then
            # Ubuntu/Linux 使用 ss
            if ss -tulpn 2>/dev/null | grep -q ":$port"; then
                port_listening=true
            fi
        elif command -v lsof >/dev/null 2>&1; then
            # macOS 使用 lsof
            if lsof -i :$port 2>/dev/null | grep -q LISTEN; then
                port_listening=true
            fi
        elif command -v netstat >/dev/null 2>&1; then
            # 备用方案使用 netstat
            if netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
                port_listening=true
            fi
        fi
        
        if [ "$port_listening" = true ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') 端口 $port 检测成功，服务启动完成" >> "$TEMP_LOG"
            return 0  # 服务启动成功
        fi
        
        # 检查启动脚本进程是否还在运行
        if ! ps -p $START_PID > /dev/null 2>&1; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') 启动脚本进程 $START_PID 已结束，检查是否有bun进程在运行" >> "$TEMP_LOG"
            # 启动脚本已结束，检查是否有bun进程接管
            if pgrep -f "bun.*build/index.js" > /dev/null 2>&1; then
                echo "$(date '+%Y-%m-%d %H:%M:%S') 发现bun进程，继续等待端口监听" >> "$TEMP_LOG"
                # 继续检查端口，不立即返回错误
            else
                echo "$(date '+%Y-%m-%d %H:%M:%S') 未发现bun进程，启动可能失败" >> "$TEMP_LOG"
                return 1  # 进程异常退出
            fi
        fi
        
        echo "$(date '+%Y-%m-%d %H:%M:%S') 等待中... 已耗时 ${elapsed}s" >> "$TEMP_LOG"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') 启动检测超时" >> "$TEMP_LOG"
    return 2  # 超时
}

# 显示启动进度并执行检查
TEMP_RESULT_FILE=$(mktemp /tmp/lixin_startup_result_XXXXXX)

(
    echo "20" ; echo "# 正在启动服务..."
    check_service_startup
    echo $? > "$TEMP_RESULT_FILE"
    echo "100" ; echo "# 启动检查完成"
) | zenity --progress --title="启动进度" --text="正在启动Web服务..." --percentage=0 --auto-close --width=400

# 读取启动结果
STARTUP_RESULT=$(cat "$TEMP_RESULT_FILE" 2>/dev/null || echo "2")
rm -f "$TEMP_RESULT_FILE"

echo "检测结果: $STARTUP_RESULT (0=成功, 1=失败, 2=超时)" >> "$TEMP_LOG"

# 处理启动结果
if [ $STARTUP_RESULT -eq 0 ]; then
    # 启动成功
    SUCCESS_TEXT="✅ Web服务启动成功！\n\n"
    SUCCESS_TEXT+="🌐 局域网访问地址: $SERVICE_URL\n"
    SUCCESS_TEXT+="📁 项目路径: $PROJECT_ROOT\n\n"
    SUCCESS_TEXT+="💡 局域网内的其他设备可以通过上述地址访问系统\n"
    SUCCESS_TEXT+="📱 支持手机、平板等移动设备访问"
    
    zenity --info --title="启动成功" --text="$SUCCESS_TEXT" --width=450
    
    # 询问是否打开浏览器
    if zenity --question --title="打开浏览器" \
        --text="Web服务已成功启动！\n\n是否要在浏览器中打开服务？\n\n局域网访问地址: $SERVICE_URL" \
        --width=450; then
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
