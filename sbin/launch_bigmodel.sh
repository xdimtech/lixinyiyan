#!/bin/bash

# 确保脚本有执行权限
chmod +x "$0"

# 检查是否安装了zenity（图形化对话框工具）
if ! command -v zenity &> /dev/null; then
    echo "正在安装图形化工具zenity..."
    sudo apt update > /dev/null
    sudo apt install -y zenity > /dev/null
fi

# 进入到目录 /home/modelscope/
cd /home/modelscope/

# 然环境变量生效
if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
fi
# 执行conda activate python12
conda activate python12

# 显示启动提示
zenity --info --title="大模型服务启动器" --text="即将启动文本识别和文本翻译服务\n\n请等待启动完成提示..." --width=300

# 启动第一个服务
zenity --notification --text="开始启动翻译服务..."

CUDA_VISIBLE_DEVICES=1 nohup vllm serve /home/modelscope/models/Qwen/Qwen3-14B-FP8 \
    --served-model-name Qwen/Qwen3-14B-FP8 \
    --reasoning-parser qwen3 \
    --port 8003 \
    --host 127.0.0.1 \
    --gpu-memory-utilization 0.95 \
    --max-num-batched-tokens 4096 \
    --max-num-seqs 2 \
    --max-model-len 32768 > vllm_qwen3.log 2>&1 &

# 记录第一个服务的PID
PID1=$!

# 等待服务启动并检查状态
check_service1() {
    local timeout=300  # 超时时间300秒
    local interval=5   # 检查间隔5秒
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        # 检查端口是否监听
        if ss -tulpn | grep -q ":8003"; then
            return 0  # 服务启动成功
        fi
        
        # 检查进程是否存在
        if ! ps -p $PID1 > /dev/null; then
            return 1  # 进程已退出
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    return 2  # 超时
}

# 启动第二个服务
zenity --notification --text="开始启动识别服务..."

CUDA_VISIBLE_DEVICES=0 nohup vllm serve /home/modelscope/Qwen/Qwen2___5-VL-7B-Instruct \
 --served-model-name Qwen/Qwen2.5-VL-7B-Instruct \
 --port 8002 \
 --host 127.0.0.1 \
 --dtype bfloat16 \
 --gpu-memory-utilization 0.95 \
 --max-num-batched-tokens 4096 \
 --max-num-seqs 2 \
 --max-model-len 32768 \
 --limit-mm-per-prompt '{"image": 1, "video": 0}' > vllm_qwen_vl.log 2>&1 &

# 记录第二个服务的PID
PID2=$!

# 等待服务启动并检查状态
check_service2() {
    local timeout=300  # 超时时间300秒
    local interval=5   # 检查间隔5秒
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        # 检查端口是否监听
        if ss -tulpn | grep -q ":8002"; then
            return 0  # 服务启动成功
        fi
        
        # 检查进程是否存在
        if ! ps -p $PID2 > /dev/null; then
            return 1  # 进程已退出
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
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
