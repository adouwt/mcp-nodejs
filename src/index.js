#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { getTokenByUsername } from './userService.js';
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
        description: '通过用户名获取登录token。如果用户存在则直接返回JWT token，如果用户不存在则自动创建用户后返回token。',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: '用户名'
            }
          },
          required: ['username']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info('CallToolRequestSchema request', { name, args });
  if (name === 'get_login_token') {
    try {
      const result = getTokenByUsername(args.username);
      logger.info('get_login_token success', { username: args.username, result });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error('get_login_token error', { username: args.username, error: error.message });
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
