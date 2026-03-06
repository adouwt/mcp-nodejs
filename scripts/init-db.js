#!/usr/bin/env node

import { database } from '../src/database.js';
import { logger } from '../src/logger.js';

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 初始化数据库表结构
    await database.initDatabase();
    
    console.log('✓ 数据库表结构初始化完成');
    
    // 检查是否需要迁移现有数据
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const usersFile = path.join(__dirname, '../data/users.json');
    
    if (fs.existsSync(usersFile)) {
      console.log('发现现有用户数据文件，开始迁移...');
      
      const data = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      let migratedCount = 0;
      
      for (const user of data.users || []) {
        // 只迁移有完整信息的用户
        if (user.id && user.username && user.password && user.product) {
          try {
            const sql = `
              INSERT IGNORE INTO users (id, username, password, product, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?)
            `;
            const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
            await database.query(sql, [
              user.id, 
              user.username, 
              user.password, 
              user.product, 
              createdAt, 
              createdAt
            ]);
            migratedCount++;
          } catch (error) {
            console.warn(`迁移用户 ${user.username}@${user.product} 失败:`, error.message);
          }
        }
      }
      
      console.log(`✓ 成功迁移 ${migratedCount} 个用户记录`);
      
      // 备份原文件
      const backupFile = usersFile + '.backup.' + Date.now();
      fs.copyFileSync(usersFile, backupFile);
      console.log(`✓ 原数据文件已备份到: ${backupFile}`);
    }
    
    // 显示统计信息
    const userCount = await database.query('SELECT COUNT(*) as count FROM users');
    console.log(`✓ 当前数据库中共有 ${userCount[0].count} 个用户`);
    
    console.log('\n数据库初始化完成！');
    
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}

export { initDatabase };
