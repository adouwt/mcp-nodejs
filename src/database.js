import mysql from 'mysql2/promise';
import { logger } from './logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量（使用绝对路径）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

class Database {
  constructor() {
    this.connection = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: '+00:00',
      connectTimeout: 60000,
      acquireTimeout: 60000,
      multipleStatements: true
    };
  }

  async connect() {
    try {
      if (this.connection) {
        return this.connection;
      }

      this.connection = await mysql.createConnection(this.config);
      logger.info('数据库连接成功', { host: this.config.host, database: this.config.database });
      
      // 测试连接
      await this.connection.ping();
      
      return this.connection;
    } catch (error) {
      logger.error('数据库连接失败', { error: error.message, config: this.config });
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.end();
        this.connection = null;
        logger.info('数据库连接已关闭');
      } catch (error) {
        logger.error('关闭数据库连接失败', { error: error.message });
      }
    }
  }

  async query(sql, params = []) {
    try {
      const connection = await this.connect();
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('数据库查询失败', { sql, params, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    const connection = await this.connect();
    await connection.beginTransaction();
    
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('事务回滚', { error: error.message });
      throw error;
    }
  }

  // 初始化数据库表结构
  async initDatabase() {
    try {
      // 先连接到 MySQL 服务器（不指定数据库）
      const tempConfig = { ...this.config };
      delete tempConfig.database;
      const tempConnection = await mysql.createConnection(tempConfig);
      
      // 检查数据库是否存在，不存在则创建
      await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await tempConnection.end();
      
      // 重新连接到目标数据库
      await this.connect();
      
      // 创建用户表
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '用户唯一标识符 (UUID)',
          \`username\` VARCHAR(100) NOT NULL COMMENT '用户名',
          \`password\` VARCHAR(64) NOT NULL COMMENT 'SHA256加密后的密码',
          \`product\` VARCHAR(100) NOT NULL COMMENT '产品/业务名称',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          \`status\` TINYINT(1) DEFAULT 1 COMMENT '用户状态: 1-正常, 0-禁用',
          
          UNIQUE KEY \`uk_username_product\` (\`username\`, \`product\`),
          KEY \`idx_username\` (\`username\`),
          KEY \`idx_product\` (\`product\`),
          KEY \`idx_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
      `;
      
      await this.query(createUsersTable);
      
      // 创建Token管理表
      const createUserTokensTable = `
        CREATE TABLE IF NOT EXISTS \`user_tokens\` (
          \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Token记录ID',
          \`user_id\` VARCHAR(36) NOT NULL COMMENT '用户ID',
          \`username\` VARCHAR(100) NOT NULL COMMENT '用户名',
          \`product\` VARCHAR(100) NOT NULL COMMENT '产品名称',
          \`token_hash\` VARCHAR(64) NOT NULL COMMENT 'Token的SHA256哈希值',
          \`jwt_token\` TEXT NOT NULL COMMENT '完整的JWT Token',
          \`expires_at\` TIMESTAMP NOT NULL COMMENT 'Token过期时间',
          \`is_active\` TINYINT(1) DEFAULT 1 COMMENT 'Token状态: 1-有效, 0-已撤销',
          \`client_info\` JSON DEFAULT NULL COMMENT '客户端信息(IP、User-Agent等)',
          \`last_used_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后使用时间',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          \`revoked_at\` TIMESTAMP NULL DEFAULT NULL COMMENT '撤销时间',
          \`revoke_reason\` VARCHAR(100) DEFAULT NULL COMMENT '撤销原因',
          
          UNIQUE KEY \`uk_token_hash\` (\`token_hash\`),
          KEY \`idx_user_id\` (\`user_id\`),
          KEY \`idx_username_product\` (\`username\`, \`product\`),
          KEY \`idx_expires_at\` (\`expires_at\`),
          KEY \`idx_is_active\` (\`is_active\`),
          KEY \`idx_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户Token管理表'
      `;

      await this.query(createUserTokensTable);

      // 创建登录日志表
      const createLoginLogsTable = `
        CREATE TABLE IF NOT EXISTS \`login_logs\` (
          \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
          \`user_id\` VARCHAR(36) NOT NULL COMMENT '用户ID',
          \`username\` VARCHAR(100) NOT NULL COMMENT '用户名',
          \`product\` VARCHAR(100) NOT NULL COMMENT '产品名称',
          \`action\` VARCHAR(20) NOT NULL COMMENT '操作类型: login, register, verify, logout, revoke',
          \`success\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否成功: 1-成功, 0-失败',
          \`error_message\` TEXT DEFAULT NULL COMMENT '错误信息',
          \`token_id\` BIGINT DEFAULT NULL COMMENT '关联的Token ID',
          \`client_info\` JSON DEFAULT NULL COMMENT '客户端信息',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          
          KEY \`idx_user_id\` (\`user_id\`),
          KEY \`idx_username_product\` (\`username\`, \`product\`),
          KEY \`idx_action\` (\`action\`),
          KEY \`idx_token_id\` (\`token_id\`),
          KEY \`idx_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户操作日志表'
      `;

      await this.query(createLoginLogsTable);
      
      logger.info('数据库表结构初始化完成');
      
    } catch (error) {
      logger.error('数据库初始化失败', { error: error.message });
      throw error;
    }
  }
}

// 创建单例实例
const database = new Database();

export { database };
export default database;
