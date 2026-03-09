#!/usr/bin/env node

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getTokenByUsername, verifyToken } from './userService.js';
import { logger } from './logger.js';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// 存储活跃的SSE传输
const transports = new Map();

// 创建MCP服务器实例的函数
function createMcpServer() {
  const server = new Server(
    {
      name: 'login-register-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // 注册工具
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_login_token',
          description: '通过用户名、密码和产品名称登录/注册获取token',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: '用户名' },
              password: { type: 'string', description: '密码' },
              product: { type: 'string', description: '产品/业务名称' }
            },
            required: ['username', 'password', 'product']
          }
        },
        {
          name: 'verify_token',
          description: '校验token是否有效',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'JWT token' }
            },
            required: ['token']
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'get_login_token') {
      try {
        const result = await getTokenByUsername(args.username, args.password, args.product);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        throw new Error(error.message);
      }
    }
    
    if (name === 'verify_token') {
      try {
        const result = await verifyToken(args.token);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        throw new Error(error.message);
      }
    }
    
    throw new Error(`未知工具: ${name}`);
  });

  return server;
}

// 中间件
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'login-register-mcp',
    transport: 'sse',
    activeSessions: transports.size
  });
});

// SSE连接端点 - GET请求建立SSE连接
app.get('/sse', async (req, res) => {
  logger.info('SSE connection request received');
  
  // 创建SSE传输，指定POST消息的端点
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();
  
  // 存储传输
  transports.set(transport.sessionId, { transport, server });
  
  // 连接关闭时清理
  res.on('close', () => {
    logger.info('SSE connection closed', { sessionId: transport.sessionId });
    transports.delete(transport.sessionId);
  });
  
  // 连接服务器到传输
  await server.connect(transport);
  
  logger.info('SSE connection established', { sessionId: transport.sessionId });
});

// 消息端点 - POST请求发送消息
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  
  const session = transports.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    logger.error('Error handling message', { error: error.message, sessionId });
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`SSE MCP Server started on port ${PORT}`);
  console.log(`🚀 Login Register MCP Server (SSE Transport)`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔌 SSE Endpoint: http://localhost:${PORT}/sse`);
  console.log(`📋 配置URL: http://localhost:${PORT}/sse`);
});

export default app;
