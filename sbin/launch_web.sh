#!/bin/bash

# 确保脚本有执行权限
chmod +x "$0"

# 检查是否安装了zenity（图形化对话框工具）
if ! command -v zenity &> /dev/null; then
    echo "正在安装图形化工具zenity..."
    sudo apt update > /dev/null
    sudo apt install -y zenity > /dev/null
fi

# 获取脚本所在目录的上级目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 显示启动提示
zenity --info --title="Web服务启动器" --text="即将启动 Lixin 智能识别翻译系统\n\n项目路径: $PROJECT_ROOT\n\n请等待启动完成提示..." --width=400

# 检查必要工具
check_dependencies() {
    local missing_deps=()
    
    # 检查 bun 是否安装
    if ! command -v bun &> /dev/null; then
        missing_deps+=("bun")
    fi
    
    # 检查 node 是否安装（备用）
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        local deps_text=$(printf '%s\n' "${missing_deps[@]}")
        zenity --error --title="依赖检查失败" \
            --text="缺少必要的依赖项：\n$deps_text\n\n请先安装这些工具后重试。" \
            --width=300
        return 1
    fi
    
    return 0
}

# 检查依赖
if ! check_dependencies; then
    exit 1
fi

# 检查环境配置
if [ ! -f ".env" ]; then
    if zenity --question --title="环境配置" \
        --text="未找到 .env 配置文件\n\n是否使用默认配置继续启动？\n\n建议：复制 .env.example 到 .env 并配置数据库连接" \
        --width=400; then
        echo "使用默认配置启动..."
    else
        exit 0
    fi
fi

# 启动通知
zenity --notification --text="开始启动Web服务..."

# 设置环境变量
export NODE_ENV=production
export HOST=${HOST:-"0.0.0.0"}
export PORT=${PORT:-"3000"}
export BODY_SIZE_LIMIT=${BODY_SIZE_LIMIT:-"30M"}

# 创建日志文件
LOG_FILE="web_service.log"
ERROR_LOG_FILE="web_service_error.log"

# 创建必要目录
mkdir -p ~/data/lixin/{uploads,images,ocr,translate,logs,temp}

# 安装依赖（如果需要）
zenity --notification --text="检查并安装依赖..."
echo "$(date '+%Y-%m-%d %H:%M:%S') 开始安装依赖..." >> "$LOG_FILE"
if ! bun install --frozen-lockfile >> "$LOG_FILE" 2>&1; then
    zenity --error --title="依赖安装失败" \
        --text="依赖安装失败，请查看日志文件：$LOG_FILE" \
        --width=300
    exit 1
fi

# 构建应用
zenity --notification --text="构建应用中..."
echo "$(date '+%Y-%m-%d %H:%M:%S') 开始构建应用..." >> "$LOG_FILE"
if ! bun run build >> "$LOG_FILE" 2>&1; then
    zenity --error --title="构建失败" \
        --text="应用构建失败，请查看日志文件：$LOG_FILE" \
        --width=300
    exit 1
fi

# 启动Web服务
zenity --notification --text="启动Web服务..."
echo "$(date '+%Y-%m-%d %H:%M:%S') 启动Web服务..." >> "$LOG_FILE"

# 使用nohup在后台启动服务
nohup bun run start >> "$LOG_FILE" 2>> "$ERROR_LOG_FILE" &

# 记录服务的PID
WEB_PID=$!
echo "$(date '+%Y-%m-%d %H:%M:%S') Web服务PID: $WEB_PID" >> "$LOG_FILE"

# 将PID保存到文件，方便后续管理
echo $WEB_PID > web_service.pid

# 等待服务启动并检查状态
check_web_service() {
    local timeout=120  # 超时时间120秒
    local interval=3   # 检查间隔3秒
    local elapsed=0
    local port=${PORT:-3000}
    
    while [ $elapsed -lt $timeout ]; do
        # 检查端口是否监听
        if ss -tulpn | grep -q ":$port"; then
            # 额外检查HTTP响应
            if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" | grep -q "200\|404\|302"; then
                return 0  # 服务启动成功
            fi
        fi
        
        # 检查进程是否存在
        if ! ps -p $WEB_PID > /dev/null; then
            return 1  # 进程已退出
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    return 2  # 超时
}

# 显示启动进度
(
    echo "10" ; echo "# 检查服务启动状态..."
    check_web_service
    SERVICE_RESULT=$?
    echo "100" ; echo "# 启动检查完成"
) | zenity --progress --title="启动检查" --text="正在检查Web服务启动状态..." --percentage=0 --auto-close --width=400

# 准备结果信息
RESULT_TEXT=""
SERVICE_URL="http://$HOST:$PORT"

if [ $SERVICE_RESULT -eq 0 ]; then
    RESULT_TEXT="✅ Web服务启动成功！\n\n"
    RESULT_TEXT+="🌐 服务地址: $SERVICE_URL\n"
    RESULT_TEXT+="🔧 进程ID: $WEB_PID\n"
    RESULT_TEXT+="📁 项目路径: $PROJECT_ROOT\n"
    RESULT_TEXT+="📄 日志文件: $LOG_FILE\n\n"
    RESULT_TEXT+="💡 提示: 可以在浏览器中访问上述地址"
    
    # 成功启动后询问是否打开浏览器
    zenity --info --title="启动成功" --text="$RESULT_TEXT" --width=450
    
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
        else
            zenity --info --title="浏览器" \
                --text="请手动在浏览器中打开：\n$SERVICE_URL" \
                --width=350
        fi
    fi
    
else
    if [ $SERVICE_RESULT -eq 1 ]; then
        RESULT_TEXT="❌ Web服务启动失败，进程已退出\n\n"
    else
        RESULT_TEXT="⌛ Web服务启动超时\n\n"
    fi
    RESULT_TEXT+="📄 查看启动日志: $LOG_FILE\n"
    RESULT_TEXT+="📄 查看错误日志: $ERROR_LOG_FILE\n"
    RESULT_TEXT+="🔧 进程ID: $WEB_PID\n"
    
    zenity --error --title="启动失败" --text="$RESULT_TEXT" --width=400
fi

# 提供管理选项
while true; do
    ACTION=$(zenity --list --title="服务管理" \
        --text="Web服务管理选项：" \
        --column="操作" \
        "查看启动日志" \
        "查看错误日志" \
        "检查服务状态" \
        "停止服务" \
        "重启服务" \
        "退出" \
        --width=300 --height=350)
    
    case $ACTION in
        "查看启动日志")
            if [ -f "$LOG_FILE" ]; then
                if command -v gedit &> /dev/null; then
                    gedit "$LOG_FILE" &
                elif command -v kate &> /dev/null; then
                    kate "$LOG_FILE" &
                else
                    zenity --text-info --title="启动日志" --filename="$LOG_FILE" --width=800 --height=600
                fi
            else
                zenity --info --title="日志" --text="日志文件不存在：$LOG_FILE"
            fi
            ;;
        "查看错误日志")
            if [ -f "$ERROR_LOG_FILE" ]; then
                if command -v gedit &> /dev/null; then
                    gedit "$ERROR_LOG_FILE" &
                elif command -v kate &> /dev/null; then
                    kate "$ERROR_LOG_FILE" &
                else
                    zenity --text-info --title="错误日志" --filename="$ERROR_LOG_FILE" --width=800 --height=600
                fi
            else
                zenity --info --title="日志" --text="错误日志文件不存在：$ERROR_LOG_FILE"
            fi
            ;;
        "检查服务状态")
            if [ -f "web_service.pid" ]; then
                SAVED_PID=$(cat web_service.pid)
                if ps -p $SAVED_PID > /dev/null; then
                    PORT_STATUS=""
                    if ss -tulpn | grep -q ":${PORT:-3000}"; then
                        PORT_STATUS="✅ 端口监听正常"
                    else
                        PORT_STATUS="❌ 端口未监听"
                    fi
                    zenity --info --title="服务状态" \
                        --text="✅ 服务运行中\n\n🔧 进程ID: $SAVED_PID\n🌐 服务地址: $SERVICE_URL\n$PORT_STATUS" \
                        --width=350
                else
                    zenity --info --title="服务状态" --text="❌ 服务未运行" --width=250
                fi
            else
                zenity --info --title="服务状态" --text="❌ 未找到PID文件，服务可能未启动" --width=300
            fi
            ;;
        "停止服务")
            if [ -f "web_service.pid" ]; then
                SAVED_PID=$(cat web_service.pid)
                if ps -p $SAVED_PID > /dev/null; then
                    if zenity --question --title="确认停止" --text="确定要停止Web服务吗？\n\n进程ID: $SAVED_PID"; then
                        kill $SAVED_PID
                        sleep 2
                        if ! ps -p $SAVED_PID > /dev/null; then
                            zenity --info --title="停止服务" --text="✅ Web服务已停止" --width=250
                            rm -f web_service.pid
                        else
                            kill -9 $SAVED_PID
                            zenity --info --title="停止服务" --text="✅ Web服务已强制停止" --width=250
                            rm -f web_service.pid
                        fi
                    fi
                else
                    zenity --info --title="停止服务" --text="❌ 服务未运行" --width=250
                    rm -f web_service.pid
                fi
            else
                zenity --info --title="停止服务" --text="❌ 未找到PID文件，服务可能未启动" --width=300
            fi
            ;;
        "重启服务")
            if zenity --question --title="确认重启" --text="确定要重启Web服务吗？"; then
                # 停止现有服务
                if [ -f "web_service.pid" ]; then
                    SAVED_PID=$(cat web_service.pid)
                    if ps -p $SAVED_PID > /dev/null; then
                        kill $SAVED_PID
                        sleep 3
                        if ps -p $SAVED_PID > /dev/null; then
                            kill -9 $SAVED_PID
                        fi
                    fi
                    rm -f web_service.pid
                fi
                
                # 重新启动
                zenity --notification --text="重新启动Web服务..."
                nohup bun run start >> "$LOG_FILE" 2>> "$ERROR_LOG_FILE" &
                NEW_PID=$!
                echo $NEW_PID > web_service.pid
                
                zenity --info --title="重启完成" \
                    --text="✅ Web服务重启完成\n\n🔧 新进程ID: $NEW_PID\n🌐 服务地址: $SERVICE_URL" \
                    --width=350
            fi
            ;;
        "退出"|"")
            break
            ;;
    esac
done

echo "$(date '+%Y-%m-%d %H:%M:%S') 启动脚本执行完成" >> "$LOG_FILE"
