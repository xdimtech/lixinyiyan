# Ubuntu系统部署指南

## 📁 **路径配置分析：~/data vs 其他选择**

### 🏠 **使用 ~/data 的场景**

#### ✅ **适合的情况**
- **开发环境**：个人开发机器
- **单用户部署**：只有一个用户使用
- **原型测试**：快速验证功能
- **学习环境**：教学和学习用途

#### ❌ **不适合的情况**
- **生产环境**：多用户、高可用系统
- **系统服务**：需要以系统用户运行
- **Docker容器**：容器化部署
- **企业环境**：需要规范的文件组织

## 🗂️ **推荐的路径方案**

### 1. **开发环境配置**
```env
# .env.development
PDF_OCR_OUTPUT_DIR="~/data/lixin/ocr"
PDF_TRANSLATE_OUTPUT_DIR="~/data/lixin/translate"
PDF_IMAGES_OUTPUT_DIR="~/data/lixin/images"
```

```bash
# 创建开发目录
mkdir -p ~/data/lixin/{ocr,translate,images}
chmod 755 ~/data/lixin
```

### 2. **生产环境配置**
```env
# .env.production
PDF_OCR_OUTPUT_DIR="/opt/lixin/data/ocr"
PDF_TRANSLATE_OUTPUT_DIR="/opt/lixin/data/translate"
PDF_IMAGES_OUTPUT_DIR="/opt/lixin/data/images"
```

```bash
# 创建生产目录
sudo mkdir -p /opt/lixin/data/{ocr,translate,images}
sudo chown -R lixin:lixin /opt/lixin
sudo chmod -R 755 /opt/lixin
```

### 3. **容器化配置**
```env
# .env.docker
PDF_OCR_OUTPUT_DIR="/app/data/ocr"
PDF_TRANSLATE_OUTPUT_DIR="/app/data/translate"
PDF_IMAGES_OUTPUT_DIR="/app/data/images"
```

```dockerfile
# Dockerfile
VOLUME ["/app/data"]
RUN mkdir -p /app/data/{ocr,translate,images}
RUN chown -R node:node /app/data
```

## 🛠️ **部署步骤**

### 1. **系统用户创建**
```bash
# 创建专用用户
sudo adduser --system --group --home /opt/lixin lixin

# 设置shell（可选）
sudo usermod -s /bin/bash lixin
```

### 2. **目录权限配置**
```bash
# 创建数据目录
sudo mkdir -p /opt/lixin/data/{ocr,translate,images,uploads}
sudo chown -R lixin:lixin /opt/lixin
sudo chmod -R 755 /opt/lixin

# 创建日志目录
sudo mkdir -p /var/log/lixin
sudo chown lixin:lixin /var/log/lixin
sudo chmod 755 /var/log/lixin
```

### 3. **环境配置**
```bash
# 生产环境配置
sudo -u lixin tee /opt/lixin/.env << EOF
# 数据库配置
DATABASE_URL="mysql://lixin:password@localhost:3306/lixin"

# API服务配置
OCR_API_URL="http://127.0.0.1:8002/v1"
TRANSLATE_API_URL="http://127.0.0.1:8003/v1"

# 文件存储配置
PDF_UPLOAD_DIR="/opt/lixin/data/uploads"
PDF_OUTPUT_DIR="/opt/lixin/data/pdf-split"
PDF_OCR_OUTPUT_DIR="/opt/lixin/data/ocr"
PDF_TRANSLATE_OUTPUT_DIR="/opt/lixin/data/translate"
PDF_IMAGES_OUTPUT_DIR="/opt/lixin/data/images"

# 运行环境
NODE_ENV="production"
EOF
```

### 4. **Systemd服务配置**
```bash
# 创建服务文件
sudo tee /etc/systemd/system/lixin.service << EOF
[Unit]
Description=Lixin Translation Service
After=network.target mysql.service

[Service]
Type=simple
User=lixin
Group=lixin
WorkingDirectory=/opt/lixin
Environment=NODE_ENV=production
EnvironmentFile=/opt/lixin/.env
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=10

# 日志配置
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lixin

# 安全配置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/lixin/data /var/log/lixin

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
sudo systemctl enable lixin
sudo systemctl start lixin
sudo systemctl status lixin
```

## 📊 **路径方案对比**

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| `~/data` | 简单、权限清晰、开发友好 | 用户依赖、备份复杂、不规范 | 开发、测试 |
| `/opt/app` | 符合FHS、生产级、多用户 | 需要sudo、配置复杂 | 生产环境 |
| `/var/lib/app` | 系统标准、自动备份 | 权限严格、访问受限 | 系统服务 |
| `/srv/app` | 专用服务目录、清晰 | 较少使用、文档少 | Web服务 |

## 🔧 **监控和维护**

### 1. **磁盘空间监控**
```bash
# 检查数据目录大小
du -sh /opt/lixin/data/*

# 设置定时清理（可选）
cat > /opt/lixin/cleanup.sh << 'EOF'
#!/bin/bash
# 清理30天前的临时文件
find /opt/lixin/data -name "*.tmp" -mtime +30 -delete
# 压缩旧的OCR结果
find /opt/lixin/data/ocr -name "*.txt" -mtime +7 -exec gzip {} \;
EOF

chmod +x /opt/lixin/cleanup.sh
# 添加到crontab
echo "0 2 * * * /opt/lixin/cleanup.sh" | sudo -u lixin crontab -
```

### 2. **备份策略**
```bash
# 数据备份脚本
cat > /opt/lixin/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/lixin"
mkdir -p $BACKUP_DIR

# 备份数据文件
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /opt/lixin/data

# 备份数据库
mysqldump lixin > $BACKUP_DIR/db_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /opt/lixin/backup.sh
# 每日备份
echo "0 3 * * * /opt/lixin/backup.sh" | sudo crontab -
```

## 🚨 **安全注意事项**

### 1. **文件权限**
```bash
# 确保敏感文件权限
chmod 600 /opt/lixin/.env
chmod 700 /opt/lixin/data

# 定期检查权限
find /opt/lixin -type f -perm /o+w -ls
```

### 2. **防火墙配置**
```bash
# 只允许必要端口
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. **日志轮转**
```bash
# 配置logrotate
sudo tee /etc/logrotate.d/lixin << EOF
/var/log/lixin/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 lixin lixin
    postrotate
        systemctl reload lixin
    endscript
}
EOF
```

## 📝 **总结建议**

### 🎯 **最佳实践**
1. **开发用 ~/data**：简单快速，便于调试
2. **生产用 /opt/app**：符合标准，便于管理
3. **容器用 /app/data**：配合volume挂载
4. **测试用 /tmp/app**：自动清理，隔离环境

### ⚡ **快速选择**
```bash
# 开发环境
export PDF_OCR_OUTPUT_DIR="~/data/lixin/ocr"

# 生产环境
export PDF_OCR_OUTPUT_DIR="/opt/lixin/data/ocr"

# 容器环境
export PDF_OCR_OUTPUT_DIR="/app/data/ocr"
```

根据您的具体需求选择合适的路径方案，并遵循相应的部署和维护流程。
