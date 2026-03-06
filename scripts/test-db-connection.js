#!/usr/bin/env node

import mysql from 'mysql2/promise';

async function testConnection() {
  const configs = [
    // 配置1：不指定数据库
    {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123456'
    },
    // 配置2：使用空密码
    {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: ''
    },
    // 配置3：使用默认配置
    {
      host: 'localhost',
      port: 3306,
      user: 'root'
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`\n测试配置 ${i + 1}:`, {
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
      await connection2.execute('CREATE DATABASE IF NOT EXISTS `login_register_mcp` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✓ 数据库 login_register_mcp 创建成功');
      await connection2.end();
      
      return config;
      
    } catch (error) {
      console.log('✗ 连接失败:', error.message);
    }
  }
  
  throw new Error('所有配置都连接失败');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection()
    .then(workingConfig => {
      console.log('\n🎉 找到可用的数据库配置:', workingConfig);
      console.log('\n请将以下配置添加到 .env 文件中:');
      console.log(`DB_HOST=${workingConfig.host}`);
      console.log(`DB_PORT=${workingConfig.port}`);
      console.log(`DB_USER=${workingConfig.user}`);
      console.log(`DB_PASSWORD=${workingConfig.password || ''}`);
      console.log(`DB_NAME=login_register_mcp`);
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
