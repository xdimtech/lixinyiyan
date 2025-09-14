# 流水线处理架构迁移指南

## 概述

本次更新实现了PDF处理的流水线架构，优化了OCR和翻译的并发处理性能，并统一了数据库表结构。

## 主要改进

### 1. 数据库架构优化
- **新增表**: `meta_process_output` - 统一管理OCR和翻译状态
- **新增字段**: `meta_parse_task.cur_page` - 实时跟踪处理进度
- **向后兼容**: 保留原有的 `meta_ocr_output` 和 `meta_translate_output` 表

### 2. 流水线处理架构
- **并发处理**: OCR和翻译可以并行执行
- **流水线工作**: 一页OCR完成即可开始翻译，同时下一页开始OCR
- **实时进度**: 支持 `cur_page/page_num` 进度显示
- **错误隔离**: 单页失败不影响其他页面处理

### 3. 性能提升
- **资源利用率**: OCR和翻译模型服务同时工作，提高吞吐量
- **处理速度**: 流水线架构显著减少总处理时间
- **用户体验**: 实时进度反馈，更好的任务状态可视化

## 技术实现

### 流水线架构
```
PDF → 图片1,2,3...N
       ↓
   OCR队列 → 翻译队列
   (并发)    (并发)
       ↓        ↓
   结果存储 → 最终打包
```

### 核心组件
1. **task-processor-pipeline.ts** - 新的流水线处理器
2. **meta_process_output** - 统一的处理状态表
3. **进度跟踪** - 实时更新 `cur_page` 字段

## 数据库迁移

### 1. 设置环境变量
```bash
# 设置数据库连接
export DATABASE_URL="mysql://root:123456@localhost:3306/lixin"
```

### 2. 应用迁移
由于类型兼容性问题，需要手动创建新表：

```sql
-- 创建统一处理输出表
CREATE TABLE IF NOT EXISTS meta_process_output (
    id bigint unsigned AUTO_INCREMENT NOT NULL,
    task_id bigint unsigned NOT NULL,
    page_no int NOT NULL,
    input_file_path varchar(500) NOT NULL,
    ocr_txt_path varchar(500),
    translate_txt_path varchar(500),
    ocr_status int NOT NULL DEFAULT 0,
    translate_status int NOT NULL DEFAULT 0,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted tinyint NOT NULL DEFAULT 0,
    CONSTRAINT meta_process_output_id PRIMARY KEY(id),
    CONSTRAINT meta_process_output_task_id_meta_parse_task_id_fk FOREIGN KEY (task_id) REFERENCES meta_parse_task(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    UNIQUE KEY idx_task_id_page_no (task_id, page_no)
);

-- 添加进度字段
ALTER TABLE meta_parse_task ADD COLUMN cur_page int DEFAULT 0 NOT NULL;
```

### 3. 验证迁移
```bash
# 检查表结构
mysql -u root -p lixin -e "DESCRIBE meta_process_output;"
mysql -u root -p lixin -e "DESCRIBE meta_parse_task;"
```

### 4. 环境变量配置
确保 `.env` 文件包含正确的数据库连接信息：

```env
DATABASE_URL="mysql://root:123456@localhost:3306/lixin"
OCR_API_URL="http://127.0.0.1:8002/v1"
TRANSLATE_API_URL="http://127.0.0.1:8003/v1"
OCR_MODEL="Qwen2-VL-7B-Instruct"
TRANSLATE_MODEL="Qwen2.5-7B-Instruct"
PDF_OCR_OUTPUT_DIR="uploads/ocr"
PDF_TRANSLATE_OUTPUT_DIR="uploads/translate"
PDF_IMAGES_OUTPUT_DIR="uploads/images"
PDF_OCR_ZIP_OUTPUT_DIR="uploads/ocr-zip"
PDF_TRANSLATE_ZIP_OUTPUT_DIR="uploads/translate-zip"
```

## 使用方式

### 1. 启动流水线处理
```javascript
// 替换原有的处理方式
import { processPendingTasksPipeline } from '$lib/server/task-processor-pipeline';

// 处理待处理任务
await processPendingTasksPipeline();
```

### 2. 进度监控
```javascript
// 任务列表现在包含进度信息
const tasks = await db.select({
    // ... 其他字段
    curPage: table.metaParseTask.curPage,
    pageNum: table.metaParseTask.pageNum
}).from(table.metaParseTask);

// 计算进度百分比
const progress = Math.round((task.curPage / task.pageNum) * 100);
```

## API 更新

### 1. 处理任务API
- **端点**: `POST /api/process-tasks`
- **变更**: 现在使用流水线处理器
- **响应**: 包含流水线处理状态

### 2. 任务列表API
- **端点**: `POST /api/tasks/filter`
- **新增**: `curPage` 字段
- **功能**: 支持实时进度显示

## 前端更新

### 1. 进度显示
- **进度条**: 处理中的任务显示可视化进度条
- **百分比**: 显示具体的完成百分比
- **状态**: 更详细的处理状态信息

### 2. 实时刷新
- **自动刷新**: 建议添加定时刷新功能
- **状态更新**: 实时反映任务处理进度

## 向后兼容

### 1. 数据兼容
- 保留原有的 `meta_ocr_output` 和 `meta_translate_output` 表
- 删除操作同时清理新旧表数据
- 支持历史任务数据查看

### 2. API兼容
- 原有API端点保持不变
- 新增字段向后兼容
- 渐进式迁移支持

## 性能对比

### 处理时间对比（以10页PDF为例）
- **串行处理**: OCR(10页×30秒) + 翻译(10页×45秒) = 750秒
- **流水线处理**: Max(OCR最后一页完成时间, 翻译最后一页完成时间) ≈ 480秒
- **性能提升**: 约36%的时间节省

### 资源利用率
- **串行**: OCR和翻译服务交替空闲，利用率50%
- **流水线**: 两个服务并行工作，利用率接近100%

## 监控和调试

### 1. 日志输出
```
开始流水线处理任务 123: document.pdf
开始OCR处理第 1 页: /path/to/page_001.png
OCR处理完成第 1 页，输出长度: 1234
开始翻译处理第 1 页
翻译处理完成第 1 页，输出长度: 2345
流水线任务 123 处理完成
```

### 2. 数据库状态
- `meta_process_output` 表记录每页的详细处理状态
- `meta_parse_task.cur_page` 实时反映整体进度
- 支持按页面查询处理状态

## 故障排除

### 1. 常见问题
- **数据库连接**: 确保数据库迁移已正确应用
- **并发限制**: 注意API服务的并发限制设置
- **内存使用**: 流水线处理可能增加内存使用

### 2. 回滚方案
如需回滚到原有处理方式：
1. 修改 `/api/process-tasks` 引用回原处理器
2. 原有表结构和数据保持不变
3. 新增的 `cur_page` 字段可以保留

## 后续优化建议

### 1. 进一步优化
- **批处理**: 支持多个任务并行处理
- **队列管理**: 使用Redis等外部队列管理器
- **负载均衡**: 多实例部署时的任务分发

### 2. 监控增强
- **性能指标**: 添加处理时间、成功率等指标
- **告警机制**: 处理失败或超时告警
- **资源监控**: CPU、内存使用情况监控

## 总结

本次流水线架构升级显著提升了PDF处理的性能和用户体验，同时保持了良好的向后兼容性。新的架构更好地利用了系统资源，为后续的扩展和优化奠定了基础。
