import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import OpenAI from 'openai';

// 从PRD中的配置
const OCR_API_URL = "http://127.0.0.1:8002/v1";
const TRANSLATE_API_URL = "http://127.0.0.1:8003/v1";
const DEFAULT_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct";
const TRANSLATE_MODEL = "Qwen/Qwen3-14B-FP8";
const DEFAULT_OUTPUT_DIR = "/tmp/output_dir";

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
        // 注意：这里需要安装pdf2pic或类似的库来实现PDF转图片
        // 由于pdf2pic在Node.js环境中可能有兼容性问题，这里提供一个模拟实现
        
        const pdfName = basename(pdfFilePath, extname(pdfFilePath));
        const imagesDir = join(outputDir, "images", pdfName);
        await fs.mkdir(imagesDir, { recursive: true });
        
        // 模拟PDF转图片的过程
        // 实际实现中需要使用PDF解析库
        console.log(`模拟将PDF ${pdfFilePath} 转换为图片...`);
        
        // 这里返回模拟的图片路径
        // 实际实现中应该调用PDF转图片的库
        const imagePaths: string[] = [];
        
        // 模拟生成3页图片
        for (let i = 1; i <= 3; i++) {
            const imagePath = join(imagesDir, `page_${i.toString().padStart(3, '0')}.png`);
            imagePaths.push(imagePath);
            // 创建一个空文件作为占位符
            await fs.writeFile(imagePath, Buffer.from('placeholder'));
        }
        
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
            ],
            extra_body: {
                top_k: 20,
                enable_thinking: false,
            }
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
    
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const stream = require('fs').createWriteStream(outputPath);

        archive
            .directory(sourceDir, false)
            .on('error', reject)
            .pipe(stream);

        stream.on('close', resolve);
        stream.on('error', reject);

        archive.finalize();
    });
}
