# Login Register MCP Server

一个功能完整的 MCP 服务，支持用户登录/注册和 token 校验。支持多产品隔离，同一用户名可以在不同产品下独立存在。

## 功能特性

- **用户登录/注册**: 通过用户名、密码和产品名称登录或注册
- **Token 校验**: 校验 JWT token 的有效性并返回用户信息
- **多产品支持**: 不同产品可以有相同的用户名
- **密码加密**: 使用 SHA256 加密存储密码
- **MySQL 数据库**: 使用 MySQL 数据库存储用户数据，支持高并发和数据持久化
- **操作日志**: 记录所有登录、注册、校验操作的详细日志
- **数据迁移**: 支持从 JSON 文件自动迁移到 MySQL 数据库

## 安装

### 作为依赖安装

```bash
npm install login-register-mcp
```

### 本地开发

```bash
git clone <repository-url>
cd login-register-mcp
npm install
```

### 数据库配置

本服务使用 MySQL 数据库存储用户数据。请按照以下步骤配置：

#### 1. 安装 MySQL

请参考 [MySQL 安装配置指南](docs/mysql-setup.md) 完成 MySQL 的安装和配置。

#### 2. 配置环境变量

复制环境配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接信息：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=login_register_mcp
JWT_SECRET=mcp-login-register-secret-key
```

#### 3. 初始化数据库

```bash
# 测试数据库连接
node scripts/test-db-connection.js

# 初始化数据库表结构
npm run init-db
```

初始化脚本会自动：
- 创建数据库和表结构
- 迁移现有的 JSON 数据（如果存在）
- 显示迁移结果统计

## 使用方法

### 方式 1: 作为 MCP 服务使用

#### 在 Claude Desktop 中配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "login-register": {
      "command": "npx",
      "args": ["login-register-mcp"]
    }
  }
}
```

#### 在 Windsurf 中配置

**方法 1: 使用 npx（推荐）**

在 Windsurf 的 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "login-register": {
      "command": "npx",
      "args": ["login-register-mcp"]
    }
  }
}
```

**方法 2: 使用本地路径**

如果使用本地开发版本，配置为：

```json
{
  "mcpServers": {
    "login-register": {
      "command": "node",
      "args": ["/Users/hrtps/workSpace/ai-demo/mcp/loginRegister-mcp/src/index.js"]
    }
  }
}
```

**方法 3: 使用全局安装**

```bash
# 全局安装
npm install -g login-register-mcp

# 然后配置
{
  "mcpServers": {
    "login-register": {
      "command": "login-register-mcp"
    }
  }
}
```

#### 在 Windsurf 中使用

配置完成后重启 Windsurf，然后就可以在对话中使用 MCP 工具：

1. **登录/注册用户**：
   ```
   @login-register 请帮我用用户名 "admin" 密码 "123456" 产品名 "myapp" 登录
   ```

2. **校验 token**：
   ```
   @login-register 请校验这个 token: "eyJhbGciOiJIUzI1NiIs..."
   ```

3. **查看可用工具**：
   ```
   @login-register 有哪些可用的工具？
   ```

### 方式 2: 作为 Node.js 库使用

#### 基本使用

```javascript
import { login, verifyToken } from 'login-register-mcp/client';

// 登录/注册
const result = await login('username', 'password', 'myapp');
console.log(result);
// {
//   token: "eyJhbGciOiJIUzI1NiIs...",
//   userId: "uuid",
//   username: "username",
//   product: "myapp",
//   isNewUser: true,
//   message: "新用户已创建并返回token"
// }

// 校验 token
const verification = await verifyToken(result.token);
console.log(verification);
// {
//   valid: true,
//   userId: "uuid",
//   username: "username",
//   product: "myapp",
//   createdAt: "2026-03-06T09:44:36.558Z",
//   tokenExp: "2026-03-13T09:44:36.000Z",
//   tokenIat: "2026-03-06T09:44:36.000Z"
// }
```

#### 使用客户端类

```javascript
import { LoginRegisterClient } from 'login-register-mcp/client';

const client = new LoginRegisterClient();

await client.connect();

// 多次调用
const user1 = await client.login('user1', 'pass1', 'app1');
const user2 = await client.login('user2', 'pass2', 'app1');

const verify1 = await client.verifyToken(user1.token);
const verify2 = await client.verifyToken(user2.token);

await client.disconnect();
```

#### Express.js 集成

```javascript
import express from 'express';
import { login, verifyToken } from 'login-register-mcp/client';

const app = express();
app.use(express.json());

// 登录接口
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, product } = req.body;
    const result = await login(username, password, product);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

// Token 校验中间件
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: '缺少 token' });
  }
  
  const result = await verifyToken(token);
  if (result.valid) {
    req.user = result;
    next();
  } else {
    res.status(401).json({ message: result.error });
  }
}

app.listen(3000);
```

### 方式 3: 直接调用服务函数

```javascript
import { getTokenByUsername, verifyToken } from 'login-register-mcp/service';

// 直接调用服务函数（同进程内）
const result = getTokenByUsername('username', 'password', 'product');
const verification = verifyToken(result.token);
```

## API 参考

### MCP 工具

#### get_login_token

**参数：**
- `username` (string, 必填): 用户名
- `password` (string, 必填): 密码
- `product` (string, 必填): 产品/业务名称

**返回：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid",
  "username": "用户名",
  "product": "产品名称",
  "isNewUser": true,
  "message": "新用户已创建并返回token"
}
```

#### verify_token

**参数：**
- `token` (string, 必填): JWT token

**返回：**
```json
{
  "valid": true,
  "userId": "uuid",
  "username": "用户名",
  "product": "产品名称",
  "createdAt": "2026-03-06T09:44:36.558Z",
  "tokenExp": "2026-03-13T09:44:36.000Z",
  "tokenIat": "2026-03-06T09:44:36.000Z"
}
```

## 配置

### 环境变量

- `JWT_SECRET`: JWT 签名密钥（可选，默认使用内置密钥）

### 数据存储

用户数据存储在 MySQL 数据库中，包含以下表结构：

#### users 表
```sql
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '用户唯一标识符 (UUID)',
  `username` VARCHAR(100) NOT NULL COMMENT '用户名',
  `password` VARCHAR(64) NOT NULL COMMENT 'SHA256加密后的密码',
  `product` VARCHAR(100) NOT NULL COMMENT '产品/业务名称',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `status` TINYINT(1) DEFAULT 1 COMMENT '用户状态: 1-正常, 0-禁用',
  
  UNIQUE KEY `uk_username_product` (`username`, `product`),
  KEY `idx_username` (`username`),
  KEY `idx_product` (`product`),
  KEY `idx_created_at` (`created_at`)
);
```

#### login_logs 表
```sql
CREATE TABLE `login_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `username` VARCHAR(100) NOT NULL COMMENT '用户名',
  `product` VARCHAR(100) NOT NULL COMMENT '产品名称',
  `action` VARCHAR(20) NOT NULL COMMENT '操作类型: login, register, verify',
  `success` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否成功: 1-成功, 0-失败',
  `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
);
```

### 环境变量

支持以下环境变量配置：

- `DB_HOST`: 数据库主机地址（默认: localhost）
- `DB_PORT`: 数据库端口（默认: 3306）
- `DB_USER`: 数据库用户名（默认: root）
- `DB_PASSWORD`: 数据库密码（默认: 123456）
- `DB_NAME`: 数据库名称（默认: login_register_mcp）
- `JWT_SECRET`: JWT 签名密钥（默认: mcp-login-register-secret-key）

## 示例

查看 `examples/` 目录获取更多使用示例：

- `basic-usage.js` - 基本使用示例
- `express-integration.js` - Express.js 集成示例

## 开发

### 本地测试

```bash
# 自动化测试（推荐）
npm test

# 手动测试登录/注册
node test.js login <用户名> <密码> <产品名称>

# 手动测试 token 校验
node test.js verify <token>

# 测试数据库连接
node scripts/test-db-connection.js

# 初始化/重置数据库
npm run init-db
```

### 运行示例

```bash
# 基本使用示例
node examples/basic-usage.js

# Express 集成示例
node examples/express-integration.js
```

## 许可证

MIT

## 客户端调用
业务代码中想调用 mcp 服务拿到数据，可以通过以下方式调用：