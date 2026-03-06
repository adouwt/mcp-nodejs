import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { database } from './database.js';
import { logger } from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mcp-login-register-secret-key';
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

async function logUserAction(userId, username, product, action, success, errorMessage = null) {
  try {
    const sql = `
      INSERT INTO login_logs (user_id, username, product, action, success, error_message) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await database.query(sql, [userId, username, product, action, success ? 1 : 0, errorMessage]);
  } catch (error) {
    logger.error('记录用户操作日志失败', { error: error.message });
  }
}

function verifyPassword(user, password) {
  return user.password === hashPassword(password);
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      product: user.product
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
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
      
      // 记录登录成功日志
      await logUserAction(user.id, user.username, user.product, 'login', true);
    }

    const token = generateToken(user);

    return {
      token,
      userId: user.id,
      username: user.username,
      product: user.product,
      isNewUser,
      message: isNewUser ? '新用户已创建并返回token' : '登录成功，返回token'
    };
  } catch (error) {
    logger.error('获取token失败', { username: trimmedUsername, product: trimmedProduct, error: error.message });
    throw error;
  }
}

export async function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      valid: false,
      error: 'token不能为空'
    };
  }

  try {
    const decoded = jwt.verify(token.trim(), JWT_SECRET);
    const user = await findUser(decoded.username, decoded.product);

    if (!user) {
      // 记录验证失败日志
      await logUserAction(decoded.userId, decoded.username, decoded.product, 'verify', false, '用户不存在');
      return {
        valid: false,
        error: '用户不存在'
      };
    }

    // 记录验证成功日志
    await logUserAction(user.id, user.username, user.product, 'verify', true);

    return {
      valid: true,
      userId: user.id,
      username: user.username,
      product: user.product,
      createdAt: user.created_at,
      tokenExp: new Date(decoded.exp * 1000).toISOString(),
      tokenIat: new Date(decoded.iat * 1000).toISOString()
    };
  } catch (error) {
    let errorMessage = 'token无效';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'token已过期';
    }
    
    // 尝试记录验证失败日志（如果能解析出用户信息）
    try {
      const decoded = jwt.decode(token.trim());
      if (decoded && decoded.username && decoded.product) {
        await logUserAction(decoded.userId, decoded.username, decoded.product, 'verify', false, errorMessage);
      }
    } catch (decodeError) {
      // 忽略解码错误
    }

    return {
      valid: false,
      error: errorMessage
    };
  }
}

// 导出初始化函数供外部使用
export { initDatabase };
