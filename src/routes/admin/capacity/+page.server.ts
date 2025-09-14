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
  isDateBased?: boolean;
  dateSubdirs?: DateDirectoryInfo[];
}

interface DateDirectoryInfo {
  date: string;
  path: string;
  size: number;
  sizeFormatted: string;
  fileCount: number;
  taskCount: number;
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

// 检查日期字符串格式 (YYYY-MM-DD)
function isValidDateString(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false; // 检查是否为有效日期
  return date.toISOString().split('T')[0] === dateStr;
}

// 获取日期目录信息
async function getDateDirectoryInfo(dirPath: string, date: string): Promise<DateDirectoryInfo> {
  const { size, fileCount } = await getDirectorySize(dirPath);
  
  // 计算任务数量（统计task_开头的目录）
  let taskCount = 0;
  try {
    const items = await fs.readdir(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory() && item.startsWith('task_')) {
        taskCount++;
      }
    }
  } catch (error) {
    // 忽略错误
  }
  
  return {
    date,
    path: dirPath,
    size,
    sizeFormatted: formatFileSize(size),
    fileCount,
    taskCount
  };
}

// 获取日期范围内的目录信息
async function getDateBasedDirectoryInfo(basePath: string, name: string, startDate?: string, endDate?: string): Promise<DirectoryInfo> {
  try {
    const stats = await fs.stat(basePath);
    if (!stats.isDirectory()) {
      return {
        path: basePath,
        name,
        size: 0,
        sizeFormatted: '0 B',
        fileCount: 0,
        exists: false,
        error: '不是一个目录',
        isDateBased: true
      };
    }
    
    const items = await fs.readdir(basePath);
    const dateSubdirs: DateDirectoryInfo[] = [];
    let totalSize = 0;
    let totalFileCount = 0;
    
    // 过滤和处理日期目录
    for (const item of items) {
      if (!isValidDateString(item)) continue;
      
      // 如果指定了日期范围，进行过滤
      if (startDate && item < startDate) continue;
      if (endDate && item > endDate) continue;
      
      const itemPath = path.join(basePath, item);
      try {
        const itemStats = await fs.stat(itemPath);
        if (itemStats.isDirectory()) {
          const dateInfo = await getDateDirectoryInfo(itemPath, item);
          dateSubdirs.push(dateInfo);
          totalSize += dateInfo.size;
          totalFileCount += dateInfo.fileCount;
        }
      } catch (error) {
        console.warn(`无法访问日期目录: ${itemPath}`, error);
      }
    }
    
    // 按日期倒序排列（最新的在前面）
    dateSubdirs.sort((a, b) => b.date.localeCompare(a.date));
    
    return {
      path: basePath,
      name,
      size: totalSize,
      sizeFormatted: formatFileSize(totalSize),
      fileCount: totalFileCount,
      exists: true,
      isDateBased: true,
      dateSubdirs
    };
  } catch (error) {
    return {
      path: basePath,
      name,
      size: 0,
      sizeFormatted: '0 B',
      fileCount: 0,
      exists: false,
      error: error instanceof Error ? error.message : '未知错误',
      isDateBased: true
    };
  }
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
    
    // 获取日期范围参数
    const startDate = event.url.searchParams.get('startDate') || undefined;
    const endDate = event.url.searchParams.get('endDate') || undefined;
    
    // 获取所有目录的容量信息
    const directories = await Promise.all([
      getDirectoryInfo(config.pdfUploadDir, 'PDF上传目录'),
      getDirectoryInfo(config.pdfOutputDir, 'PDF拆分输出目录'),
      getDateBasedDirectoryInfo(config.imagesOutputDir, 'PDF图片输出目录', startDate, endDate),
      getDateBasedDirectoryInfo(config.ocrOutputDir, 'OCR结果输出目录', startDate, endDate),
      getDateBasedDirectoryInfo(config.translateOutputDir, '翻译结果输出目录', startDate, endDate),
      getDateBasedDirectoryInfo(config.ocrZipOutputDir, 'OCR压缩包输出目录', startDate, endDate),
      getDateBasedDirectoryInfo(config.translateZipOutputDir, '翻译压缩包输出目录', startDate, endDate)
    ]);
    
    // 计算总容量
    const totalSize = directories.reduce((sum, dir) => sum + dir.size, 0);
    const totalFiles = directories.reduce((sum, dir) => sum + dir.fileCount, 0);
    
    return {
      directories,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalFiles,
      startDate,
      endDate
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
      
      // 验证目录路径是否在允许的路径列表中或是其子目录
      const allowedBasePaths = [
        config.pdfUploadDir,
        config.pdfOutputDir,
        config.imagesOutputDir,
        config.ocrOutputDir,
        config.translateOutputDir,
        config.ocrZipOutputDir,
        config.translateZipOutputDir
      ];
      
      const isAllowed = allowedBasePaths.some(basePath => 
        directoryPath === basePath || directoryPath.startsWith(basePath + path.sep)
      );
      
      if (!isAllowed) {
        return fail(403, { message: '不允许清理此目录' });
      }

      console.log('开始清理目录:', directoryPath);
      const result = await cleanDirectory(directoryPath);
      console.log('清理完成:', result);
      
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
  },
  
  cleanDateRange: async (event) => {
    if (!event.locals.user || event.locals.user.role !== 'admin') {
      return fail(403, { message: '无权限执行此操作' });
    }

    const data = await event.request.formData();
    const basePath = data.get('basePath') as string;
    const directoryName = data.get('name') as string;
    const startDate = data.get('startDate') as string;
    const endDate = data.get('endDate') as string;

    if (!basePath || !startDate || !endDate) {
      return fail(400, { message: '缺少必要参数' });
    }

    try {
      const config = getPathConfig();
      
      // 验证基础路径
      const allowedBasePaths = [
        config.imagesOutputDir,
        config.ocrOutputDir,
        config.translateOutputDir,
        config.ocrZipOutputDir,
        config.translateZipOutputDir
      ];
      
      if (!allowedBasePaths.includes(basePath)) {
        return fail(403, { message: '不允许清理此目录' });
      }

      let totalDeletedFiles = 0;
      let totalFreedSpace = 0;
      let processedDates = 0;

      console.log(`开始清理日期范围: ${startDate} 到 ${endDate}`);
      
      // 获取基础目录下的所有日期目录
      const items = await fs.readdir(basePath);
      for (const item of items) {
        if (!isValidDateString(item)) continue;
        if (item < startDate || item > endDate) continue;
        
        const dateDir = path.join(basePath, item);
        try {
          const stats = await fs.stat(dateDir);
          if (stats.isDirectory()) {
            console.log(`清理日期目录: ${dateDir}`);
            const result = await cleanDirectory(dateDir);
            totalDeletedFiles += result.deletedFiles;
            totalFreedSpace += result.freedSpace;
            processedDates++;
            
            // 删除空的日期目录
            try {
              await fs.rmdir(dateDir);
            } catch (error) {
              // 目录可能不为空，忽略错误
            }
          }
        } catch (error) {
          console.warn(`无法处理日期目录: ${dateDir}`, error);
        }
      }
      
      return {
        success: true,
        message: `成功清理 ${directoryName} (${startDate} 到 ${endDate}): 处理了 ${processedDates} 个日期，删除了 ${totalDeletedFiles} 个文件，释放了 ${formatFileSize(totalFreedSpace)} 空间`,
        deletedFiles: totalDeletedFiles,
        freedSpace: formatFileSize(totalFreedSpace),
        processedDates
      };
    } catch (error) {
      console.error('清理日期范围失败:', error);
      return fail(500, { 
        message: `清理 ${directoryName} 日期范围失败: ${error instanceof Error ? error.message : '未知错误'}` 
      });
    }
  }
};
