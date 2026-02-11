# Login Register MCP Server

一个简单的 MCP 服务，通过用户名获取登录 token。

## 功能

- **get_login_token**: 通过用户名获取 JWT token
  - 如果用户存在，直接返回 token
  - 如果用户不存在，自动创建用户后返回 token

## 安装

```bash
npm install
```

## 使用方法

### 1. 直接运行

```bash
npm start
```

### 2. 在 Claude Desktop 中配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "login-register": {
      "command": "node",
      "args": ["/Users/macbook/workSpace/ai-demo/mcp/loginRegister-mcp/src/index.js"]
    }
  }
}
```

### 3. 在 Windsurf 中配置

编辑 MCP 配置文件：

```json
{
  "mcpServers": {
    "login-register": {
      "command": "node",
      "args": ["/Users/macbook/workSpace/ai-demo/mcp/loginRegister-mcp/src/index.js"]
    }
  }
}
```

## 工具说明

### get_login_token

**参数：**
- `username` (string, 必填): 用户名

**返回：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid",
  "username": "用户名",
  "isNewUser": true/false,
  "message": "提示信息"
}
```

## 环境变量

- `JWT_SECRET`: JWT 签名密钥（可选，默认使用内置密钥）

## 数据存储

用户数据存储在 `data/users.json` 文件中。
