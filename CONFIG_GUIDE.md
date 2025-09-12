# 配置系统使用指南

## 🎯 **配置系统概述**

新的配置系统通过环境检测自动返回不同的路径配置，支持开发、测试、生产、Docker等多种环境，并且支持环境变量覆盖。

## 📁 **配置文件结构**

```
src/lib/config/
└── paths.ts                    # 路径配置核心文件

config/environments/            # 环境配置示例
├── development.example         # 开发环境配置
├── production.example          # 生产环境配置
├── test.example               # 测试环境配置
└── docker.example             # Docker环境配置
```

## 🔧 **使用方法**

### 1. **在代码中使用**

```typescript
// 导入配置
import { pathConfig, ocrOutputDir, translateOutputDir } from '$lib/config/paths';

// 使用单个路径
const ocrDir = ocrOutputDir;

// 使用完整配置
const config = pathConfig;
console.log(config.ocrOutputDir);

// 初始化并打印配置信息
import { initializePathConfig } from '$lib/config/paths';
const config = initializePathConfig();
```

### 2. **环境自动检测**

系统会自动检测当前环境：

```typescript
// 环境检测优先级：
// 1. DOCKER_ENV=true 或 IS_DOCKER=true → docker
// 2. NODE_ENV=production → production
// 3. NODE_ENV=test → test  
// 4. NODE_ENV=development → development
// 5. 默认 → development
```

### 3. **环境变量覆盖**

可以通过环境变量覆盖默认配置：

```bash
# 设置环境变量覆盖
export PDF_OCR_OUTPUT_DIR="~/my-custom/ocr"
export PDF_TRANSLATE_OUTPUT_DIR="/custom/translate"
export NODE_ENV=production
```

## 🌍 **各环境配置详情**

### 📱 **开发环境 (development)**
```typescript
{
  pdfUploadDir: 'uploads/files',
  pdfOutputDir: 'uploads/pdf-split',
  ocrOutputDir: 'uploads/ocr',
  translateOutputDir: 'uploads/translate',
  imagesOutputDir: 'uploads/images',
  logDir: 'logs',
  tempDir: 'temp'
}
```

**特点**：
- 使用相对路径，便于开发调试
- 文件存储在项目目录下
- 易于清理和重置

### 🧪 **测试环境 (test)**
```typescript
{
  pdfUploadDir: '/tmp/lixin-test/uploads',
  pdfOutputDir: '/tmp/lixin-test/pdf-split',
  ocrOutputDir: '/tmp/lixin-test/ocr',
  translateOutputDir: '/tmp/lixin-test/translate',
  imagesOutputDir: '/tmp/lixin-test/images',
  logDir: '/tmp/lixin-test/logs',
  tempDir: '/tmp/lixin-test/temp'
}
```

**特点**：
- 使用临时目录，自动清理
- 隔离测试数据
- 不影响开发和生产数据

### 🚀 **生产环境 (production)**
```typescript
{
  pdfUploadDir: '/opt/lixin/data/uploads',
  pdfOutputDir: '/opt/lixin/data/pdf-split',
  ocrOutputDir: '/opt/lixin/data/ocr',
  translateOutputDir: '/opt/lixin/data/translate',
  imagesOutputDir: '/opt/lixin/data/images',
  logDir: '/var/log/lixin',
  tempDir: '/tmp/lixin'
}
```

**特点**：
- 符合Linux文件系统层次标准(FHS)
- 持久化存储，适合生产环境
- 便于备份和权限管理

### 🐳 **Docker环境 (docker)**
```typescript
{
  pdfUploadDir: '/app/data/uploads',
  pdfOutputDir: '/app/data/pdf-split',
  ocrOutputDir: '/app/data/ocr',
  translateOutputDir: '/app/data/translate',
  imagesOutputDir: '/app/data/images',
  logDir: '/app/logs',
  tempDir: '/app/temp'
}
```

**特点**：
- 容器内部路径
- 配合Docker volume使用
- 便于容器化部署

## ⚙️ **配置优先级**

1. **环境变量** (最高优先级)
2. **环境配置** (基于NODE_ENV)
3. **默认配置** (development)

```bash
# 示例：环境变量覆盖
NODE_ENV=production
PDF_OCR_OUTPUT_DIR="~/custom/ocr"  # 覆盖生产环境的默认路径
```

## 🛠️ **部署配置**

### 开发环境快速开始
```bash
# 复制配置文件
cp config/environments/development.example .env

# 或者直接设置环境变量
export NODE_ENV=development
export PDF_OCR_OUTPUT_DIR="~/data/lixin/ocr"
```

### 生产环境部署
```bash
# 复制生产配置
cp config/environments/production.example .env

# 创建目录
sudo mkdir -p /opt/lixin/data/{uploads,pdf-split,ocr,translate,images}
sudo mkdir -p /var/log/lixin
sudo chown -R lixin:lixin /opt/lixin /var/log/lixin

# 设置环境
export NODE_ENV=production
```

### Docker部署
```dockerfile
# Dockerfile
ENV NODE_ENV=production
ENV DOCKER_ENV=true
VOLUME ["/app/data", "/app/logs"]
```

```bash
# docker-compose.yml
version: '3.8'
services:
  lixin:
    environment:
      - NODE_ENV=production
      - DOCKER_ENV=true
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

## 🔍 **调试和验证**

### 查看当前配置
```typescript
import { initializePathConfig, getEnvironment } from '$lib/config/paths';

console.log('当前环境:', getEnvironment());
const config = initializePathConfig(); // 会打印详细配置信息
```

### 运行时检查
启动应用时会自动打印配置信息：
```
🔧 路径配置初始化完成
📍 当前环境: production
📁 路径配置:
  PDF上传目录: /opt/lixin/data/uploads
  OCR输出目录: /opt/lixin/data/ocr
  翻译输出目录: /opt/lixin/data/translate
  图片输出目录: /opt/lixin/data/images
  日志目录: /var/log/lixin
🏠 用户Home目录: /home/lixin
```

## 🎨 **自定义配置**

### 添加新环境
```typescript
// 在 src/lib/config/paths.ts 中添加
const pathConfigs: Record<Environment, PathConfig> = {
  // ... 现有配置
  
  // 新的环境配置
  staging: {
    pdfUploadDir: '/staging/data/uploads',
    pdfOutputDir: '/staging/data/pdf-split',
    ocrOutputDir: '/staging/data/ocr',
    translateOutputDir: '/staging/data/translate',
    imagesOutputDir: '/staging/data/images',
    logDir: '/staging/logs',
    tempDir: '/staging/temp'
  }
};
```

### 扩展配置属性
```typescript
// 扩展 PathConfig 接口
export interface PathConfig {
  // 现有属性...
  
  // 新属性
  backupDir?: string;
  cacheDir?: string;
  archiveDir?: string;
}
```

## 📝 **最佳实践**

1. **开发环境**：使用相对路径或 `~/data`
2. **测试环境**：使用 `/tmp` 临时目录
3. **生产环境**：使用 `/opt/appname` 或 `/var/lib/appname`
4. **容器环境**：使用 `/app/data` 配合volume
5. **备份策略**：根据环境选择合适的备份目录
6. **权限管理**：确保应用用户有相应目录的读写权限

这个配置系统提供了灵活、可扩展的多环境路径管理方案，满足从开发到生产的各种部署需求。
