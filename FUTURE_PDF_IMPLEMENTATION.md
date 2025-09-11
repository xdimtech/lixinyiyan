# 完整PDF页面提取实现计划

## 当前状态

✅ **已实现的功能**：
- PDF文件上传和验证
- PDF按页拆分为高质量图片
- 图片预览和选择界面
- 页面选择状态管理
- PDF导出下载（当前返回完整PDF + 选择信息记录）

⚠️ **限制说明**：
- 当前版本导出包含所有页面的PDF文件
- 页面选择信息保存为txt文件供参考
- 由于Node.js版本兼容性问题，暂未实现真正的页面提取

## 未来实现方案

### 方案1: 使用PDF-lib库 (推荐)

```bash
# 升级Node.js版本后安装
npm install pdf-lib
```

**实现代码示例**：
```javascript
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

export async function createPdfFromPages(originalPdfPath, selectedPageIds, taskId) {
    // 读取原始PDF
    const existingPdfBytes = await fs.readFile(originalPdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // 创建新PDF
    const newPdfDoc = await PDFDocument.create();
    
    // 复制选中的页面
    for (const pageId of selectedPageIds) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageId - 1]);
        newPdfDoc.addPage(copiedPage);
    }
    
    // 保存新PDF
    const pdfBytes = await newPdfDoc.save();
    const outputPath = join('uploads/pdf-split', taskId, 'exported.pdf');
    await fs.writeFile(outputPath, pdfBytes);
    
    return outputPath;
}
```

### 方案2: 使用外部服务

**Docker容器方案**：
```dockerfile
FROM python:3.9
RUN pip install PyPDF2 pdf2image
# 创建PDF处理服务
```

**微服务API**：
```javascript
// 调用外部PDF处理服务
const response = await fetch('http://pdf-service:8080/extract-pages', {
    method: 'POST',
    body: formData
});
```

### 方案3: 使用命令行工具

**PDFtk方案**：
```bash
# 使用PDFtk命令行工具
pdftk input.pdf cat 1 3 5-7 output selected.pdf
```

**在Node.js中调用**：
```javascript
import { exec } from 'child_process';

export async function extractPagesWithPdfTk(inputPath, pages, outputPath) {
    const pageRange = pages.join(' ');
    const command = `pdftk "${inputPath}" cat ${pageRange} output "${outputPath}"`;
    
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(outputPath);
        });
    });
}
```

## 实施步骤

### 阶段1: 环境升级
1. 升级Node.js到兼容版本 (22.12+)
2. 安装PDF-lib库
3. 更新依赖配置

### 阶段2: 核心功能实现
1. 实现真正的页面提取函数
2. 更新PDF导出API
3. 测试页面选择和导出

### 阶段3: 优化和增强
1. 添加页面重排功能
2. 支持页面旋转
3. 添加水印功能
4. 批量处理支持

## 临时解决方案

当前实现提供了：
1. **完整的用户体验流程**
2. **页面选择功能验证**
3. **选择信息记录**（txt文件）
4. **PDF下载功能**（完整文档）

用户可以：
- 查看所有页面的图片预览
- 选择需要的页面
- 导出PDF（当前包含所有页面）
- 获得页面选择记录文件

## 测试清单

- [ ] PDF上传功能
- [ ] PDF拆分为图片
- [ ] 图片展示和加载
- [ ] 页面选择交互
- [ ] 批量选择操作
- [ ] PDF导出和下载
- [ ] 错误处理
- [ ] 用户反馈提示

## 预期效果

实现完整功能后，用户将能够：
1. 上传任意PDF文件
2. 预览所有页面
3. 自由选择需要的页面
4. 导出包含选中页面的新PDF
5. 按原始顺序或自定义顺序排列页面
