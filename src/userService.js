import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { database } from './database.js';
import { logger } from './logger.js';
import { createToken, verifyToken as verifyTokenFromService } from './tokenService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
const TOKEN_EXPIRES_IN = '7d';

// 初始化数据库
async function initDatabase() {
  try {
    await database.initDatabase();
  } catch (error) {
    logger.error('数据库初始化失败', { error: error.message });
    throw error;
  }
}

async function findUser(username, product) {
  try {
    const sql = 'SELECT * FROM users WHERE username = ? AND product = ? AND status = 1';
    const users = await database.query(sql, [username, product]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    logger.error('查找用户失败', { username, product, error: error.message });
    throw new Error('查找用户失败');
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createUser(username, password, product) {
  try {
    const userId = uuidv4();
    const hashedPassword = hashPassword(password);
    const now = new Date();
    
    const sql = `
      INSERT INTO users (id, username, password, product, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await database.query(sql, [userId, username, hashedPassword, product, now, now]);
    
    // 记录注册日志
    await logUserAction(userId, username, product, 'register', true);
    
    return {
      id: userId,
      username,
      password: hashedPassword,
      product,
      created_at: now,
      status: 1
    };
  } catch (error) {
    logger.error('创建用户失败', { username, product, error: error.message });
    
    // 记录失败日志
    await logUserAction(null, username, product, 'register', false, error.message);
    
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('用户名在该产品下已存在');
    }
    throw new Error('创建用户失败');
  }
}

async function logUserAction(userId, username, product, action, success, errorMessage = null, tokenId = null) {
  try {
    const sql = `
      INSERT INTO login_logs (user_id, username, product, action, success, error_message, token_id, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await database.query(sql, [userId, username, product, action, success ? 1 : 0, errorMessage, tokenId]);
  } catch (error) {
    logger.error('记录用户操作日志失败', { error: error.message });
  }
}

function verifyPassword(user, password) {
  return user.password === hashPassword(password);
}

// 这个函数已被tokenService.js中的createToken替代
// 保留用于向后兼容，但建议使用createToken
function generateToken(user) {
  // 此函数已废弃，请使用 tokenService.createToken
  throw new Error('generateToken已废弃，请使用tokenService.createToken');
}

export async function getTokenByUsername(username, password, product) {
  // 确保数据库已初始化
  await initDatabase();
  
  if (!username || typeof username !== 'string' || username.trim() === '') {
    throw new Error('用户名不能为空');
  }
  if (!password || typeof password !== 'string' || password.trim() === '') {
    throw new Error('密码不能为空');
  }
  if (!product || typeof product !== 'string' || product.trim() === '') {
    throw new Error('产品名称不能为空');
  }

  const trimmedUsername = username.trim();
  const trimmedProduct = product.trim();
  let user = await findUser(trimmedUsername, trimmedProduct);
  let isNewUser = false;

  try {
    if (!user) {
      // 新用户注册
      user = await createUser(trimmedUsername, password, trimmedProduct);
      isNewUser = true;
    } else {
      // 已有用户登录，验证密码
      if (!verifyPassword(user, password)) {
        // 记录登录失败日志
        await logUserAction(user.id, user.username, user.product, 'login', false, '密码错误');
        throw new Error('密码错误');
      }
    }

    // 使用新的token服务创建token
    const tokenResult = await createToken(user);

    // 记录操作日志
    await logUserAction(user.id, user.username, user.product, isNewUser ? 'register' : 'login', true, null, tokenResult.tokenId);

    return {
      token: tokenResult.token,
      tokenId: tokenResult.tokenId,
      userId: user.id,
      username: user.username,
      product: user.product,
      expiresAt: tokenResult.expiresAt,
      isNewUser,
      message: isNewUser ? '新用户已创建并返回token' : '登录成功，返回token'
    };
  } catch (error) {
    logger.error('获取token失败', { username: trimmedUsername, product: trimmedProduct, error: error.message });
    throw error;
  }
}

export async function verifyToken(token) {
  // 确保数据库已初始化
  await initDatabase();
  
  try {
    // 使用新的token验证服务
    const result = await verifyTokenFromService(token);
    
    // 记录验证日志
    if (result.valid) {
      await logUserAction(result.userId, result.username, result.product, 'verify', true, null, result.tokenId);
    } else {
      // 尝试从JWT中获取用户信息用于日志记录
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.decode(token);
        if (decoded && decoded.userId && decoded.username && decoded.product) {
          await logUserAction(decoded.userId, decoded.username, decoded.product, 'verify', false, result.error);
        }
      } catch (decodeError) {
        // 忽略解码错误
      }
    }
    
    return result;
    
  } catch (error) {
    logger.error('Token验证失败', { error: error.message });
    return {
      valid: false,
      error: 'token验证失败'
    };
  }
}

// 导出初始化函数供外部使用
export { initDatabase };
