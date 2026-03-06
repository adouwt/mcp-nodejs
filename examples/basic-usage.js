// 基本使用示例
import { LoginRegisterClient, login, verifyToken } from '../lib/client.js';

async function basicExample() {
  console.log('=== 基本使用示例 ===\n');

  try {
    // 方式 1: 使用便捷函数（推荐）
    console.log('1. 用户登录/注册:');
    const loginResult = await login('testuser', 'password123', 'myapp');
    console.log('登录结果:', loginResult);
    
    console.log('\n2. 校验 token:');
    const verifyResult = await verifyToken(loginResult.token);
    console.log('校验结果:', verifyResult);

    // 方式 2: 使用客户端实例（适合需要多次调用的场景）
    console.log('\n3. 使用客户端实例:');
    const client = new LoginRegisterClient();
    
    await client.connect();
    
    // 登录另一个用户
    const user2Result = await client.login('user2', 'pass456', 'myapp');
    console.log('用户2登录:', user2Result);
    
    // 校验用户2的token
    const user2Verify = await client.verifyToken(user2Result.token);
    console.log('用户2校验:', user2Verify);
    
    await client.disconnect();

  } catch (error) {
    console.error('错误:', error.message);
  }
}

// 演示不同产品的相同用户名
async function multiProductExample() {
  console.log('\n=== 多产品示例 ===\n');

  try {
    // 同一用户名在不同产品下注册
    const app1Result = await login('admin', 'secret123', 'app1');
    console.log('App1 中的 admin:', app1Result);

    const app2Result = await login('admin', 'different456', 'app2');
    console.log('App2 中的 admin:', app2Result);

    // 校验两个不同的 token
    const app1Verify = await verifyToken(app1Result.token);
    const app2Verify = await verifyToken(app2Result.token);
    
    console.log('App1 admin 校验:', app1Verify);
    console.log('App2 admin 校验:', app2Verify);

  } catch (error) {
    console.error('错误:', error.message);
  }
}

// 运行示例
async function main() {
  await basicExample();
  await multiProductExample();
}

main().catch(console.error);
