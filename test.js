import { getTokenByUsername } from './src/userService.js';

const username = process.argv[2];

if (!username) {
  console.log('用法: node test.js <用户名>');
  console.log('示例: node test.js zhangsan');
  process.exit(1);
}

try {
  const result = getTokenByUsername(username);
  console.log('\n=== 结果 ===');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('错误:', error.message);
}
