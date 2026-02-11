import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'mcp-login-register-secret-key';
const TOKEN_EXPIRES_IN = '7d';

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function findUserByUsername(username) {
  const data = readUsers();
  return data.users.find(user => user.username === username);
}

function createUser(username) {
  const data = readUsers();
  const newUser = {
    id: uuidv4(),
    username,
    createdAt: new Date().toISOString()
  };
  data.users.push(newUser);
  writeUsers(data);
  return newUser;
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

export function getTokenByUsername(username) {
  if (!username || typeof username !== 'string' || username.trim() === '') {
    throw new Error('用户名不能为空');
  }

  const trimmedUsername = username.trim();
  let user = findUserByUsername(trimmedUsername);
  let isNewUser = false;

  if (!user) {
    user = createUser(trimmedUsername);
    isNewUser = true;
  }

  const token = generateToken(user);

  return {
    token,
    userId: user.id,
    username: user.username,
    isNewUser,
    message: isNewUser ? '新用户已创建并返回token' : '用户已存在，返回token'
  };
}
