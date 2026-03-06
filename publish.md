# 发布指南

## 发布到私有 npm 仓库

### 1. 登录私有 npm 仓库

```bash
npm login --registry https://registry-npm.hrtps.com/
```

使用以下凭据：
- 账号：hrtps.com
- 密码：hrtps.com
- 邮箱：hrtps@hrtps.com

### 2. 发布包

```bash
# 发布当前版本
npm publish

# 或者发布指定版本
npm version patch  # 增加补丁版本号
npm publish

# 或者发布 beta 版本
npm version prerelease --preid=beta
npm publish --tag beta
```

### 3. 验证发布

```bash
# 搜索包
npm search login-register-mcp --registry https://registry-npm.hrtps.com/

# 查看包信息
npm view login-register-mcp --registry https://registry-npm.hrtps.com/

# 安装测试
npm install login-register-mcp --registry https://registry-npm.hrtps.com/
```

## 发布到开源 MCP 服务目录

### ModelContext Protocol 官方目录

1. 访问 [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
2. Fork 该仓库
3. 在 `src/servers/` 目录下创建新的服务描述文件
4. 提交 Pull Request

### 服务描述文件示例

```yaml
name: login-register-mcp
description: MCP服务 - 通过用户名、密码和产品名称获取登录token，支持token校验
author: hrtps.com
repository: https://github.com/hrtps/login-register-mcp
license: MIT
categories:
  - authentication
  - security
  - user-management
```

## 版本管理

- 使用语义化版本号 (Semantic Versioning)
- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

## 发布检查清单

- [ ] 更新 README.md
- [ ] 运行测试 `npm test`
- [ ] 更新版本号 `npm version`
- [ ] 提交代码到 Git
- [ ] 发布到 npm `npm publish`
- [ ] 创建 GitHub Release
- [ ] 更新文档
