# 智能识别翻译系统

基于 SvelteKit 构建的智能PDF文档识别翻译管理系统，支持PDF文档的OCR识别和民国风格翻译。

## 功能特性

### 核心功能
- **PDF文档上传**: 支持PDF文件上传，自动拆分为单页图片
- **OCR文字识别**: 智能识别图片中的文字内容
- **民国风格翻译**: 将识别的文字翻译为民国时期表达风格
- **流水线处理**: 并发OCR和翻译处理，显著提升处理效率
- **实时进度跟踪**: 支持查看处理进度、实时进度条显示
- **任务管理**: 支持下载结果、删除任务、状态筛选
- **智能对话**: 集成AI助手，支持自定义系统提示词

### 用户系统
- **用户注册登录**: 基于用户名/密码的认证系统
- **会话管理**: 登录状态持久化，刷新页面不需要重新登录
- **角色权限**: 支持 member/manager/admin 三种角色

### 管理功能
- **系统统计**: 用户数量、任务状态统计
- **任务处理**: 手动触发待处理任务的批量处理
- **权限控制**: 管理员可查看所有用户任务

## 技术架构

### 前端技术栈
- **SvelteKit**: 全栈框架
- **TypeScript**: 类型安全
- **TailwindCSS**: 样式框架
- **Svelte 5**: 响应式UI

### 后端技术栈
- **Node.js**: 运行时环境
- **Drizzle ORM**: 数据库ORM
- **MySQL**: 数据库
- **OpenAI API**: AI服务集成

### 流水线处理架构

系统采用先进的流水线处理架构，实现OCR和翻译的并发处理：

```
PDF文档 → 图片拆分 → 流水线处理
                    ↓
            ┌─────────────────┐
            │   OCR队列       │ ──→ 翻译队列
            │   (并发处理)     │     (并发处理)
            └─────────────────┘         ↓
                    ↓                结果存储
              实时进度更新        ↓
                                最终打包
```

#### 核心优势
- **性能提升**: 相比串行处理，处理时间减少约36%
- **资源利用**: OCR和翻译服务并行工作，资源利用率接近100%
- **实时反馈**: 支持页面级进度跟踪和可视化进度条
- **错误隔离**: 单页处理失败不影响其他页面
- **可扩展性**: 支持多任务并行和负载均衡

### 数据库设计
- `user`: 用户表（ID、用户名、密码、角色）
- `session`: 会话表（会话管理）
- `meta_parse_task`: 解析任务表（新增cur_page进度字段）
- `meta_process_output`: 统一处理输出表（合并OCR和翻译状态）
- `meta_ocr_output`: OCR输出记录表（向后兼容）
- `meta_translate_output`: 翻译输出记录表（向后兼容）

## 快速开始

### 环境要求
- Node.js >= 22.11.0
- Bun (推荐) 或 npm
- MySQL 数据库
- OCR API 服务 (http://127.0.0.1:8002/v1)
- 翻译 API 服务 (http://127.0.0.1:8003/v1)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd lixin-demo
   ```

2. **安装依赖**
   ```bash
   bun install
   ```

3. **配置数据库**
   ```bash
   # 启动数据库（使用 Docker）
   bun run db:start
   
   # 生成迁移文件
   bun run db:generate
   
   # 应用迁移
   bun run db:push
   ```

4. **启动开发服务器**
   ```bash
   bun run dev
   ```

5. **访问应用**
   打开 http://localhost:5173

### API服务配置

系统依赖以下API服务，请确保这些服务正常运行：

- **OCR API**: http://127.0.0.1:8002/v1
  - 模型: Qwen/Qwen2.5-VL-7B-Instruct
  - 用于图片文字识别

- **翻译API**: http://127.0.0.1:8003/v1
  - 模型: Qwen/Qwen3-14B-FP8
  - 用于民国风格翻译

## 使用指南

### 1. 用户注册与登录
- 访问 `/register` 创建新账户
- 访问 `/login` 登录系统
- 登录后自动跳转到主页

### 2. 文件上传与任务创建
- 进入 "文件上传" 页面
- 选择PDF文件（最大50MB）
- 选择处理类型：
  - **仅识别文本**: 只进行OCR识别
  - **识别并翻译**: OCR + 民国风格翻译
- 提交任务

### 3. 任务管理
- 进入 "任务列表" 页面
- 查看任务状态：等待中/处理中/已完成/失败
- **实时进度跟踪**: 处理中的任务显示当前页数和进度百分比
- **可视化进度条**: 直观显示任务处理进度
- 支持按用户名和状态筛选任务
- 已完成的任务可下载压缩包结果
- 支持删除自己的任务

#### 流水线处理特性
- **并发处理**: OCR和翻译同时进行，大幅提升处理速度
- **页面级进度**: 实时显示 "当前页/总页数" 和完成百分比
- **智能调度**: 一页OCR完成即开始翻译，同时下一页开始OCR
- **错误恢复**: 单页失败不影响其他页面的处理

### 4. 智能对话
- 进入 "智能对话" 页面
- 可选择预设的系统提示词或自定义
- 与AI助手进行对话交互

### 5. 系统管理（管理员）
- 访问 `/admin` 页面（需要admin权限）
- 查看系统统计信息
- 手动触发任务处理

## 项目结构

```
src/
├── app.css                 # 全局样式
├── app.d.ts               # 类型定义
├── app.html               # HTML模板
├── hooks.server.ts        # 服务端钩子
├── lib/
│   └── server/
│       ├── auth.ts        # 认证逻辑
│       ├── db/           # 数据库配置
│       ├── pdf-processor.ts  # PDF处理核心逻辑
│       ├── task-processor.ts # 传统串行任务处理逻辑
│       └── task-processor-pipeline.ts # 新流水线并发处理逻辑
└── routes/
    ├── +layout.svelte     # 主布局
    ├── +layout.server.ts  # 布局服务端逻辑
    ├── +page.svelte       # 首页
    ├── login/            # 登录页面
    ├── register/         # 注册页面
    ├── upload/           # 文件上传页面
    ├── tasks/            # 任务列表页面
    ├── chat/             # 智能对话页面
    ├── admin/            # 管理页面
    └── api/              # API端点
        ├── process-tasks/  # 任务处理API
        └── download/      # 文件下载API
```

## 流水线处理详解

### 处理流程对比

#### 传统串行处理
```
PDF → 图片1 → OCR1 → 翻译1 → 图片2 → OCR2 → 翻译2 → ...
总时间 = (OCR时间 + 翻译时间) × 页数
```

#### 新流水线处理
```
PDF → 图片1,2,3...N
       ↓
   图片1 → OCR1 ──→ 翻译1
   图片2 → OCR2 ──→ 翻译2  (并发进行)
   图片3 → OCR3 ──→ 翻译3
   ...
总时间 ≈ Max(OCR最后页完成时间, 翻译最后页完成时间)
```

### 性能提升数据

以10页PDF为例：
- **串行处理**: OCR(10×30秒) + 翻译(10×45秒) = 750秒
- **流水线处理**: 约480秒 (节省36%时间)
- **资源利用率**: 从50%提升到接近100%

### 技术实现

#### 核心组件
- `task-processor-pipeline.ts`: 流水线处理器
- `meta_process_output`: 统一状态管理表
- 实时进度更新机制

#### 关键特性
- **并发控制**: 使用Promise.all实现并发处理
- **错误隔离**: 单页失败不影响整体流程
- **进度跟踪**: 实时更新cur_page字段
- **状态管理**: 分别跟踪OCR和翻译状态

### API使用

```javascript
// 启动流水线处理
import { processPendingTasksPipeline } from '$lib/server/task-processor-pipeline';

// 处理所有待处理任务
await processPendingTasksPipeline();

// 处理特定任务
await processTaskPipeline(taskId);
```

### 监控和调试

系统提供详细的处理日志：
```
开始流水线处理任务 123: document.pdf
开始OCR处理第 1 页: /path/to/page_001.png
OCR处理完成第 1 页，输出长度: 1234
开始翻译处理第 1 页
翻译处理完成第 1 页，输出长度: 2345
流水线任务 123 处理完成
```

## 开发说明

### 数据库操作
```bash
# 生成迁移文件
bun run db:generate

# 应用迁移
bun run db:push

# 启动数据库管理界面
bun run db:studio
```

### 代码规范
- 使用 TypeScript 进行类型检查
- 使用 Prettier 进行代码格式化
- 使用 ESLint 进行代码检查

```bash
# 类型检查
bun run check

# 代码格式化
bun run format

# 代码检查
bun run lint
```

## 部署说明

### 生产环境构建
```bash
# 构建应用
bun run build

# 预览构建结果
bun run preview
```

### 环境变量配置

系统支持**多环境自动配置**，根据 `NODE_ENV` 自动选择合适的路径配置：

- **开发环境** (`NODE_ENV=development`)：使用相对路径 `uploads/`
- **测试环境** (`NODE_ENV=test`)：使用临时目录 `/tmp/lixin-test/`
- **生产环境** (`NODE_ENV=production`)：使用系统目录 `/opt/lixin/data/`
- **Docker环境** (`DOCKER_ENV=true`)：使用容器路径 `/app/data/`

#### 快速配置示例

复制对应环境的配置文件：
```bash
# 开发环境
cp config/environments/development.example .env

# 生产环境  
cp config/environments/production.example .env

# Docker环境
cp config/environments/docker.example .env
```

#### 手动配置 .env 文件
```env
# 数据库配置
DATABASE_URL="mysql://user:password@localhost:3306/database"

# API服务配置
OCR_API_URL="http://127.0.0.1:8002/v1"
TRANSLATE_API_URL="http://127.0.0.1:8003/v1"

# 环境设置（会自动选择对应的路径配置）
NODE_ENV=development  # development | test | production

# 可选：环境变量覆盖默认路径配置
# PDF_OCR_OUTPUT_DIR="~/data/lixin/ocr"
# PDF_TRANSLATE_OUTPUT_DIR="~/data/lixin/translate"
# PDF_IMAGES_OUTPUT_DIR="~/data/lixin/images"
```

详细配置说明请参考 [CONFIG_GUIDE.md](./CONFIG_GUIDE.md)

## 注意事项

1. **PDF处理**: 当前PDF转图片功能为模拟实现，生产环境需要集成真实的PDF处理库
2. **文件存储**: 文件存储路径现在通过环境变量配置，默认在 `uploads/` 目录下，生产环境建议使用持久化存储
3. **API依赖**: 系统依赖外部OCR和翻译API服务，请确保服务可用性和并发处理能力
4. **流水线处理**: 新的并发处理架构可能增加内存使用，建议监控系统资源
5. **数据库迁移**: 升级到流水线版本需要手动执行数据库迁移，详见 [PIPELINE_MIGRATION_GUIDE.md](./PIPELINE_MIGRATION_GUIDE.md)
6. **安全性**: 生产环境请配置适当的安全策略，如HTTPS、CORS等

### 流水线处理注意事项

- **并发限制**: 注意API服务的并发处理限制，避免过载
- **内存管理**: 大文件处理时注意内存使用情况
- **错误处理**: 单页失败会记录但不中断整体流程
- **进度同步**: 前端需要定期刷新以获取最新进度信息

## 许可证

本项目仅供学习和研究使用。
