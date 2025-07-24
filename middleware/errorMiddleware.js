/**
 * Error Middleware
 * Enhanced error handling with security, categorization, and monitoring
 */

/**
 * Error configuration
 */
const errorConfig = {
  messages: {
    notFound: process.env.ERROR_MSG_NOT_FOUND || 'Resource not found',
    validation: process.env.ERROR_MSG_VALIDATION || 'Validation error',
    duplicate: process.env.ERROR_MSG_DUPLICATE || 'already exists',
    tokenInvalid: process.env.ERROR_MSG_TOKEN_INVALID || 'Invalid token',
    tokenExpired: process.env.ERROR_MSG_TOKEN_EXPIRED || 'Token expired',
    fileTooLarge: process.env.ERROR_MSG_FILE_TOO_LARGE || 'File too large',
    tooManyFiles: process.env.ERROR_MSG_TOO_MANY_FILES || 'Too many files uploaded',
    templateError: process.env.ERROR_MSG_TEMPLATE_ERROR || 'Template rendering error',
    databaseError: process.env.ERROR_MSG_DATABASE_ERROR || 'Database connection error',
    serverError: process.env.ERROR_MSG_SERVER_ERROR || 'Internal server error',
    unauthorized: process.env.ERROR_MSG_UNAUTHORIZED || 'Unauthorized access',
    forbidden: process.env.ERROR_MSG_FORBIDDEN || 'Access forbidden'
  },
  statusCodes: {
    notFound: parseInt(process.env.ERROR_STATUS_NOT_FOUND) || 404,
    validation: parseInt(process.env.ERROR_STATUS_VALIDATION) || 400,
    duplicate: parseInt(process.env.ERROR_STATUS_DUPLICATE) || 400,
    tokenInvalid: parseInt(process.env.ERROR_STATUS_TOKEN_INVALID) || 401,
    tokenExpired: parseInt(process.env.ERROR_STATUS_TOKEN_EXPIRED) || 401,
    fileTooLarge: parseInt(process.env.ERROR_STATUS_FILE_TOO_LARGE) || 400,
    tooManyFiles: parseInt(process.env.ERROR_STATUS_TOO_MANY_FILES) || 400,
    templateError: parseInt(process.env.ERROR_STATUS_TEMPLATE_ERROR) || 500,
    databaseError: parseInt(process.env.ERROR_STATUS_DATABASE_ERROR) || 503,
    serverError: parseInt(process.env.ERROR_STATUS_SERVER_ERROR) || 500,
    unauthorized: parseInt(process.env.ERROR_STATUS_UNAUTHORIZED) || 401,
    forbidden: parseInt(process.env.ERROR_STATUS_FORBIDDEN) || 403
  },
  logging: {
    enabled: process.env.ERROR_LOGGING_ENABLED !== 'false',
    level: process.env.ERROR_LOG_LEVEL || 'error',
    includeStack: process.env.ERROR_INCLUDE_STACK === 'true',
    includeUserAgent: process.env.ERROR_INCLUDE_USER_AGENT !== 'false',
    includeIP: process.env.ERROR_INCLUDE_IP !== 'false'
  },
  security: {
    hideStackInProduction: process.env.ERROR_HIDE_STACK_PROD !== 'false',
    sanitizeMessages: process.env.ERROR_SANITIZE_MESSAGES !== 'false',
    maxErrorRate: parseInt(process.env.ERROR_MAX_RATE) || 100 // errors per minute
  }
};

/**
 * Error severity levels
 */
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories
 */
const ErrorCategory = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  FILE: 'file',
  TEMPLATE: 'template',
  NETWORK: 'network',
  SYSTEM: 'system',
  CLIENT: 'client'
};

/**
 * Error tracking for rate limiting
 */
const errorTracker = {
  errors: new Map(),
  maxErrors: errorConfig.security.maxErrorRate,
  windowMs: 60 * 1000 // 1 minute
};

/**
 * Sanitize error message for security
 */
const sanitizeMessage = (message) => {
  if (!errorConfig.security.sanitizeMessages) {
    return message;
  }

  // Remove potential sensitive information
  return message
    .replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]')
    .replace(/token\s*[:=]\s*\S+/gi, 'token: [REDACTED]')
    .replace(/secret\s*[:=]\s*\S+/gi, 'secret: [REDACTED]')
    .replace(/key\s*[:=]\s*\S+/gi, 'key: [REDACTED]')
    .replace(/\/[^\/]*\/[^\/]*\/[^\/]*\//g, '/[PATH]/'); // Sanitize file paths
};

/**
 * Get error severity based on error type
 */
const getErrorSeverity = (error) => {
  // Critical errors
  if (error.name === 'MongoNetworkError' || 
      error.name === 'MongoServerSelectionError' ||
      error.code === 'ECONNREFUSED') {
    return ErrorSeverity.CRITICAL;
  }

  // High severity errors
  if (error.name === 'ValidationError' ||
      error.name === 'CastError' ||
      error.code === 11000) {
    return ErrorSeverity.HIGH;
  }

  // Medium severity errors
  if (error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.code === 'LIMIT_FILE_SIZE') {
    return ErrorSeverity.MEDIUM;
  }

  // Low severity errors (default)
  return ErrorSeverity.LOW;
};

/**
 * Get error category based on error type
 */
const getErrorCategory = (error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return ErrorCategory.VALIDATION;
  }
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return ErrorCategory.AUTHENTICATION;
  }
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
    return ErrorCategory.DATABASE;
  }
  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return ErrorCategory.FILE;
  }
  if (error.message && error.message.includes('ENOENT')) {
    return ErrorCategory.TEMPLATE;
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return ErrorCategory.NETWORK;
  }
  return ErrorCategory.SYSTEM;
};

/**
 * Check if error rate limit is exceeded
 */
const isErrorRateLimited = (ip) => {
  const now = Date.now();
  const windowStart = now - errorTracker.windowMs;
  
  if (!errorTracker.errors.has(ip)) {
    errorTracker.errors.set(ip, []);
  }
  
  const errors = errorTracker.errors.get(ip);
  
  // Remove old errors outside the window
  const recentErrors = errors.filter(timestamp => timestamp > windowStart);
  errorTracker.errors.set(ip, recentErrors);
  
  return recentErrors.length >= errorTracker.maxErrors;
};

/**
 * Record error for rate limiting
 */
const recordError = (ip) => {
  if (!errorTracker.errors.has(ip)) {
    errorTracker.errors.set(ip, []);
  }
  
  errorTracker.errors.get(ip).push(Date.now());
};

/**
 * Log error with structured format
 */
const logError = (error, req, severity, category) => {
  if (!errorConfig.logging.enabled) return;

  const logData = {
    timestamp: new Date().toISOString(),
    severity,
    category,
    error: {
      name: error.name,
      message: sanitizeMessage(error.message),
      code: error.code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      query: req.query,
      params: req.params
    },
    user: req.user ? {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    } : null,
    requestId: req.headers['x-request-id'] || req.id || 'unknown'
  };

  // Add optional fields based on configuration
  if (errorConfig.logging.includeIP) {
    logData.request.ip = req.ip || req.connection.remoteAddress;
  }
  
  if (errorConfig.logging.includeUserAgent) {
    logData.request.userAgent = req.get('User-Agent');
  }
  
  if (errorConfig.logging.includeStack && error.stack) {
    logData.error.stack = error.stack;
  }

  // Log based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      console.error('🚨 CRITICAL ERROR:', logData);
      break;
    case ErrorSeverity.HIGH:
      console.error('❌ HIGH ERROR:', logData);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('⚠️ MEDIUM ERROR:', logData);
      break;
    case ErrorSeverity.LOW:
      console.log('ℹ️ LOW ERROR:', logData);
      break;
  }
};

/**
 * Create standardized error response
 */
const createErrorResponse = (error, statusCode, message, req) => {
  const severity = getErrorSeverity(error);
  const category = getErrorCategory(error);
  
  // Log the error
  logError(error, req, severity, category);
  
  // Record for rate limiting
  const ip = req.ip || req.connection.remoteAddress;
  recordError(ip);

  const response = {
    success: false,
    error: {
      message: sanitizeMessage(message),
      code: error.code || 'ERROR',
      category,
      severity,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || req.id || 'unknown'
    }
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development' && 
      errorConfig.logging.includeStack && 
      error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

/**
 * 404 Not Found Middleware
 * Enhanced with better error handling
 */
const notFound = (req, res, next) => {
  const error = new Error(errorConfig.messages.notFound);
  error.name = 'NotFoundError';
  error.statusCode = errorConfig.statusCodes.notFound;
  
  res.status(errorConfig.statusCodes.notFound);
  next(error);
};

/**
 * Global Error Handler Middleware
 * Enhanced with security, categorization, and monitoring
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : errorConfig.statusCodes.serverError;
  let message = err.message;

  // Check if error rate limit is exceeded
  const ip = req.ip || req.connection.remoteAddress;
  if (isErrorRateLimited(ip)) {
    statusCode = 429; // Too Many Requests
    message = 'Too many errors. Please try again later.';
    
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: 'RATE_LIMITED',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle specific error types
  switch (err.name) {
    case 'CastError':
      statusCode = errorConfig.statusCodes.notFound;
      message = errorConfig.messages.notFound;
      break;
      
    case 'ValidationError':
      statusCode = errorConfig.statusCodes.validation;
      message = Object.values(err.errors).map(val => val.message).join(', ');
      break;
      
    case 'JsonWebTokenError':
      statusCode = errorConfig.statusCodes.tokenInvalid;
      message = errorConfig.messages.tokenInvalid;
      break;
      
    case 'TokenExpiredError':
      statusCode = errorConfig.statusCodes.tokenExpired;
      message = errorConfig.messages.tokenExpired;
      break;
      
    case 'MongoNetworkError':
    case 'MongoServerSelectionError':
      statusCode = errorConfig.statusCodes.databaseError;
      message = errorConfig.messages.databaseError;
      break;
      
    case 'NotFoundError':
      statusCode = errorConfig.statusCodes.notFound;
      message = errorConfig.messages.notFound;
      break;
  }

  // Handle specific error codes
  switch (err.code) {
    case 11000:
      statusCode = errorConfig.statusCodes.duplicate;
      const field = Object.keys(err.keyValue)[0];
      message = `${field} ${errorConfig.messages.duplicate}`;
      break;
      
    case 'LIMIT_FILE_SIZE':
      statusCode = errorConfig.statusCodes.fileTooLarge;
      message = errorConfig.messages.fileTooLarge;
      break;
      
    case 'LIMIT_UNEXPECTED_FILE':
      statusCode = errorConfig.statusCodes.tooManyFiles;
      message = errorConfig.messages.tooManyFiles;
      break;
      
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
      statusCode = errorConfig.statusCodes.databaseError;
      message = errorConfig.messages.databaseError;
      break;
  }

  // Handle EJS template errors
  if (err.message && err.message.includes('ENOENT')) {
    statusCode = errorConfig.statusCodes.templateError;
    message = errorConfig.messages.templateError;
  }

  // Create error response
  const errorResponse = createErrorResponse(err, statusCode, message, req);

  // Check if the request expects JSON response
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    res.status(statusCode).json(errorResponse);
  } else {
    // Render error page for web requests
    res.status(statusCode);
    res.render('error', {
      title: 'Error',
      message: errorResponse.error.message,
      statusCode: statusCode,
      error: process.env.NODE_ENV === 'development' ? err : {},
      requestId: errorResponse.error.requestId
    });
  }
};

/**
 * Get error statistics
 */
const getErrorStats = () => {
  const stats = {
    totalErrors: 0,
    errorsByIP: {},
    errorsByCategory: {},
    errorsBySeverity: {},
    rateLimitedIPs: 0
  };

  for (const [ip, errors] of errorTracker.errors.entries()) {
    stats.totalErrors += errors.length;
    stats.errorsByIP[ip] = errors.length;
    
    if (isErrorRateLimited(ip)) {
      stats.rateLimitedIPs++;
    }
  }

  return stats;
};

/**
 * Clear error tracking (admin function)
 */
const clearErrorTracking = () => {
  errorTracker.errors.clear();
};

module.exports = {
  notFound,
  errorHandler,
  getErrorStats,
  clearErrorTracking,
  ErrorSeverity,
  ErrorCategory,
  errorConfig
};
