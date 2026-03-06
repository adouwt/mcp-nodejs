import { getTokenByUsername, verifyToken } from './src/userService.js';

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];
const arg3 = process.argv[5];

async function runTests() {
if (!command) {
  // 自动化测试模式
  console.log('运行自动化测试...');
  
  try {
    // 测试登录功能
    console.log('\n=== 测试登录功能 ===');
    const loginResult = await getTokenByUsername('testuser', 'testpass', 'testapp');
    console.log('✓ 登录测试通过');
    
    // 测试token校验功能
    console.log('\n=== 测试token校验功能 ===');
    const verifyResult = await verifyToken(loginResult.token);
    if (verifyResult.valid) {
      console.log('✓ token校验测试通过');
    } else {
      throw new Error('token校验失败');
    }
    
    console.log('\n✓ 所有测试通过');
    process.exit(0);
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    process.exit(1);
  }
}

try {
  if (command === 'login') {
    if (!arg1 || !arg2 || !arg3) {
      console.log('错误: 登录需要提供用户名、密码和产品名称');
      process.exit(1);
    }
    const result = await getTokenByUsername(arg1, arg2, arg3);
    console.log('\n=== 登录结果 ===');
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'verify') {
    if (!arg1) {
      console.log('错误: 校验需要提供token');
      process.exit(1);
    }
    const result = await verifyToken(arg1);
    console.log('\n=== 校验结果 ===');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('未知命令:', command);
  }
} catch (error) {
  console.error('错误:', error.message);
}
}

// 运行测试
runTests().catch(error => {
  console.error('运行测试失败:', error.message);
  process.exit(1);
});
