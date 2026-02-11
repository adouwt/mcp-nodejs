import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `mcp-${date}.log`);
}

function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
}

function writeLog(level, message, data) {
  try {
    // 确保 log 目录存在
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const logContent = formatLog(level, message, data);
    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, logContent, 'utf-8');
  } catch (err) {
    // 如果写入失败，输出到 stderr（不会干扰 MCP 的 stdio 通信）
    console.error(`[LOG ERROR] ${err.message}`);
  }
}

export const logger = {
  info: (message, data) => writeLog('INFO', message, data),
  error: (message, data) => writeLog('ERROR', message, data),
  debug: (message, data) => writeLog('DEBUG', message, data),
  warn: (message, data) => writeLog('WARN', message, data)
};
