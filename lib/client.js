import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LoginRegisterClient {
  constructor(options = {}) {
    this.serverPath = options.serverPath || path.join(__dirname, '../src/index.js');
    this.client = null;
    this.transport = null;
  }

  async connect() {
    if (this.client) {
      return; // 已连接
    }

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [this.serverPath]
    });

    this.client = new Client(
      { name: 'login-register-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }

  /**
   * 登录或注册用户
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} product - 产品名称
   * @returns {Promise<Object>} 包含 token、userId、username、product、isNewUser、message
   */
  async login(username, password, product) {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'get_login_token',
        arguments: { username, password, product }
      });

      const response = JSON.parse(result.content[0].text);
      
      if (result.isError) {
        throw new Error(response.error || '登录失败');
      }

      return response;
    } catch (error) {
      throw new Error(`登录失败: ${error.message}`);
    }
  }

  /**
   * 校验 token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} 包含 valid、userId、username、product、createdAt、tokenExp、tokenIat 或 error
   */
  async verifyToken(token) {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'verify_token',
        arguments: { token }
      });

      const response = JSON.parse(result.content[0].text);
      return response;
    } catch (error) {
      return {
        valid: false,
        error: `校验失败: ${error.message}`
      };
    }
  }

  /**
   * 便捷方法：自动管理连接的登录
   */
  static async login(username, password, product, options = {}) {
    const client = new LoginRegisterClient(options);
    try {
      return await client.login(username, password, product);
    } finally {
      await client.disconnect();
    }
  }

  /**
   * 便捷方法：自动管理连接的校验
   */
  static async verifyToken(token, options = {}) {
    const client = new LoginRegisterClient(options);
    try {
      return await client.verifyToken(token);
    } finally {
      await client.disconnect();
    }
  }
}

// 默认导出便捷函数
export const login = LoginRegisterClient.login;
export const verifyToken = LoginRegisterClient.verifyToken;
