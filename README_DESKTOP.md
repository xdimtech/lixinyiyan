# Ubuntu桌面快捷方式安装指南

本指南将帮助您在Ubuntu桌面上创建图形化的启动器，让用户可以通过双击图标来启动服务。

## 📋 功能概述

- **🤖 大模型服务启动器** - 启动Qwen大模型翻译和识别服务
- **🌐 Web服务启动器** - 启动Lixin智能识别翻译系统Web服务
- **📱 图形化界面** - 使用zenity提供友好的用户界面

## 🚀 快速安装

### 方法一：自动安装（推荐）

1. 在Ubuntu服务器上运行安装脚本：
```bash
# 进入项目目录
cd /path/to/lixinyiyan

# 运行安装脚本
./sbin/install_desktop_shortcuts.sh
```

2. 脚本会自动：
   - 检查并安装zenity图形化工具
   - 在桌面创建快捷方式
   - 设置正确的文件权限
   - 提供测试选项

### 方法二：手动安装

1. **复制desktop文件到桌面**：
```bash
# 复制到桌面目录
cp sbin/大模型服务启动器.desktop ~/桌面/
cp sbin/Web服务启动器.desktop ~/桌面/

# 如果桌面是英文
cp sbin/大模型服务启动器.desktop ~/Desktop/
cp sbin/Web服务启动器.desktop ~/Desktop/
```

2. **设置文件权限**：
```bash
# 设置desktop文件为可执行
chmod +x ~/桌面/大模型服务启动器.desktop
chmod +x ~/桌面/Web服务启动器.desktop

# 确保启动脚本有执行权限
chmod +x sbin/launch_bigmodel.sh
chmod +x sbin/launch_web.sh
```

3. **设置文件为可信任**（某些Ubuntu版本需要）：
```bash
gio set ~/桌面/大模型服务启动器.desktop metadata::trusted true
gio set ~/桌面/Web服务启动器.desktop metadata::trusted true
```

## 🛠️ 手动配置desktop文件

如果需要自定义路径，请编辑desktop文件中的`Exec`字段：

```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=大模型服务启动器
Comment=启动Qwen大模型翻译和识别服务
Exec=/your/actual/project/path/sbin/launch_bigmodel.sh
Icon=applications-development
Terminal=false
Categories=Development;Utility;
StartupNotify=true
```

## 📱 使用说明

1. **双击启动**：在桌面上双击相应的图标
2. **首次确认**：首次点击可能需要点击"信任并启动"
3. **图形化界面**：启动过程会显示进度对话框和状态信息
4. **服务管理**：启动完成后可以进行服务管理操作

## ⚡ 启动器功能

### 大模型服务启动器
- 启动Qwen翻译服务（端口8003）
- 启动Qwen视觉识别服务（端口8002）
- 并行启动和状态检查
- 日志查看和管理

### Web服务启动器
- 自动依赖检查和安装
- Web应用构建和启动
- 服务状态监控
- 浏览器自动打开
- 完整的服务生命周期管理

## 🔧 故障排除

### 图标不显示或无法点击
1. 检查文件权限：`ls -la ~/桌面/*.desktop`
2. 确保文件是可执行的：`chmod +x ~/桌面/*.desktop`
3. 设置文件为可信任：`gio set ~/桌面/*.desktop metadata::trusted true`

### 脚本路径错误
1. 检查desktop文件中的`Exec`路径是否正确
2. 确保启动脚本存在且有执行权限
3. 使用绝对路径而不是相对路径

### zenity未安装
```bash
sudo apt update
sudo apt install -y zenity
```

### 权限问题
```bash
# 确保所有脚本都有执行权限
chmod +x sbin/*.sh
chmod +x ~/桌面/*.desktop
```

## 📁 文件结构

```
sbin/
├── launch_bigmodel.sh          # 大模型服务启动脚本
├── launch_web.sh              # Web服务启动脚本
├── install_desktop_shortcuts.sh # 桌面快捷方式安装脚本
├── 大模型服务启动器.desktop      # 大模型服务桌面文件模板
└── Web服务启动器.desktop        # Web服务桌面文件模板
```

## 🎯 高级配置

### 自定义图标
在desktop文件中修改`Icon`字段：
```ini
Icon=/path/to/your/custom/icon.png
```

### 修改分类
在desktop文件中修改`Categories`字段：
```ini
Categories=Development;Utility;System;
```

### 添加快捷键
某些桌面环境支持为desktop文件设置快捷键，具体方法请参考桌面环境文档。

## 💡 提示

- 建议在生产环境中使用绝对路径
- 定期检查服务状态和日志
- 可以将desktop文件添加到应用程序菜单中
- 支持多语言显示（中英文）
