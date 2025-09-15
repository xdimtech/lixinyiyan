#!/bin/bash

# Ubuntu桌面快捷方式安装脚本
# 用于在Ubuntu桌面上创建启动器的快捷方式

set -e  # 遇到错误立即退出

echo "🖥️  Ubuntu桌面快捷方式安装器"
echo "================================="

# 检查是否在Ubuntu环境中运行
if ! command -v zenity &> /dev/null; then
    echo "📦 正在安装zenity..."
    sudo apt update > /dev/null 2>&1
    sudo apt install -y zenity > /dev/null 2>&1
fi

# 获取当前脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 获取当前用户的桌面目录
DESKTOP_DIR="$HOME/桌面"
if [ ! -d "$DESKTOP_DIR" ]; then
    DESKTOP_DIR="$HOME/Desktop"
fi

if [ ! -d "$DESKTOP_DIR" ]; then
    echo "❌ 错误: 找不到桌面目录"
    exit 1
fi

# 检查关键工具是否安装（给用户提前提示）
check_tools() {
    local missing_tools=()
    local common_paths=(
        "$HOME/.bun/bin"
        "$HOME/.local/bin" 
        "/usr/local/bin"
        "/usr/bin"
        "/opt/bun/bin"
        "/snap/bin"
    )
    
    # 检查bun
    local found_bun=false
    for path in "${common_paths[@]}"; do
        if [ -x "$path/bun" ]; then
            found_bun=true
            break
        fi
    done
    
    if ! $found_bun && ! command -v bun &> /dev/null; then
        missing_tools+=("bun")
    fi
    
    # 检查node
    if ! command -v node &> /dev/null; then
        local found_node=false
        for path in "${common_paths[@]}"; do
            if [ -x "$path/node" ]; then
                found_node=true
                break
            fi
        done
        if ! $found_node; then
            missing_tools+=("node")
        fi
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        local tools_text=$(printf '%s\n' "${missing_tools[@]}")
        zenity --warning --title="工具检查" \
            --text="⚠️ 检测到可能缺少以下工具：\n$tools_text\n\n如果您已安装这些工具但仍看到此提示，\n这可能是PATH环境变量的问题。\n\n脚本已经优化了路径检测，应该能够找到常见位置的工具。\n\n是否继续安装桌面快捷方式？" \
            --width=450
        
        return $?
    fi
    
    return 0
}

echo "🎯 项目路径: $PROJECT_ROOT"
echo "🖥️  桌面目录: $DESKTOP_DIR"

# 检查工具
if ! check_tools; then
    echo "❌ 用户选择不继续安装"
    exit 0
fi

# 显示安装确认对话框
if ! zenity --question --title="安装桌面快捷方式" \
    --text="即将在桌面创建以下快捷方式：\n\n• 大模型服务启动器\n• Web服务启动器\n\n项目路径: $PROJECT_ROOT\n桌面路径: $DESKTOP_DIR\n\n确定要继续吗？" \
    --width=450; then
    echo "❌ 用户取消安装"
    exit 0
fi

# 创建临时的desktop文件，使用实际的项目路径
create_bigmodel_desktop() {
    cat > "$DESKTOP_DIR/大模型服务启动器.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=大模型服务启动器
Name[en]=BigModel Service Launcher
Comment=启动Qwen大模型翻译和识别服务
Comment[en]=Launch Qwen BigModel Translation and Recognition Services
Exec=$PROJECT_ROOT/sbin/launch_bigmodel.sh
Icon=applications-development
Terminal=false
Categories=Development;Utility;
StartupNotify=true
Keywords=AI;大模型;翻译;识别;服务;
Keywords[en]=AI;BigModel;Translation;Recognition;Service;
EOF
}

create_web_desktop() {
    cat > "$DESKTOP_DIR/Web服务启动器.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Web服务启动器
Name[en]=Web Service Launcher
Comment=启动Lixin智能识别翻译系统Web服务
Comment[en]=Launch Lixin Intelligent Recognition Translation Web Service
Exec=$PROJECT_ROOT/sbin/launch_web.sh
Icon=applications-internet
Terminal=false
Categories=Network;WebDevelopment;Utility;
StartupNotify=true
Keywords=Web;服务;翻译;识别;网站;
Keywords[en]=Web;Service;Translation;Recognition;Website;
EOF
}

# 创建桌面文件
echo "📝 创建桌面快捷方式..."

# 创建大模型服务启动器
if create_bigmodel_desktop; then
    echo "✅ 大模型服务启动器已创建"
else
    echo "❌ 大模型服务启动器创建失败"
    exit 1
fi

# 创建Web服务启动器
if create_web_desktop; then
    echo "✅ Web服务启动器已创建"
else
    echo "❌ Web服务启动器创建失败"
    exit 1
fi

# 设置正确的权限
echo "🔐 设置文件权限..."
chmod +x "$DESKTOP_DIR/大模型服务启动器.desktop"
chmod +x "$DESKTOP_DIR/Web服务启动器.desktop"

# 确保启动脚本有执行权限
chmod +x "$PROJECT_ROOT/sbin/launch_bigmodel.sh"
chmod +x "$PROJECT_ROOT/sbin/launch_web.sh"

# 对于某些Ubuntu版本，需要将文件标记为可信任
if command -v gio &> /dev/null; then
    echo "🔒 设置文件为可信任..."
    gio set "$DESKTOP_DIR/大模型服务启动器.desktop" metadata::trusted true 2>/dev/null || true
    gio set "$DESKTOP_DIR/Web服务启动器.desktop" metadata::trusted true 2>/dev/null || true
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "📍 桌面快捷方式已创建:"
echo "   • $DESKTOP_DIR/大模型服务启动器.desktop"
echo "   • $DESKTOP_DIR/Web服务启动器.desktop"
echo ""
echo "💡 使用说明:"
echo "   1. 在桌面上双击图标即可启动相应服务"
echo "   2. 首次点击可能需要确认'信任并启动'"
echo "   3. 启动过程会显示图形化进度和状态"
echo ""

# 显示完成对话框
zenity --info --title="安装完成" \
    --text="🎉 桌面快捷方式安装成功！\n\n📍 已创建的快捷方式：\n• 大模型服务启动器\n• Web服务启动器\n\n💡 现在可以在桌面上双击图标启动服务了！\n\n⚠️ 首次启动可能需要点击'信任并启动'" \
    --width=400

# 询问是否立即测试
if zenity --question --title="测试启动器" \
    --text="是否要立即测试其中一个启动器？" \
    --width=300; then
    
    CHOICE=$(zenity --list --title="选择测试" \
        --text="请选择要测试的启动器：" \
        --column="启动器" \
        "大模型服务启动器" \
        "Web服务启动器" \
        --width=300)
    
    case $CHOICE in
        "大模型服务启动器")
            echo "🚀 启动大模型服务..."
            "$PROJECT_ROOT/sbin/launch_bigmodel.sh" &
            ;;
        "Web服务启动器")
            echo "🚀 启动Web服务..."
            "$PROJECT_ROOT/sbin/launch_web.sh" &
            ;;
    esac
fi

echo "✨ 脚本执行完成！"
