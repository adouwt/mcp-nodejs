# MCP 开源服务目录提交指南

## 提交到 ModelContext Protocol 官方目录

### 1. 访问官方仓库
- 仓库地址: https://github.com/modelcontextprotocol/servers
- Fork 该仓库到你的 GitHub 账号

### 2. 添加服务描述
在 Fork 的仓库中，找到 `src/servers/` 目录，创建新文件：
`src/servers/login-register-mcp.json`

内容如下：
```json
{
  "name": "login-register-mcp",
  "description": "MCP服务 - 通过用户名、密码和产品名称获取登录token，支持token校验和多产品隔离",
  "author": "hrtps.com",
  "repository": "https://github.com/hrtps/login-register-mcp",
  "license": "MIT",
  "categories": ["authentication", "security", "user-management"],
  "keywords": ["mcp", "login", "register", "token", "jwt", "authentication"],
  "installation": {
    "npm": "login-register-mcp"
  },
  "usage": {
    "command": "npx",
    "args": ["login-register-mcp"]
  },
  "tools": [
    {
      "name": "get_login_token",
      "description": "通过用户名、密码和产品名称获取登录token"
    },
    {
      "name": "verify_token", 
      "description": "校验 JWT token 的有效性"
    }
  ]
}
```

### 3. 更新索引文件
在 `src/servers/index.json` 中添加你的服务：
```json
{
  "servers": [
    // ... 其他服务
    {
      "name": "login-register-mcp",
      "file": "login-register-mcp.json"
    }
  ]
}
```

### 4. 提交 Pull Request
1. 提交更改到你的 Fork
2. 创建 Pull Request 到原仓库
3. 在 PR 描述中说明：
   - 服务功能概述
   - 安装和使用方法
   - 测试说明

### 5. PR 模板
```markdown
## 新增 MCP 服务: login-register-mcp

### 服务描述
一个功能完整的 MCP 认证服务，支持：
- 用户登录/注册
- JWT token 生成和校验
- 多产品隔离
- 密码加密存储

### 安装方式
```bash
npm install login-register-mcp
```

### 配置示例
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

### 测试
- [x] 本地测试通过
- [x] 已发布到 npm
- [x] 文档完整

### 检查清单
- [x] 服务描述文件格式正确
- [x] 更新了索引文件
- [x] 提供了完整的使用文档
- [x] 包含测试用例
```

## 其他开源目录

### Awesome MCP Servers
- 仓库: https://github.com/punkpeye/awesome-mcp-servers
- 提交方式: 在 README.md 中添加服务描述

### MCP Hub (如果存在)
- 查找社区维护的 MCP 服务集合
- 按照各自的提交规范进行提交

## 提交后的维护

1. **响应反馈**: 及时回复 PR 中的评论和建议
2. **更新文档**: 根据反馈完善文档和示例
3. **版本管理**: 保持 npm 包和文档的同步更新
4. **社区支持**: 在 Issues 中提供技术支持

## 推广建议

1. **技术博客**: 写一篇介绍文章
2. **社交媒体**: 在相关技术社区分享
3. **示例项目**: 创建更多使用示例
4. **视频教程**: 录制使用演示视频
