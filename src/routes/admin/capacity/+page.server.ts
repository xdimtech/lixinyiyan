import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { getPathConfig } from '$lib/config/paths';
import fs from 'fs/promises';
import path from 'path';

interface DirectoryInfo {
  path: string;
  name: string;
  size: number;
  sizeFormatted: string;
  fileCount: number;
  exists: boolean;
  error?: string;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 递归计算目录大小
async function getDirectorySize(dirPath: string): Promise<{ size: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;
  
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return { size: stats.size, fileCount: 1 };
    }
    
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const itemStats = await fs.stat(itemPath);
        
        if (itemStats.isDirectory()) {
          const subDirInfo = await getDirectorySize(itemPath);
          totalSize += subDirInfo.size;
          fileCount += subDirInfo.fileCount;
        } else {
          totalSize += itemStats.size;
          fileCount++;
        }
      } catch (error) {
        // 忽略无法访问的文件/目录
        console.warn(`无法访问: ${itemPath}`, error);
      }
    }
  } catch (error) {
    console.error(`无法访问目录: ${dirPath}`, error);
    throw error;
  }
  
  return { size: totalSize, fileCount };
}

// 获取目录信息
async function getDirectoryInfo(dirPath: string, name: string): Promise<DirectoryInfo> {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return {
        path: dirPath,
        name,
        size: 0,
        sizeFormatted: '0 B',
        fileCount: 0,
        exists: false,
        error: '不是一个目录'
      };
    }
    
    const { size, fileCount } = await getDirectorySize(dirPath);
    
    return {
      path: dirPath,
      name,
      size,
      sizeFormatted: formatFileSize(size),
      fileCount,
      exists: true
    };
  } catch (error) {
    return {
      path: dirPath,
      name,
      size: 0,
      sizeFormatted: '0 B',
      fileCount: 0,
      exists: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

// 清理目录
async function cleanDirectory(dirPath: string): Promise<{ deletedFiles: number; freedSpace: number }> {
  let deletedFiles = 0;
  let freedSpace = 0;
  
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error('不是一个目录');
    }
    
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const itemStats = await fs.stat(itemPath);
        
        if (itemStats.isDirectory()) {
          const subDirResult = await cleanDirectory(itemPath);
          deletedFiles += subDirResult.deletedFiles;
          freedSpace += subDirResult.freedSpace;
          
          // 删除空目录
          try {
            await fs.rmdir(itemPath);
          } catch (error) {
            // 目录可能不为空，忽略错误
          }
        } else {
          freedSpace += itemStats.size;
          await fs.unlink(itemPath);
          deletedFiles++;
        }
      } catch (error) {
        console.warn(`无法删除: ${itemPath}`, error);
      }
    }
  } catch (error) {
    console.error(`无法清理目录: ${dirPath}`, error);
    throw error;
  }
  
  return { deletedFiles, freedSpace };
}

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) {
    throw redirect(302, '/login');
  }

  // 只有管理员可以访问
  if (event.locals.user.role !== 'admin') {
    throw redirect(302, '/');
  }

  try {
    const config = getPathConfig();
    
    // 获取所有目录的容量信息
    const directories = await Promise.all([
      getDirectoryInfo(config.pdfUploadDir, 'PDF上传目录'),
      getDirectoryInfo(config.pdfOutputDir, 'PDF拆分输出目录'),
      getDirectoryInfo(config.imagesOutputDir, 'PDF图片输出目录'),
      getDirectoryInfo(config.ocrOutputDir, 'PDF OCR输出目录'),
      getDirectoryInfo(config.translateOutputDir, 'PDF翻译输出目录'),
      getDirectoryInfo(config.ocrZipOutputDir, 'OCR压缩包输出目录'),
      getDirectoryInfo(config.translateZipOutputDir, '翻译压缩包输出目录')
    ]);
    
    // 计算总容量
    const totalSize = directories.reduce((sum, dir) => sum + dir.size, 0);
    const totalFiles = directories.reduce((sum, dir) => sum + dir.fileCount, 0);
    
    return {
      directories,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalFiles
    };
  } catch (error) {
    console.error('获取容量信息失败:', error);
    return {
      directories: [],
      totalSize: 0,
      totalSizeFormatted: '0 B',
      totalFiles: 0,
      error: '获取容量信息失败'
    };
  }
};

export const actions: Actions = {
  cleanDirectory: async (event) => {
    if (!event.locals.user || event.locals.user.role !== 'admin') {
      return fail(403, { message: '无权限执行此操作' });
    }

    const data = await event.request.formData();
    const directoryPath = data.get('path') as string;
    const directoryName = data.get('name') as string;

    if (!directoryPath) {
      return fail(400, { message: '缺少目录路径参数' });
    }

    try {
      const config = getPathConfig();
      
      // 验证目录路径是否在允许的路径列表中
      const allowedPaths = [
        config.pdfUploadDir,
        config.pdfOutputDir,
        config.imagesOutputDir,
        config.ocrOutputDir,
        config.translateOutputDir,
        config.ocrZipOutputDir,
        config.translateZipOutputDir
      ];
      
      if (!allowedPaths.includes(directoryPath)) {
        return fail(403, { message: '不允许清理此目录' });
      }

      const result = await cleanDirectory(directoryPath);
      
      return {
        success: true,
        message: `成功清理 ${directoryName}: 删除了 ${result.deletedFiles} 个文件，释放了 ${formatFileSize(result.freedSpace)} 空间`,
        deletedFiles: result.deletedFiles,
        freedSpace: formatFileSize(result.freedSpace)
      };
    } catch (error) {
      console.error('清理目录失败:', error);
      return fail(500, { 
        message: `清理 ${directoryName} 失败: ${error instanceof Error ? error.message : '未知错误'}` 
      });
    }
  }
};
