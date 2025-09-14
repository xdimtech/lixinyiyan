#!/usr/bin/env node

// 测试日期路径生成逻辑
import { join } from 'path';

// 模拟任务创建时间
const mockTask = {
  id: 123,
  createdAt: new Date('2025-09-12T14:30:00Z'),
  fileName: 'test.pdf'
};

// 模拟基础路径
const mockPaths = {
  imagesOutputDir: 'uploads/images',
  ocrOutputDir: 'uploads/ocr',
  translateOutputDir: 'uploads/translate',
  ocrZipOutputDir: 'uploads/ocr-zip',
  translateZipOutputDir: 'uploads/translate-zip'
};

// 测试日期路径生成
function testDatePaths() {
  console.log('🧪 测试日期路径生成逻辑\n');
  
  // 格式化任务创建日期为 YYYY-MM-DD 格式
  const taskDate = new Date(mockTask.createdAt);
  const dateString = taskDate.toISOString().split('T')[0]; // 格式: 2025-09-12
  
  console.log(`📅 任务创建时间: ${mockTask.createdAt}`);
  console.log(`📅 格式化日期: ${dateString}\n`);
  
  // 生成各种路径
  const paths = {
    images: join(mockPaths.imagesOutputDir, dateString, `task_${mockTask.id}`),
    ocr: join(mockPaths.ocrOutputDir, dateString, `task_${mockTask.id}`),
    translate: join(mockPaths.translateOutputDir, dateString, `task_${mockTask.id}`),
    ocrZip: join(mockPaths.ocrZipOutputDir, dateString, `task_${mockTask.id}`),
    translateZip: join(mockPaths.translateZipOutputDir, dateString, `task_${mockTask.id}`)
  };
  
  console.log('📁 生成的路径结构:');
  Object.entries(paths).forEach(([type, path]) => {
    console.log(`  ${type.padEnd(12)}: ${path}`);
  });
  
  console.log('\n✅ 路径生成测试完成');
}

// 测试日期字符串验证
function testDateValidation() {
  console.log('\n🧪 测试日期字符串验证\n');
  
  // 日期验证函数
  function isValidDateString(dateStr) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false; // 检查是否为有效日期
    return date.toISOString().split('T')[0] === dateStr;
  }
  
  const testCases = [
    '2025-09-12',  // 有效
    '2025-09-32',  // 无效（日期不存在）
    '2025-13-01',  // 无效（月份不存在）
    '25-09-12',    // 无效（年份格式）
    '2025/09/12',  // 无效（分隔符）
    '2025-9-12',   // 无效（没有前导零）
    '2025-09-1'    // 无效（没有前导零）
  ];
  
  testCases.forEach(dateStr => {
    const isValid = isValidDateString(dateStr);
    console.log(`  ${dateStr.padEnd(12)}: ${isValid ? '✅ 有效' : '❌ 无效'}`);
  });
  
  console.log('\n✅ 日期验证测试完成');
}

// 运行测试
testDatePaths();
testDateValidation();
