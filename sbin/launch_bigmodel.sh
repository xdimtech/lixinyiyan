#!/bin/bash

# 确保脚本有执行权限
chmod +x "$0"

# 检查是否安装了zenity（图形化对话框工具）
if ! command -v zenity &> /dev/null; then
    echo "正在安装图形化工具zenity..."
    sudo apt update > /dev/null
    sudo apt install -y zenity > /dev/null
fi

# 进入到目录 /home/lixin/modelscope/
cd /home/lixin/modelscope/

# 初始化conda环境变量 - 从 ~/.bashrc 中加载conda配置
echo "正在初始化conda环境..."
if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
    echo "已加载 ~/.bashrc 中的conda配置"
else
    echo "警告: ~/.bashrc 文件不存在"
fi

# 显式初始化conda for bash
echo "正在执行conda init..."
if command -v conda &> /dev/null; then
    # 运行conda init bash来初始化当前shell
    eval "$(conda shell.bash hook)"
    echo "conda shell初始化完成"
else
    echo "错误: 找不到conda命令"
    zenity --error --title="环境错误" --text="找不到conda命令\n请检查conda是否正确安装" --width=300
    exit 1
fi

# 执行conda activate python12
echo "正在激活python12环境..."
if conda activate python12; then
    echo "成功激活python12环境"
else
    echo "错误: 无法激活python12环境，请检查环境是否存在"
    # 显示可用的conda环境
    echo "可用的conda环境："
    conda env list
    zenity --error --title="环境错误" --text="无法激活python12环境\n请检查环境是否存在\n查看终端输出获取可用环境列表" --width=300
    exit 1
fi

# 显示启动提示
zenity --info --title="大模型服务启动器" --text="即将启动文本识别和文本翻译服务\n\n请等待启动完成提示..." --width=300

# 启动第一个服务
zenity --notification --text="开始启动翻译服务..."

# 获取conda环境中vllm的完整路径
CONDA_ENV_PATH=$(conda info --base)/envs/python12
echo "使用conda环境路径: $CONDA_ENV_PATH"
VLLM_PATH="$CONDA_ENV_PATH/bin/vllm"

echo "检查vllm路径: $VLLM_PATH"
if [ -f "$VLLM_PATH" ]; then
    echo "找到vllm: $VLLM_PATH"
else
    echo "在 $VLLM_PATH 未找到vllm，尝试激活环境后查找..."
    # 激活环境后查找vllm路径
    VLLM_PATH=$(bash -c "source ~/.bashrc; eval \"\$(conda shell.bash hook)\"; conda activate python12; which vllm")
    echo "动态查找到vllm路径: $VLLM_PATH"
fi

# 使用绝对路径启动第一个服务
CUDA_VISIBLE_DEVICES=1 nohup bash -c "
export PATH=\"$CONDA_ENV_PATH/bin:\$PATH\"
export CONDA_DEFAULT_ENV=python12
export CONDA_PREFIX=\"$CONDA_ENV_PATH\"
\"$VLLM_PATH\" serve /home/modelscope/models/Qwen/Qwen3-14B-FP8 \
    --served-model-name Qwen/Qwen3-14B-FP8 \
    --reasoning-parser qwen3 \
    --port 8003 \
    --host 127.0.0.1 \
    --gpu-memory-utilization 0.95 \
    --max-num-batched-tokens 4096 \
    --max-num-seqs 2 \
    --max-model-len 32768
" > vllm_qwen3.log 2>&1 &

# 记录第一个服务的PID
PID1=$!

# 等待服务启动并检查状态
check_service1() {
    local timeout=300  # 超时时间300秒
    local interval=5   # 检查间隔5秒
    local elapsed=0
    local port=8003
    
    echo "开始检测翻译服务启动状态，端口: $port"
    
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
            echo "端口 $port 检测成功，翻译服务启动完成"
            return 0  # 服务启动成功
        fi
        
        # 检查进程是否存在
        if ! ps -p $PID1 > /dev/null 2>&1; then
            echo "翻译服务进程 $PID1 已结束，检查是否有vllm进程在运行"
            # 检查是否有vllm进程接管
            if pgrep -f "vllm.*8003" > /dev/null 2>&1; then
                echo "发现vllm翻译进程，继续等待端口监听"
                # 继续检查端口，不立即返回错误
            else
                echo "未发现vllm翻译进程，启动可能失败"
                return 1  # 进程异常退出
            fi
        fi
        
        echo "等待翻译服务中... 已耗时 ${elapsed}s"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    echo "翻译服务启动检测超时"
    return 2  # 超时
}

# 启动第二个服务
zenity --notification --text="开始启动识别服务..."

# 使用绝对路径启动第二个服务
CUDA_VISIBLE_DEVICES=0 nohup bash -c "
export PATH=\"$CONDA_ENV_PATH/bin:\$PATH\"
export CONDA_DEFAULT_ENV=python12
export CONDA_PREFIX=\"$CONDA_ENV_PATH\"
\"$VLLM_PATH\" serve /home/modelscope/Qwen/Qwen2___5-VL-7B-Instruct \
 --served-model-name Qwen/Qwen2.5-VL-7B-Instruct \
 --port 8002 \
 --host 127.0.0.1 \
 --dtype bfloat16 \
 --gpu-memory-utilization 0.95 \
 --max-num-batched-tokens 4096 \
 --max-num-seqs 2 \
 --max-model-len 32768 \
 --limit-mm-per-prompt '{\"image\": 1, \"video\": 0}'
" > vllm_qwen_vl.log 2>&1 &

# 记录第二个服务的PID
PID2=$!

# 等待服务启动并检查状态
check_service2() {
    local timeout=300  # 超时时间300秒
    local interval=5   # 检查间隔5秒
    local elapsed=0
    local port=8002
    
    echo "开始检测识别服务启动状态，端口: $port"
    
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
            echo "端口 $port 检测成功，识别服务启动完成"
            return 0  # 服务启动成功
        fi
        
        # 检查进程是否存在
        if ! ps -p $PID2 > /dev/null 2>&1; then
            echo "识别服务进程 $PID2 已结束，检查是否有vllm进程在运行"
            # 检查是否有vllm进程接管
            if pgrep -f "vllm.*8002" > /dev/null 2>&1; then
                echo "发现vllm识别进程，继续等待端口监听"
                # 继续检查端口，不立即返回错误
            else
                echo "未发现vllm识别进程，启动可能失败"
                return 1  # 进程异常退出
            fi
        fi
        
        echo "等待识别服务中... 已耗时 ${elapsed}s"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    echo "识别服务启动检测超时"
    return 2  # 超时
}

# 并行检查两个服务的启动状态
check_service1 &
check_service2 &

# 等待检查完成
wait %1; RESULT1=$?
wait %2; RESULT2=$?

# 准备结果信息
RESULT_TEXT=""

if [ $RESULT1 -eq 0 ]; then
    RESULT_TEXT+="✅ 大模型翻译服务启动成功 (端口: 8003)\n"
else
    if [ $RESULT1 -eq 1 ]; then
        RESULT_TEXT+="❌ 大模型翻译服务启动失败，进程已退出\n"
    else
        RESULT_TEXT+="⌛ 大模型翻译服务启动超时\n"
    fi
fi

if [ $RESULT2 -eq 0 ]; then
    RESULT_TEXT+="✅ 大模型识别服务启动成功 (端口: 8002)\n"
else
    if [ $RESULT2 -eq 1 ]; then
        RESULT_TEXT+="❌ 大模型识别服务启动失败，进程已退出\n"
    else
        RESULT_TEXT+="⌛ 大模型识别服务启动超时\n"
    fi
fi

# 显示最终结果
zenity --info --title="启动结果" --text="$RESULT_TEXT" --width=400

# 提供查看日志的选项
if zenity --question --title="查看日志" --text="是否要查看日志文件？" --width=300; then
    # 让用户选择查看哪个日志
    LOG_FILE=$(zenity --list --title="选择日志文件" --text="请选择要查看的日志文件：" \
        --column="日志文件" "vllm_qwen3.log" "vllm_qwen_vl.log" --width=400)
    
    if [ -n "$LOG_FILE" ] && [ -f "$LOG_FILE" ]; then
        # 使用gedit打开日志文件
        gedit "$LOG_FILE" &
    fi
fi
