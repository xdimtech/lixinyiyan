import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import OpenAI from 'openai';
import * as mupdf from 'mupdf';

// 从PRD中的配置
const OCR_API_URL = "http://127.0.0.1:8002/v1";
const TRANSLATE_API_URL = "http://127.0.0.1:8003/v1";
const DEFAULT_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct";
const TRANSLATE_MODEL = "Qwen/Qwen3-14B-FP8";

// 从环境变量获取目录配置
const PDF_IMAGES_OUTPUT_DIR = process.env.PDF_IMAGES_OUTPUT_DIR || 'uploads/images';

const SYSTEM_PROMPT = `## Role
You are a translation expert.
## Your Task
- Identify the original and complete text content from the picture without summarizing, concluding, or translating, and do not discard any words.
- Recognize the Chinese characters around the picture character by character in order (from top to bottom, or from left to right). Keep the Chinese parentheses as they are, retain all the original text, and do not make any modifications, summaries, or overviews.
- If the content of the picture is a table, retain the table layout.
## Output Format
Please output in TXT format.`;

const TRANSLATE_SYSTEM_PROMPT = `把下面这段话，翻译成中文，要求符合**民国时期**的表达方式。
翻译时注意事项：
对于称呼：男性称呼先生，女性称呼女士
对于日期：使用民国日期
对于语言表达：民国时期的表达风格是文言文与白话文的交叉使用
注意遇到人名要准确翻译。`;

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
 * 调用翻译API
 */
export async function callTranslateApi(text: string, systemPrompt?: string): Promise<string> {
    try {
        const client = new OpenAI({
            apiKey: "EMPTY",
            baseURL: TRANSLATE_API_URL,
            timeout: 60000, // 30秒超时
        });

        const prompt = systemPrompt || TRANSLATE_SYSTEM_PROMPT;

        const chatResponse = await client.chat.completions.create({
            model: TRANSLATE_MODEL,
            temperature: 0.7,
            top_p: 0.8,
            max_tokens: 4096,
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: text }
            ]
        });

        return chatResponse.choices[0].message.content || '';
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

