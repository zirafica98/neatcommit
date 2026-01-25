import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    // Dodaj emoji ikone za različite tipove poruka
    let icon = '';
    const msgLower = String(message || '').toLowerCase();
    
    if (msgLower.includes('error') || msgLower.includes('failed')) {
      icon = '❌';
    } else if (msgLower.includes('success') || msgLower.includes('connected') || msgLower.includes('ready')) {
      icon = '✅';
    } else if (msgLower.includes('warning') || msgLower.includes('warn')) {
      icon = '⚠️';
    } else if (msgLower.includes('info') || msgLower.includes('processing')) {
      icon = 'ℹ️';
    } else if (msgLower.includes('server') || msgLower.includes('running')) {
      icon = '🚀';
    } else if (msgLower.includes('database')) {
      icon = '💾';
    } else if (msgLower.includes('redis')) {
      icon = '🔴';
    } else if (msgLower.includes('webhook') || msgLower.includes('event')) {
      icon = '📡';
    } else if (msgLower.includes('job') || msgLower.includes('queue')) {
      icon = '⚙️';
    } else if (msgLower.includes('worker')) {
      icon = '👷';
    }
    
    // Formatiraj poruku
    let output = `${timestamp} ${icon} ${level} ${message}`;
    
    // Dodaj meta podatke ako postoje, ali formatiraj lepše
    if (Object.keys(meta).length > 0) {
      const metaParts: string[] = [];
      
      for (const [key, value] of Object.entries(meta)) {
        if (value !== undefined && value !== null && key !== 'service') {
          // Za objekte, prikaži kompaktno
          if (typeof value === 'object') {
            const objStr = JSON.stringify(value);
            // Skrati duge objekte
            if (objStr.length > 100) {
              metaParts.push(`${key}=${objStr.substring(0, 100)}...`);
            } else {
              metaParts.push(`${key}=${objStr}`);
            }
          } else {
            metaParts.push(`${key}=${value}`);
          }
        }
      }
      
      if (metaParts.length > 0) {
        output += `\n   └─ ${metaParts.join(' | ')}`;
      }
    }
    
    return output;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'elementer-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}
