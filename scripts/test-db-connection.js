#!/usr/bin/env node

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };

  console.log('\n测试数据库连接:', {
    ...config,
    password: config.password ? '***' : '(空)'
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('✓ 连接成功！');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log('✓ MySQL 版本:', rows[0].version);
    
    // 显示数据库列表
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('✓ 可用数据库:', databases.map(db => db.Database).join(', '));
    
    await connection.end();
    
    // 如果成功，创建目标数据库
    console.log('\n尝试创建目标数据库...');
    const connection2 = await mysql.createConnection(config);
    await connection2.execute('CREATE DATABASE IF NOT EXISTS `db_login_register_mcp` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ 数据库 db_login_register_mcp 创建成功');
    await connection2.end();
    
    return config;
    
  } catch (error) {
    console.log('✗ 连接失败:', error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection()
    .then(workingConfig => {
      console.log('\n🎉 数据库连接测试成功');
      console.log('配置已从 .env 文件读取');
    })
    .catch(error => {
      console.error('\n❌ 数据库连接测试失败:', error.message);
      console.log('\n请检查以下事项:');
      console.log('1. MySQL 服务是否正在运行');
      console.log('2. root 用户的密码是否正确');
      console.log('3. MySQL 是否允许本地连接');
      console.log('\n常见解决方案:');
      console.log('- 启动 MySQL: brew services start mysql (macOS)');
      console.log('- 重置 root 密码: mysqladmin -u root password "123456"');
      console.log('- 或者使用空密码: mysqladmin -u root password ""');
    });
}

export { testConnection };
