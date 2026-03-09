-- 创建数据库
CREATE DATABASE IF NOT EXISTS `db_login_register_mcp` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `db_login_register_mcp`;

-- 用户表
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '用户唯一标识符 (UUID)',
  `username` VARCHAR(100) NOT NULL COMMENT '用户名',
  `password` VARCHAR(64) NOT NULL COMMENT 'SHA256加密后的密码',
  `product` VARCHAR(100) NOT NULL COMMENT '产品/业务名称',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `status` TINYINT(1) DEFAULT 1 COMMENT '用户状态: 1-正常, 0-禁用',
  
  -- 复合唯一索引：同一产品下用户名唯一
  UNIQUE KEY `uk_username_product` (`username`, `product`),
  
  -- 普通索引
  KEY `idx_username` (`username`),
  KEY `idx_product` (`product`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- Token管理表
CREATE TABLE `user_tokens` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Token记录ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `username` VARCHAR(100) NOT NULL COMMENT '用户名',
  `product` VARCHAR(100) NOT NULL COMMENT '产品名称',
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'Token的SHA256哈希值',
  `jwt_token` TEXT NOT NULL COMMENT '完整的JWT Token',
  `expires_at` TIMESTAMP NOT NULL COMMENT 'Token过期时间',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Token状态: 1-有效, 0-已撤销',
  `client_info` JSON DEFAULT NULL COMMENT '客户端信息(IP、User-Agent等)',
  `last_used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后使用时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `revoked_at` TIMESTAMP NULL DEFAULT NULL COMMENT '撤销时间',
  `revoke_reason` VARCHAR(100) DEFAULT NULL COMMENT '撤销原因',
  
  -- 索引
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_username_product` (`username`, `product`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户Token管理表';

-- 登录日志表
CREATE TABLE `login_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `username` VARCHAR(100) NOT NULL COMMENT '用户名',
  `product` VARCHAR(100) NOT NULL COMMENT '产品名称',
  `action` VARCHAR(20) NOT NULL COMMENT '操作类型: login, register, verify, logout, revoke',
  `success` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否成功: 1-成功, 0-失败',
  `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
  `token_id` BIGINT DEFAULT NULL COMMENT '关联的Token ID',
  `client_info` JSON DEFAULT NULL COMMENT '客户端信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引
  KEY `idx_user_id` (`user_id`),
  KEY `idx_username_product` (`username`, `product`),
  KEY `idx_action` (`action`),
  KEY `idx_token_id` (`token_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户操作日志表';

-- 插入测试数据（基于现有 JSON 数据）
INSERT INTO `users` (`id`, `username`, `password`, `product`, `created_at`) VALUES
('cd6c1d8f-e1fa-4901-a3e8-fd7dc2e27528', 'zhangsan', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'app1', '2026-03-06 09:48:56'),
('4bff214a-92be-40c4-8a6b-270dc55a7fff', 'zhangsan', '481f6cc0511143ccdd7e2d1b1b94faf0a700a8b49cd13922a70b5ae28acaa8c5', 'app2', '2026-03-06 09:49:03'),
('51e65a1f-49d2-49d4-8012-b4f599d59f0d', 'testuser', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'myapp', '2026-03-06 09:56:24'),
('e41f2415-cd64-4b64-90a4-a5da300895f2', 'user2', '1d4598d1949b47f7f211134b639ec32238ce73086a83c2f745713b3f12f817e5', 'myapp', '2026-03-06 09:56:25'),
('582e1ef7-cd3a-43a8-b6ea-31c7cda9ccb1', 'admin', 'fcf730b6d95236ecd3c9fc2d92d7b6b2bb061514961aec041d6c7a7192f592e4', 'app1', '2026-03-06 09:56:25'),
('89df5242-d180-449a-adca-df3adee1212f', 'admin', '89927b1c20a6897fb33335e944e24d08b58ff54d705d69517c5743af23006ffd', 'app2', '2026-03-06 09:56:26'),
('035f9367-6f0a-4659-93e6-7b77cc90a608', 'testuser', '13d249f2cb4127b40cfa757866850278793f814ded3c587fe5889e889a7a9f6c', 'testapp', '2026-03-06 10:44:20');
