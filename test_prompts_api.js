// 简单的 API 测试脚本
const BASE_URL = 'http://localhost:5173';

async function testPromptsAPI() {
    console.log('🧪 测试提示词管理 API...\n');
    
    try {
        // 测试获取提示词
        const response = await fetch(`${BASE_URL}/api/prompts`);
        const data = await response.json();
        
        console.log('📊 获取提示词结果:');
        console.log('状态码:', response.status);
        console.log('响应数据:', JSON.stringify(data, null, 2));
        
        if (response.status === 401) {
            console.log('✅ 权限检查正常 - 未登录用户被拒绝访问');
        } else if (response.ok && data.success) {
            console.log('✅ API 响应成功');
        } else {
            console.log('❌ API 响应异常');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 如果是直接运行此脚本
if (typeof window === 'undefined') {
    testPromptsAPI();
}

export { testPromptsAPI };
