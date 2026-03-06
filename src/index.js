#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { getTokenByUsername, verifyToken } from './userService.js';
import { logger } from './logger.js';

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

server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  logger.info('ListToolsRequestSchema request', request);
  return {
    tools: [
      {
        name: 'get_login_token',
        description: '通过用户名、密码和产品名称登录/注册获取token。如果用户存在则验证密码后返回JWT token，如果用户不存在则自动创建用户后返回token。不同产品可以有相同的用户名。',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: '用户名'
            },
            password: {
              type: 'string',
              description: '密码'
            },
            product: {
              type: 'string',
              description: '产品/业务名称'
            }
          },
          required: ['username', 'password', 'product']
        }
      },
      {
        name: 'verify_token',
        description: '校验token是否有效，返回校验结果和用户信息。',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT token'
            }
          },
          required: ['token']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info('CallToolRequestSchema request', { name, args: { ...args, password: args.password ? '***' : undefined } });

  if (name === 'get_login_token') {
    try {
      const result = await getTokenByUsername(args.username, args.password, args.product);
      logger.info('get_login_token success', { username: args.username, product: args.product, isNewUser: result.isNewUser });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('get_login_token error', { username: args.username, product: args.product, error: error.message });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  if (name === 'verify_token') {
    try {
      const result = await verifyToken(args.token);
      logger.info('verify_token result', { valid: result.valid, username: result.username, product: result.product });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('verify_token error', { error: error.message });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ valid: false, error: error.message }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `未知工具: ${name}`
      }
    ],
    isError: true
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Login Register MCP Server 已启动');
}

main().catch((error) => {
  logger.error('服务器启动失败', { error: error.message });
  process.exit(1);
});
