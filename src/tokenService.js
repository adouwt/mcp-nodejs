import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { database } from './database.js';
import { logger } from './logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'mcp-login-register-secret-key';
const TOKEN_EXPIRES_IN = '7d'; // Token有效期7天

/**
 * 生成Token哈希值
 */
function generateTokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 创建并存储Token
 */
async function createToken(user, clientInfo = null) {
  try {
    // 生成JWT Token
    const payload = {
      userId: user.id,
      username: user.username,
      product: user.product
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
    const tokenHash = generateTokenHash(token);
    
    // 计算过期时间
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    
    // 存储到数据库
    const sql = `
      INSERT INTO user_tokens (
        user_id, username, product, token_hash, jwt_token, 
        expires_at, client_info, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const result = await database.query(sql, [
      user.id,
      user.username,
      user.product,
      tokenHash,
      token,
      expiresAt,
      clientInfo ? JSON.stringify(clientInfo) : null
    ]);
    
    const tokenId = result.insertId;
    
    logger.info('Token创建成功', {
      tokenId,
      userId: user.id,
      username: user.username,
      product: user.product,
      expiresAt: expiresAt.toISOString()
    });
    
    return {
      tokenId,
      token,
      expiresAt: expiresAt.toISOString()
    };
    
  } catch (error) {
    logger.error('Token创建失败', { 
      userId: user.id, 
      username: user.username, 
      product: user.product,
      error: error.message 
    });
    throw error;
  }
}

/**
 * 验证Token
 */
async function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return {
        valid: false,
        error: 'token不能为空'
      };
    }
    
    const tokenHash = generateTokenHash(token.trim());
    
    // 从数据库查询Token记录
    const sql = `
      SELECT t.*, u.status as user_status 
      FROM user_tokens t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE t.token_hash = ? AND t.is_active = 1
    `;
    
    const tokenRecords = await database.query(sql, [tokenHash]);
    
    if (tokenRecords.length === 0) {
      return {
        valid: false,
        error: 'token不存在或已被撤销'
      };
    }
    
    const tokenRecord = tokenRecords[0];
    
    // 检查用户是否存在且状态正常
    if (!tokenRecord.user_status || tokenRecord.user_status !== 1) {
      return {
        valid: false,
        error: '用户不存在或已被禁用'
      };
    }
    
    // 检查Token是否过期
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    
    if (now > expiresAt) {
      // 自动撤销过期Token
      await revokeToken(tokenRecord.id, 'expired');
      return {
        valid: false,
        error: 'token已过期'
      };
    }
    
    // 验证JWT签名
    try {
      const decoded = jwt.verify(token.trim(), JWT_SECRET);
      
      // 更新最后使用时间
      await updateTokenLastUsed(tokenRecord.id);
      
      return {
        valid: true,
        tokenId: tokenRecord.id,
        userId: tokenRecord.user_id,
        username: tokenRecord.username,
        product: tokenRecord.product,
        createdAt: tokenRecord.created_at,
        expiresAt: tokenRecord.expires_at,
        lastUsedAt: new Date().toISOString(),
        tokenExp: new Date(decoded.exp * 1000).toISOString(),
        tokenIat: new Date(decoded.iat * 1000).toISOString()
      };
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        await revokeToken(tokenRecord.id, 'jwt_expired');
        return {
          valid: false,
          error: 'token已过期'
        };
      }
      
      await revokeToken(tokenRecord.id, 'invalid_signature');
      return {
        valid: false,
        error: 'token签名无效'
      };
    }
    
  } catch (error) {
    logger.error('Token验证失败', { error: error.message });
    return {
      valid: false,
      error: 'token验证失败'
    };
  }
}

/**
 * 撤销Token
 */
async function revokeToken(tokenId, reason = 'manual') {
  try {
    const sql = `
      UPDATE user_tokens 
      SET is_active = 0, revoked_at = NOW(), revoke_reason = ?
      WHERE id = ? AND is_active = 1
    `;
    
    const result = await database.query(sql, [reason, tokenId]);
    
    if (result.affectedRows > 0) {
      logger.info('Token撤销成功', { tokenId, reason });
      return true;
    }
    
    return false;
    
  } catch (error) {
    logger.error('Token撤销失败', { tokenId, reason, error: error.message });
    throw error;
  }
}

/**
 * 撤销用户的所有Token
 */
async function revokeAllUserTokens(userId, reason = 'logout_all') {
  try {
    const sql = `
      UPDATE user_tokens 
      SET is_active = 0, revoked_at = NOW(), revoke_reason = ?
      WHERE user_id = ? AND is_active = 1
    `;
    
    const result = await database.query(sql, [reason, userId]);
    
    logger.info('用户所有Token撤销成功', { 
      userId, 
      reason, 
      revokedCount: result.affectedRows 
    });
    
    return result.affectedRows;
    
  } catch (error) {
    logger.error('撤销用户所有Token失败', { userId, reason, error: error.message });
    throw error;
  }
}

/**
 * 更新Token最后使用时间
 */
async function updateTokenLastUsed(tokenId) {
  try {
    const sql = 'UPDATE user_tokens SET last_used_at = NOW() WHERE id = ?';
    await database.query(sql, [tokenId]);
  } catch (error) {
    logger.warn('更新Token使用时间失败', { tokenId, error: error.message });
  }
}

/**
 * 清理过期Token
 */
async function cleanupExpiredTokens() {
  try {
    const sql = `
      UPDATE user_tokens 
      SET is_active = 0, revoked_at = NOW(), revoke_reason = 'expired'
      WHERE expires_at < NOW() AND is_active = 1
    `;
    
    const result = await database.query(sql);
    
    if (result.affectedRows > 0) {
      logger.info('清理过期Token完成', { cleanedCount: result.affectedRows });
    }
    
    return result.affectedRows;
    
  } catch (error) {
    logger.error('清理过期Token失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取用户的活跃Token列表
 */
async function getUserActiveTokens(userId) {
  try {
    const sql = `
      SELECT id, token_hash, expires_at, client_info, last_used_at, created_at
      FROM user_tokens 
      WHERE user_id = ? AND is_active = 1 AND expires_at > NOW()
      ORDER BY last_used_at DESC
    `;
    
    const tokens = await database.query(sql, [userId]);
    return tokens;
    
  } catch (error) {
    logger.error('获取用户活跃Token失败', { userId, error: error.message });
    throw error;
  }
}

export {
  createToken,
  verifyToken,
  revokeToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  getUserActiveTokens
};
