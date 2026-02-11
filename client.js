import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function callMcpService(username) {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, 'src/index.js')]
  });

  const client = new Client(
    { name: 'mcp-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    // 调用 get_login_token 工具
    const result = await client.callTool({
      name: 'get_login_token',
      arguments: { username }
    });

    console.log('MCP 服务返回结果:');
    console.log(JSON.parse(result.content[0].text));

    return JSON.parse(result.content[0].text);
  } finally {
    await client.close();
  }
}

// 使用示例
const username = process.argv[2] || 'testuser';
callMcpService(username).catch(console.error);
