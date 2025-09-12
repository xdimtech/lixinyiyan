# OCR和翻译路径迁移指南

## 概述

已将OCR和翻译文件的存储路径从不可靠的 `/tmp` 目录迁移到可配置的环境变量控制的持久化目录。

## 更改内容

### 1. 新增环境变量
在 `.env` 文件中添加以下配置：

```env
# OCR和翻译输出目录配置（新增）
PDF_OCR_OUTPUT_DIR="uploads/ocr"
PDF_TRANSLATE_OUTPUT_DIR="uploads/translate" 
PDF_IMAGES_OUTPUT_DIR="uploads/images"
```

### 2. 旧路径 vs 新路径

| 功能 | 旧路径 | 新路径 |
|------|--------|--------|
| 图片存储 | `/tmp/output_dir/task_X/images/` | `${PDF_IMAGES_OUTPUT_DIR}/task_X/images/` |
| OCR结果 | `/tmp/output_dir/task_X/ocr/` | `${PDF_OCR_OUTPUT_DIR}/task_X/` |
| 翻译结果 | `/tmp/output_dir/task_X/translate/` | `${PDF_TRANSLATE_OUTPUT_DIR}/task_X/` |

### 3. 修改的文件

#### 核心处理文件
- `src/lib/server/task-processor.ts` - 任务处理逻辑
- `src/lib/server/pdf-processor.ts` - PDF处理器

#### 审核相关文件
- `src/routes/tasks/review/[id]/+page.server.ts` - 审核页面服务端
- `src/routes/api/tasks/review/image/[taskId]/[pageNum]/+server.ts` - 图片API

#### 配置文档
- `README.md` - 更新环境变量说明

## 迁移步骤

### 1. 更新环境变量
在您的 `.env` 文件中添加新的目录配置：

```env
PDF_OCR_OUTPUT_DIR="uploads/ocr"
PDF_TRANSLATE_OUTPUT_DIR="uploads/translate"
PDF_IMAGES_OUTPUT_DIR="uploads/images"
```

### 2. 创建目录结构
```bash
mkdir -p uploads/ocr uploads/translate uploads/images
```

### 3. 数据迁移（可选）
如果您有现有的 `/tmp/output_dir` 数据需要迁移：

```bash
# 创建迁移脚本
cp -r /tmp/output_dir/task_*/images/* uploads/images/
cp -r /tmp/output_dir/task_*/ocr/* uploads/ocr/
cp -r /tmp/output_dir/task_*/translate/* uploads/translate/
```

⚠️ **注意**: 迁移时需要保持 `task_X` 的目录结构。

### 4. 更新数据库路径（如果需要）
如果现有数据库记录中的文件路径包含 `/tmp/output_dir`，可能需要批量更新：

```sql
-- 更新OCR输出路径
UPDATE meta_ocr_output 
SET output_txt_path = REPLACE(output_txt_path, '/tmp/output_dir/', 'uploads/')
WHERE output_txt_path LIKE '/tmp/output_dir/%';

-- 更新翻译输出路径
UPDATE meta_translate_output 
SET output_txt_path = REPLACE(output_txt_path, '/tmp/output_dir/', 'uploads/')
WHERE output_txt_path LIKE '/tmp/output_dir/%';
```

## 优势

### ✅ 改进之处
1. **持久化存储**: 不再依赖容易被清理的 `/tmp` 目录
2. **环境配置**: 通过环境变量灵活配置存储路径
3. **目录分离**: OCR、翻译、图片分别存储，便于管理
4. **生产就绪**: 适合生产环境部署

### ⚠️ 注意事项
1. **权限设置**: 确保应用对新目录有读写权限
2. **磁盘空间**: 持久化存储需要考虑磁盘空间管理
3. **备份策略**: 建议对重要的OCR和翻译结果进行定期备份

## 测试验证

1. **创建新任务**: 验证文件是否保存到新路径
2. **审核功能**: 确认审核页面能正确加载图片和文本
3. **下载功能**: 验证结果文件下载正常
4. **路径日志**: 检查控制台日志确认路径配置生效

## 回滚方案

如果遇到问题需要回滚，可以：

1. 将环境变量改回旧值（虽然不推荐）
2. 或者修复具体问题而不是回滚

```env
# 不推荐的回滚配置
PDF_OCR_OUTPUT_DIR="/tmp/output_dir"
PDF_TRANSLATE_OUTPUT_DIR="/tmp/output_dir"
PDF_IMAGES_OUTPUT_DIR="/tmp/output_dir"
```

## 相关文档

- [README.md](./README.md) - 完整的环境配置说明
- [PRD.md](./PRD.md) - 产品需求文档
