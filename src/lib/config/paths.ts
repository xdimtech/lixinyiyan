import { join } from 'path';
import { homedir } from 'os';

// 环境类型定义
export type Environment = 'development' | 'test' | 'production' | 'docker';

// 路径配置接口
export interface PathConfig {
  // PDF相关路径
  pdfUploadDir: string;
  pdfOutputDir: string;
  
  // OCR和翻译路径
  ocrOutputDir: string;
  ocrZipOutputDir: string;
  translateZipOutputDir: string;
  translateOutputDir: string;
  imagesOutputDir: string;
  
  // 日志路径
  logDir?: string;
  
  // 临时文件路径
  tempDir?: string;

  // ocr endpoint
  ocrEndpoint: string;
  ocrModel: string;
  translateEndpoint: string;
  translateModel: string;
}

// 路径处理函数：支持 ~ 符号扩展
function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

// 各环境的路径配置
const pathConfigs: Record<Environment, PathConfig> = {
  // 开发环境 - 使用相对路径或用户目录
  development: {
    pdfUploadDir: 'uploads/files',
    pdfOutputDir: 'uploads/pdf-split',
    ocrOutputDir: 'uploads/ocr',
    ocrZipOutputDir: 'uploads/ocr-zip',
    translateZipOutputDir: 'uploads/translate-zip',
    translateOutputDir: 'uploads/translate',
    imagesOutputDir: 'uploads/images',
    logDir: 'logs',
    tempDir: 'temp',
    ocrEndpoint: 'http://127.0.0.1:8002/v1',
    ocrModel: 'Qwen/Qwen2.5-VL-7B-Instruct',
    translateEndpoint: 'http://127.0.0.1:8003/v1',
    translateModel: 'Qwen/Qwen3-14B-FP8'
  },

  // 测试环境 - 使用临时目录，便于清理
  test: {
    pdfUploadDir: '/tmp/lixin-test/uploads',
    pdfOutputDir: '/tmp/lixin-test/pdf-split',
    ocrOutputDir: '/tmp/lixin-test/ocr',
    ocrZipOutputDir: '/tmp/lixin-test/ocr-zip',
    translateZipOutputDir: '/tmp/lixin-test/translate-zip',
    translateOutputDir: '/tmp/lixin-test/translate',
    imagesOutputDir: '/tmp/lixin-test/images',
    logDir: '/tmp/lixin-test/logs',
    tempDir: '/tmp/lixin-test/temp',
    ocrEndpoint: 'http://127.0.0.1:8002/v1',
    ocrModel: 'Qwen/Qwen2.5-VL-7B-Instruct',
    translateEndpoint: 'http://127.0.0.1:8003/v1',
    translateModel: 'Qwen/Qwen3-14B-FP8'
  },

  // 生产环境 - 使用标准的系统目录
  production: {
    pdfUploadDir: '/opt/lixin/data/uploads',
    pdfOutputDir: '/opt/lixin/data/pdf-split',
    ocrOutputDir: '/opt/lixin/data/ocr',
    ocrZipOutputDir: '/opt/lixin/data/ocr-zip',
    translateZipOutputDir: '/opt/lixin/data/translate-zip',
    translateOutputDir: '/opt/lixin/data/translate',
    imagesOutputDir: '/opt/lixin/data/images',
    logDir: '/var/log/lixin',
    tempDir: '/tmp/lixin',
    ocrEndpoint: 'http://127.0.0.1:8002/v1',
    ocrModel: 'Qwen/Qwen2.5-VL-7B-Instruct',
    translateEndpoint: 'http://127.0.0.1:8003/v1',
    translateModel: 'Qwen/Qwen3-14B-FP8'
  },

  // Docker环境 - 使用容器内路径
  docker: {
    pdfUploadDir: '/app/data/uploads',
    pdfOutputDir: '/app/data/pdf-split',
    ocrOutputDir: '/app/data/ocr',
    ocrZipOutputDir: '/app/data/ocr-zip',
    translateZipOutputDir: '/app/data/translate-zip',
    translateOutputDir: '/app/data/translate',
    imagesOutputDir: '/app/data/images',
    logDir: '/app/logs',
    tempDir: '/app/temp',
    ocrEndpoint: 'http://127.0.0.1:8002/v1',
    ocrModel: 'Qwen/Qwen2.5-VL-7B-Instruct',
    translateEndpoint: 'http://127.0.0.1:8003/v1',
    translateModel: 'Qwen/Qwen3-14B-FP8'
  }
};

// 获取当前环境
function getCurrentEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV as Environment;
  
  // Docker环境检测
  if (process.env.DOCKER_ENV === 'true' || process.env.IS_DOCKER === 'true') {
    return 'docker';
  }
  
  // 根据NODE_ENV确定环境
  if (['development', 'test', 'production'].includes(nodeEnv)) {
    return nodeEnv;
  }
  
  // 默认开发环境
  return 'development';
}

// 从环境变量覆盖配置
function applyEnvironmentOverrides(config: PathConfig): PathConfig {
  const overrides: Partial<PathConfig> = {};
  
  // 检查环境变量覆盖
  if (process.env.PDF_UPLOAD_DIR) {
    overrides.pdfUploadDir = expandPath(process.env.PDF_UPLOAD_DIR);
  }
  
  if (process.env.PDF_OUTPUT_DIR) {
    overrides.pdfOutputDir = expandPath(process.env.PDF_OUTPUT_DIR);
  }
  
  if (process.env.PDF_OCR_OUTPUT_DIR) {
    overrides.ocrOutputDir = expandPath(process.env.PDF_OCR_OUTPUT_DIR);
  }
  
  if (process.env.PDF_TRANSLATE_OUTPUT_DIR) {
    overrides.translateOutputDir = expandPath(process.env.PDF_TRANSLATE_OUTPUT_DIR);
  }
  
  if (process.env.PDF_IMAGES_OUTPUT_DIR) {
    overrides.imagesOutputDir = expandPath(process.env.PDF_IMAGES_OUTPUT_DIR);
  }
  
  if (process.env.LOG_DIR) {
    overrides.logDir = expandPath(process.env.LOG_DIR);
  }
  
  if (process.env.TEMP_DIR) {
    overrides.tempDir = expandPath(process.env.TEMP_DIR);
  }
  
  return {
    ...config,
    ...overrides
  };
}

// 获取路径配置
export function getPathConfig(): PathConfig {
  const env = getCurrentEnvironment();
  const baseConfig = pathConfigs[env];
  const finalConfig = applyEnvironmentOverrides(baseConfig);
  
  // 扩展所有路径中的 ~ 符号
  const expandedConfig: PathConfig = {
    pdfUploadDir: expandPath(finalConfig.pdfUploadDir),
    pdfOutputDir: expandPath(finalConfig.pdfOutputDir),
    ocrOutputDir: expandPath(finalConfig.ocrOutputDir),
    translateOutputDir: expandPath(finalConfig.translateOutputDir),
    imagesOutputDir: expandPath(finalConfig.imagesOutputDir),
    ocrZipOutputDir: expandPath(finalConfig.ocrZipOutputDir),
    translateZipOutputDir: expandPath(finalConfig.translateZipOutputDir),
    logDir: finalConfig.logDir ? expandPath(finalConfig.logDir) : undefined,
    tempDir: finalConfig.tempDir ? expandPath(finalConfig.tempDir) : undefined,
    ocrEndpoint: finalConfig.ocrEndpoint,
    ocrModel: finalConfig.ocrModel,
    translateEndpoint: finalConfig.translateEndpoint,
    translateModel: finalConfig.translateModel
  };
  
  return expandedConfig;
}

// 获取当前环境名称
export function getEnvironment(): Environment {
  return getCurrentEnvironment();
}

// 初始化配置并打印日志
export function initializePathConfig(): PathConfig {
  const env = getEnvironment();
  const config = getPathConfig();
  
  console.log('🔧 路径配置初始化完成');
  console.log('📍 当前环境:', env);
  console.log('📁 路径配置:');
  console.log('  PDF上传目录:', config.pdfUploadDir);
  console.log('  PDF输出目录:', config.pdfOutputDir);
  console.log('  OCR输出目录:', config.ocrOutputDir);
  console.log('  翻译输出目录:', config.translateOutputDir);
  console.log('  图片输出目录:', config.imagesOutputDir);
  console.log('  OCR压缩包输出目录:', config.ocrZipOutputDir);
  console.log('  Translate压缩包输出目录:', config.translateZipOutputDir);
  console.log('  OCR endpoint:', config.ocrEndpoint);
  console.log('  OCR model:', config.ocrModel);
  console.log('  Translate endpoint:', config.translateEndpoint);
  console.log('  Translate model:', config.translateModel);
  if (config.logDir) {
    console.log('  日志目录:', config.logDir);
  }
  
  if (config.tempDir) {
    console.log('  临时目录:', config.tempDir);
  }
  
  console.log('🏠 用户Home目录:', homedir());
  
  return config;
}

// 导出单例配置
export const pathConfig = getPathConfig();

// 便捷导出
export const {
  pdfUploadDir,
  pdfOutputDir,
  ocrOutputDir,
  ocrZipOutputDir,
  translateOutputDir,
  translateZipOutputDir,
  imagesOutputDir,
  logDir,
  tempDir,
  ocrEndpoint,
  ocrModel,
  translateEndpoint,
  translateModel
} = pathConfig;
