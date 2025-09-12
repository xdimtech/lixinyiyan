import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import OpenAI from 'openai';
import * as mupdf from 'mupdf';
import { initializePathConfig } from '$lib/config/paths';
import { promptProvider } from './prompt-provider';

// 从PRD中的配置
const OCR_API_URL =  initializePathConfig().ocrEndpoint;
const TRANSLATE_API_URL = initializePathConfig().translateEndpoint;
const DEFAULT_MODEL = initializePathConfig().ocrModel;
const TRANSLATE_MODEL = initializePathConfig().translateModel;

const SYSTEM_PROMPT = promptProvider.getOcrPrompt() || `## Role
You are a translation expert.
## Your Task
- Identify the original and complete text content from the picture without summarizing, concluding, or translating, and do not discard any words.
- Recognize the Chinese characters around the picture character by character in order (from top to bottom, or from left to right). Keep the Chinese parentheses as they are, retain all the original text, and do not make any modifications, summaries, or overviews.
- If the content of the picture is a table, retain the table layout.
## Output Format
Please output in TXT format.`;

const TRANSLATE_SYSTEM_PROMPT = promptProvider.getTranslatePrompt() || `# 角色
您是一位民国时期的翻译专家，擅长将英文文本翻译为民国时期的表达风格。

# 任务
输入英文文本内容，你需要用民国时期的中文表达进行翻译。你一定要一句一句仔细思考，结合历史背景推敲。

# 背景资料
中华民国的年份范围是从 1912 年 1 月 1 日中华民国成立开始，到 1949 年 10 月 1 日中华人民共和国成立为止， 1949 年 10 月 1 日开始就不是民国时期，按照新中国的普通话直接翻译。

在民国时期，日期表达会使用 “民国纪年”，同时星期的说法与现在一致。“上周日” 可表达为 “上星期日”，若结合具体年份，需将公元年份转换为民国纪年（民国纪年 = 公元年份 - 1911）。

# 技能

- 对于称呼使用"先生"、"女士"。
- 民国时期的表达风格是白话文，参考该时期胡适和鲁迅等人的写作风格。
- 遇到人名如果没有合适的翻译请保留，遇到政治词汇请结合历史背景推测。
-  原文翻译完毕后不要输出任何注释与背景补充，请把注释与背景补充放到你的思考过程中。

- **一定要用简体中文输出，不要用繁体字**`;

/**
 * 将PDF文件转换为图片
 */
export async function pdfToImages(pdfFilePath: string, outputDir: string): Promise<string[]> {
    try {
        const pdfName = basename(pdfFilePath, extname(pdfFilePath));
        const imagesDir = join(outputDir, "images", pdfName);
        await fs.mkdir(imagesDir, { recursive: true });
        
        console.log(`开始将PDF ${pdfFilePath} 转换为图片...`);
        
        // 读取PDF文件
        const pdfData = await fs.readFile(pdfFilePath);
        
        // 使用MuPDF打开PDF文档
        const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
        const pageCount = doc.countPages();
        
        console.log(`PDF共有 ${pageCount} 页`);
        
        const imagePaths: string[] = [];
        
        // 转换每一页
        for (let pageNum = 0; pageNum < pageCount; pageNum++) {
            const page = doc.loadPage(pageNum);
            
            // 设置渲染参数
            const scale = 1.0; // 2倍缩放提高清晰度
            const matrix = mupdf.Matrix.scale(scale, scale);
            
            // 渲染页面为图片
            const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
            
            // 保存为PNG文件
            const imagePath = join(imagesDir, `page_${(pageNum + 1).toString().padStart(3, '0')}.png`);
            const pngData = pixmap.asPNG();
            await fs.writeFile(imagePath, pngData);
            
            imagePaths.push(imagePath);
            console.log(`已转换第 ${pageNum + 1} 页: ${imagePath}`);
            
            // 清理资源
            pixmap.destroy();
            page.destroy();
        }
        
        // 清理文档资源
        doc.destroy();
        
        console.log(`成功转换 ${imagePaths.length} 页图片`);
        return imagePaths;
        
    } catch (error) {
        console.error('PDF转图片失败:', error);
        throw error;
    }
}

/**
 * 调用OCR API进行图片文字识别
 */
export async function callOcrApi(imagePath: string, systemPrompt?: string): Promise<string> {
    try {
        const client = new OpenAI({
            apiKey: "EMPTY",
            baseURL: OCR_API_URL,
            timeout: 60000, // 30秒超时
        });

        // 读取图片文件并转换为base64
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const base64Qwen = `data:image;base64,${base64Image}`;

        const prompt = systemPrompt || SYSTEM_PROMPT;

        const chatResponse = await client.chat.completions.create({
            model: DEFAULT_MODEL,
            temperature: 0.01,
            max_tokens: 30000,
            messages: [
                { role: "system", content: prompt },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Qwen
                            },
                        },
                        { type: "text", text: "Please identify the text in the picture" },
                    ],
                },
            ],
        });

        return chatResponse.choices[0].message.content || '';
    } catch (error) {
        console.error('OCR API调用失败:', error);
        throw error;
    }
}

/**
 * 翻译进度回调类型
 */
export type TranslateProgressCallback = (progress: {
    type: 'reasoning' | 'content';
    content: string;
    fullReasoning?: string;
    fullContent?: string;
}) => void;

/**
 * 调用翻译API（流式输出版本）
 */
export async function callTranslateApi(text: string, systemPrompt?: string, onProgress?: TranslateProgressCallback): Promise<string> {
    try {
        const client = new OpenAI({
            apiKey: "EMPTY",
            baseURL: TRANSLATE_API_URL,
            timeout: 60000, // 60秒超时
        });

        const prompt = systemPrompt || TRANSLATE_SYSTEM_PROMPT;

        // 使用流式输出
        const chatResponse = await (client.chat.completions.create as any)({
            model: TRANSLATE_MODEL,
            temperature: 0.7,
            top_p: 0.8,
            max_tokens: 4096,
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: text }
            ],
            extra_body: {
                "top_k": 20, 
                "chat_template_kwargs": {"enable_thinking": true},
            },
            stream: true,
        });

        let fullResponse = '';
        let reasoningContent = '';

        // 处理流式响应并等待完成
        for await (const chunk of chatResponse) {
            if (chunk.choices && chunk.choices[0]) {
                const delta = chunk.choices[0].delta;
                
                // 处理推理内容
                if (delta?.reasoning_content) {
                    reasoningContent += delta.reasoning_content;
                    // 输出推理过程日志
                    // console.log('翻译推理:', delta.reasoning_content);
                    
                    // 调用进度回调
                    if (onProgress) {
                        onProgress({
                            type: 'reasoning',
                            content: delta.reasoning_content,
                            fullReasoning: reasoningContent,
                            fullContent: fullResponse
                        });
                    }
                }
                
                // 处理主要回复内容
                if (delta?.content) {
                    fullResponse += delta.content;
                    // 输出流式内容日志
                    // console.log('翻译内容:', delta.content);
                    
                    // 调用进度回调
                    if (onProgress) {
                        onProgress({
                            type: 'content',
                            content: delta.content,
                            fullReasoning: reasoningContent,
                            fullContent: fullResponse
                        });
                    }
                }
            }
        }

        console.log(`翻译完成 - 内容长度: ${fullResponse.length}, 推理长度: ${reasoningContent.length}`);
        
        // 如果启用了推理内容，在日志中显示推理总结
        if (reasoningContent) {
            console.log('推理内容预览:', reasoningContent.slice(0, 200) + (reasoningContent.length > 200 ? '...' : ''));
        }
        
        return fullResponse || '';
    } catch (error) {
        console.error('翻译API调用失败:', error);
        throw error;
    }
}

/**
 * 保存文本内容到文件
 */
export async function saveTextToFile(content: string, filePath: string): Promise<void> {
    try {
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        console.error('保存文件失败:', error);
        throw error;
    }
}

/**
 * 创建压缩包
 */
export async function createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    const archiver = (await import('archiver')).default;
    const fs = await import('fs');
    
    console.log(`开始创建压缩包: ${sourceDir} -> ${outputPath}`);
    
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', {
            zlib: { level: 6 } // 降低压缩级别，提高处理速度
        });

        const stream = fs.createWriteStream(outputPath);

        // 只添加.txt文件，不添加图片文件
        archive
            .glob('**/*.txt', { cwd: sourceDir })
            .on('error', (err) => {
                console.error('压缩包创建错误:', err);
                reject(err);
            })
            .pipe(stream);

        stream.on('close', () => {
            console.log(`压缩包创建完成: ${outputPath} (${archive.pointer()} bytes)`);
            resolve();
        });
        stream.on('error', (err) => {
            console.error('文件流错误:', err);
            reject(err);
        });

        archive.finalize();
    });
}

