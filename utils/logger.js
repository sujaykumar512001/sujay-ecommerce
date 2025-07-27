/**
 * Production-Ready Logging System
 * Uses Winston for structured logging with different levels and transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'ecommerce-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Production: Add console transport with minimal output
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, service, environment }) => {
        return `${timestamp} [${level.toUpperCase()}] ${service}: ${message}`;
      })
    ),
    level: 'info'
  }));
}

// Create specialized loggers
const appLogger = {
  info: (message, meta = {}) => logger.info(message, { ...meta, component: 'app' }),
  error: (message, meta = {}) => logger.error(message, { ...meta, component: 'app' }),
  warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'app' }),
  debug: (message, meta = {}) => logger.debug(message, { ...meta, component: 'app' }),
  
  // Database logging
  db: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'database' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'database' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'database' }),
  },
  
  // API logging
  api: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'api' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'api' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'api' }),
  },
  
  // Security logging
  security: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'security' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'security' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'security' }),
  },
  
  // Performance logging
  performance: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'performance' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'performance' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'performance' }),
  },
  
  // Cache logging
  cache: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'cache' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'cache' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'cache' }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, component: 'cache' }),
  },
  
  // Email logging
  email: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'email' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'email' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'email' }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, component: 'email' }),
  },
  
  // Validation logging
  validation: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'validation' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'validation' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'validation' }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, component: 'validation' }),
  },
  
  // Auth logging
  auth: {
    info: (message, meta = {}) => logger.info(message, { ...meta, component: 'auth' }),
    error: (message, meta = {}) => logger.error(message, { ...meta, component: 'auth' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, component: 'auth' }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, component: 'auth' }),
  }
};

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 5,
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log'),
    maxsize: 5242880,
    maxFiles: 5,
  })
);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  logger.end(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  logger.end(() => {
    process.exit(0);
  });
});

module.exports = appLogger; 