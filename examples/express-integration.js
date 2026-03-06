// Express.js 集成示例
import express from 'express';
import { login, verifyToken } from '../lib/client.js';

const app = express();
app.use(express.json());

// 登录/注册接口
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, product } = req.body;
    
    if (!username || !password || !product) {
      return res.status(400).json({
        success: false,
        message: '用户名、密码和产品名称都是必填的'
      });
    }

    const result = await login(username, password, product);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// Token 校验接口
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token 是必填的'
      });
    }

    const result = await verifyToken(token);
    
    if (result.valid) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 中间件：验证 JWT Token
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '缺少 Authorization header'
    });
  }

  verifyToken(token)
    .then(result => {
      if (result.valid) {
        req.user = result;
        next();
      } else {
        res.status(401).json({
          success: false,
          message: result.error
        });
      }
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
}

// 受保护的路由示例
app.get('/api/user/profile', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      username: req.user.username,
      product: req.user.product,
      createdAt: req.user.createdAt
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('API 端点:');
  console.log('  POST /api/auth/login - 登录/注册');
  console.log('  POST /api/auth/verify - 校验token');
  console.log('  GET  /api/user/profile - 获取用户信息（需要token）');
});

export default app;
