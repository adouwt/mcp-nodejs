# MySQL 数据库安装和配置指南

## 1. MySQL 安装

### macOS 安装

**方法 1: 使用 Homebrew（推荐）**
```bash
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 设置开机自启动
brew services enable mysql
```

**方法 2: 官方安装包**
1. 访问 [MySQL 官网](https://dev.mysql.com/downloads/mysql/)
2. 下载 macOS 版本的 MySQL Community Server
3. 运行 .dmg 文件进行安装
4. 在系统偏好设置中启动 MySQL

### Windows 安装

1. 访问 [MySQL 官网](https://dev.mysql.com/downloads/installer/)
2. 下载 MySQL Installer for Windows
3. 运行安装程序，选择 "Developer Default" 安装类型
4. 按照向导完成安装和配置

### Linux (Ubuntu/Debian) 安装

```bash
# 更新包列表
sudo apt update

# 安装 MySQL
sudo apt install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql

# 设置开机自启动
sudo systemctl enable mysql
```

## 2. MySQL 初始配置

### 安全配置

```bash
# 运行安全配置脚本
sudo mysql_secure_installation
```

按照提示进行以下配置：
- 设置 root 密码（建议设置为 `123456` 以匹配默认配置）
- 移除匿名用户
- 禁止 root 远程登录
- 移除测试数据库

### 手动配置 root 密码

如果需要手动设置 root 密码：

```bash
# 登录 MySQL（如果没有密码）
mysql -u root

# 或者使用 sudo（Linux）
sudo mysql -u root
```

在 MySQL 命令行中执行：
```sql
-- 设置 root 密码为 123456
ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 测试连接

```bash
# 使用密码连接
mysql -u root -p123456

# 或者交互式输入密码
mysql -u root -p
```

## 3. 项目数据库配置

### 创建环境配置文件

复制示例配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，根据你的 MySQL 配置修改：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=login_register_mcp

# JWT 配置
JWT_SECRET=mcp-login-register-secret-key
```

### 测试数据库连接

运行连接测试脚本：
```bash
node scripts/test-db-connection.js
```

如果连接成功，会显示可用的数据库配置。

### 初始化数据库

```bash
# 初始化数据库表结构
npm run init-db
```

这个命令会：
- 创建 `login_register_mcp` 数据库
- 创建 `users` 和 `login_logs` 表
- 迁移现有的 JSON 数据（如果存在）

## 4. 常见问题解决

### 问题 1: Access denied for user 'root'@'localhost'

**解决方案 1: 重置 root 密码**
```bash
# 停止 MySQL 服务
brew services stop mysql  # macOS
# 或
sudo systemctl stop mysql  # Linux

# 以安全模式启动 MySQL
sudo mysqld_safe --skip-grant-tables &

# 连接 MySQL（无密码）
mysql -u root

# 重置密码
USE mysql;
UPDATE user SET authentication_string=PASSWORD('123456') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# 重启 MySQL 服务
brew services restart mysql  # macOS
# 或
sudo systemctl restart mysql  # Linux
```

**解决方案 2: 使用 sudo 连接（Linux）**
```bash
sudo mysql -u root
```

然后设置密码：
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
```

### 问题 2: MySQL 服务未运行

**macOS:**
```bash
# 检查服务状态
brew services list | grep mysql

# 启动服务
brew services start mysql
```

**Linux:**
```bash
# 检查服务状态
sudo systemctl status mysql

# 启动服务
sudo systemctl start mysql
```

**Windows:**
- 打开服务管理器 (services.msc)
- 找到 MySQL 服务并启动

### 问题 3: 端口被占用

检查 3306 端口是否被占用：
```bash
# macOS/Linux
lsof -i :3306

# Windows
netstat -an | findstr :3306
```

如果端口被占用，可以：
1. 停止占用端口的进程
2. 修改 MySQL 端口配置
3. 在 `.env` 文件中使用不同的端口

### 问题 4: 字符集问题

确保 MySQL 使用 UTF-8 字符集：
```sql
-- 检查字符集
SHOW VARIABLES LIKE 'character_set%';

-- 设置数据库字符集
ALTER DATABASE login_register_mcp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 5. 数据迁移

如果你之前使用的是文件存储，初始化脚本会自动迁移数据：

1. 运行 `npm run init-db`
2. 脚本会检测 `data/users.json` 文件
3. 自动将数据迁移到 MySQL
4. 备份原文件为 `.backup` 文件

手动迁移步骤：
```bash
# 1. 备份现有数据
cp data/users.json data/users.json.backup

# 2. 初始化数据库
npm run init-db

# 3. 验证迁移结果
mysql -u root -p123456 -e "USE login_register_mcp; SELECT COUNT(*) FROM users;"
```

## 6. 性能优化建议

### 索引优化
数据库表已经包含了必要的索引：
- `uk_username_product`: 用户名+产品的唯一索引
- `idx_username`: 用户名索引
- `idx_product`: 产品索引
- `idx_created_at`: 创建时间索引

### 连接池配置
对于高并发场景，可以配置连接池：
```javascript
// 在 database.js 中使用连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'login_register_mcp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

### 日志清理
定期清理登录日志表：
```sql
-- 删除 30 天前的日志
DELETE FROM login_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 7. 监控和维护

### 数据库状态检查
```sql
-- 检查表状态
SHOW TABLE STATUS FROM login_register_mcp;

-- 检查用户数量
SELECT COUNT(*) as total_users FROM users;

-- 检查各产品用户分布
SELECT product, COUNT(*) as user_count FROM users GROUP BY product;

-- 检查最近的登录活动
SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 10;
```

### 备份建议
```bash
# 备份数据库
mysqldump -u root -p123456 login_register_mcp > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
mysql -u root -p123456 login_register_mcp < backup_20240306_120000.sql
```
