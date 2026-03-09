# MCP配置方式示例

## 1. STDIO传输（本地模式）

适用于本地开发、私有部署

```json
{
  "mcpServers": {
    "login-register": {
      "command": "node",
      "args": ["/Users/hrtps/workSpace/ai-demo/mcp/loginRegister-mcp/src/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PASSWORD": "your_password",
        "JWT_SECRET": "your_secret"
      }
    }
  }
}
```

**特点：**
- 直接进程间通信
- 需要配置环境变量
- 适合本地使用

## 2. Streamable HTTP传输（远程模式 - 推荐）

适用于云部署、多用户共享

```json
{
  "mcpServers": {
    "login-register": {
      "url": "https://your-domain.com/sse",
      "disabled": false
    }
  }
}
```

**特点：**
- 现代标准，安全可靠
- 用户只需配置URL
- 支持HTTPS
- 适合生产环境

## 3. SSE传输（遗留远程模式）

兼容旧版本客户端

```json
{
  "mcpServers": {
    "login-register": {
      "url": "https://your-domain.com/sse",
      "transport": "sse"
    }
  }
}
```

**特点：**
- 遗留支持
- 不推荐新项目使用

## 4. Custom Connectors（企业级）

通过Claude等客户端界面添加

**步骤：**
1. 打开Claude设置
2. 进入"Connectors"
3. 点击"Add custom connector"
4. 输入服务器URL：`https://your-domain.com/mcp`
5. 完成认证

## 部署建议

### 本地开发
使用STDIO模式，配置简单，调试方便。

### 生产部署
使用Streamable HTTP模式，支持：
- 负载均衡
- SSL/TLS
- 监控和日志
- 水平扩展

### 混合部署
同时支持多种传输方式，满足不同用户需求。
