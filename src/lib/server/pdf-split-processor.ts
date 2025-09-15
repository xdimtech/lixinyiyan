import { promises as fs } from 'fs';
import { join, dirname, basename, extname, parse } from 'path';
import * as mupdf from 'mupdf';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import { pdfOutputDir } from '$lib/config/paths';

export interface PageImage {
    id: number;
    name: string;
    url: string;
    selected: boolean;
    path: string;
}

/**
 * 将PDF文件拆分为图片页面
 */
export async function splitPdfToImages(pdfFilePath: string, taskId: string): Promise<PageImage[]> {
    try {
        const outputDir = join(pdfOutputDir, taskId);
        await fs.mkdir(outputDir, { recursive: true });
        
        console.log(`开始拆分PDF ${pdfFilePath} 为图片...`);
        
        // 读取PDF文件
        const pdfData = await fs.readFile(pdfFilePath);
        
        // 使用MuPDF打开PDF文档
        const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
        const pageCount = doc.countPages();
        
        console.log(`PDF共有 ${pageCount} 页`);
        
        const pageImages: PageImage[] = [];
        
        // 转换每一页
        for (let pageNum = 0; pageNum < pageCount; pageNum++) {
            const page = doc.loadPage(pageNum);
            
            // 设置渲染参数，较高分辨率用于预览
            const scale = 1.0;
            const matrix = mupdf.Matrix.scale(scale, scale);
            
            // 渲染页面为图片
            const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
            
            // 保存为JPEG文件（体积更小，适合预览）
            const imageName = `page_${(pageNum + 1).toString().padStart(3, '0')}.jpg`;
            const imagePath = join(outputDir, imageName);
            const jpegData = pixmap.asJPEG(80); // 80%质量
            await fs.writeFile(imagePath, jpegData);
            
            pageImages.push({
                id: pageNum + 1,
                name: imageName,
                url: `/api/pdf-split/${taskId}/${imageName}`,
                selected: true, // 默认选中
                path: imagePath
            });
            
            console.log(`已转换第 ${pageNum + 1} 页: ${imagePath}`);
            
            // 清理资源
            pixmap.destroy();
            page.destroy();
        }
        
        // 清理文档资源
        doc.destroy();
        
        console.log(`成功拆分 ${pageImages.length} 页图片`);
        return pageImages;
        
    } catch (error) {
        console.error('PDF拆分失败:', error);
        throw error;
    }
}

/**
 * 根据选中的页面重新生成PDF
 * 使用PDF-lib库实现真正的页面提取和重组
 */
export async function createPdfFromPages(originalPdfPath: string, selectedPageIds: number[], taskId: string, originalFileName?: string): Promise<string> {
    try {
        // 生成导出文件名
        let exportFileName = 'exported.pdf';
        if (originalFileName) {
            // 生成16位随机UUID
            const shortUUID = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            // 获取原文件名（不含扩展名）
            const originalName = parse(originalFileName).name;
            // 格式：原文件名_16位UUID.pdf
            exportFileName = `${originalName}_${shortUUID}.pdf`;
        }
        
        await fs.mkdir(join(pdfOutputDir, taskId), { recursive: true });
        const outputPath = join(pdfOutputDir, taskId, exportFileName);
        
        console.log(`开始使用PDF-lib提取页面: ${selectedPageIds.join(', ')}`);
        
        // 读取原始PDF文件
        const existingPdfBytes = await fs.readFile(originalPdfPath);
        
        // 使用PDF-lib加载原始PDF文档
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        
        // 创建新的PDF文档
        const newPdfDoc = await PDFDocument.create();
        
        // 获取原PDF的总页数
        const totalPages = pdfDoc.getPageCount();
        console.log(`原PDF总页数: ${totalPages}`);
        
        // 验证并过滤有效的页面ID
        const validPageIds = selectedPageIds.filter(pageId => pageId >= 1 && pageId <= totalPages);
        
        if (validPageIds.length === 0) {
            throw new Error('没有有效的页面可以提取');
        }
        
        console.log(`有效页面: ${validPageIds.join(', ')}`);
        
        // 复制选中的页面到新PDF文档
        for (const pageId of validPageIds) {
            const pageIndex = pageId - 1; // 转换为0基索引
            
            // 从原PDF复制页面
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
            
            // 添加到新PDF
            newPdfDoc.addPage(copiedPage);
            
            console.log(`已复制第 ${pageId} 页`);
        }
        
        // 保存新PDF（启用压缩优化）
        const pdfBytes = await newPdfDoc.save({
            useObjectStreams: true,   // 启用对象流压缩（减小文件大小）
            addDefaultPage: false,    // 不添加默认页面
            objectsPerTick: 50,       // 控制处理速度
        });
        await fs.writeFile(outputPath, pdfBytes);
        
        // 创建页面选择信息文件
        const infoContent = `PDF页面提取报告
========================

原始文件: ${basename(originalPdfPath)}
原始页数: ${totalPages}
选中页面: ${selectedPageIds.join(', ')}
有效页面: ${validPageIds.join(', ')}
创建时间: ${new Date().toISOString()}

提取结果: 成功创建包含 ${validPageIds.length} 页的新PDF文档
`;
        
        const txtPath = join(pdfOutputDir, taskId, 'extraction_info.txt');
        await fs.writeFile(txtPath, infoContent, 'utf8');
        
        console.log(`✅ PDF页面提取完成: ${outputPath}`);
        console.log(`📄 包含页面: ${validPageIds.join(', ')} (共${validPageIds.length}页)`);
        console.log(`📋 信息文件: ${txtPath}`);
        
        return outputPath;
        
    } catch (error) {
        console.error('❌ PDF页面提取失败:', error);
        
        // 回退策略：复制原始PDF
        console.log('🔄 回退到复制原始PDF');
        // 生成回退文件名，如果有原文件名则使用，否则使用默认
        let fallbackFileName = 'exported.pdf';
        if (originalFileName) {
            const shortUUID = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            const originalName = parse(originalFileName).name;
            fallbackFileName = `${originalName}_${shortUUID}.pdf`;
        }
        
        await fs.mkdir(join(pdfOutputDir, taskId), { recursive: true });
        const outputPath = join(pdfOutputDir, taskId, fallbackFileName);
        const originalData = await fs.readFile(originalPdfPath);
        await fs.writeFile(outputPath, originalData);
        
        // 创建错误信息文件
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorInfo = `PDF页面提取失败
====================

错误信息: ${errorMessage}
时间: ${new Date().toISOString()}
回退方案: 返回完整原始PDF文档

注意: 由于技术问题，此次导出包含了原始PDF的所有页面。
`;
        
        const errorPath = join(pdfOutputDir, taskId, 'error_info.txt');
        await fs.writeFile(errorPath, errorInfo, 'utf8');
        
        return outputPath;
    }
}

/**
 * 清理任务相关的临时文件
 */
export async function cleanupTaskFiles(taskId: string): Promise<void> {
    try {
        const taskDir = join(process.env.PDF_OUTPUT_DIR || 'uploads/pdf-split', taskId);
        await fs.rm(taskDir, { recursive: true, force: true });
        console.log(`已清理任务文件: ${taskDir}`);
    } catch (error) {
        console.error('清理文件失败:', error);
        // 清理失败不影响主流程
    }
}
