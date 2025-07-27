/**
 * Base Controller - Common functionality for all controllers
 * Standardized response handling, error management, and utilities
 */

const crypto = require('crypto');
const CONSTANTS = require('../config/constants');

class BaseController {
  constructor({ 
    cacheService, 
    loggingService, 
    validationService,
    config = CONSTANTS 
  }) {
    this.cacheService = cacheService;
    this.loggingService = loggingService;
    this.validationService = validationService;
    this.config = config;
  }

  // Standard success response
  success(res, data, options = {}) {
    const {
      statusCode = 200,
      message = 'Success',
      meta = {},
      cache = false,
      ttl = 300
    } = options;

    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    if (cache) this.setCacheHeaders(res, ttl);
    this.setStandardHeaders(res);

    return res.status(statusCode).json(response);
  }

  // Standard error response
  error(res, error, options = {}) {
    const {
      statusCode = 500,
      message = 'Internal server error',
      code = 'INTERNAL_ERROR',
      details = null
    } = options;

    const response = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      this.loggingService.error('Controller Error', {
        error: error.message,
        stack: error.stack,
        statusCode,
        code
      });
    }

    return res.status(statusCode).json(response);
  }

  // Paginated response
  paginated(res, data, pagination, options = {}) {
    const {
      message = 'Data retrieved successfully',
      cache = false,
      ttl = 300
    } = options;

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const response = {
      success: true,
      message,
      data,
      pagination: {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    if (cache) this.setCacheHeaders(res, ttl);
    this.setStandardHeaders(res);

    return res.status(200).json(response);
  }

  // Cache control headers
  setCacheHeaders(res, ttl = 300) {
    res.set({
      'Cache-Control': `public, max-age=${ttl}`,
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
  }

  // Security headers
  setStandardHeaders(res) {
    res.set({
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
  }

  // Pagination validator
  validatePagination(page, limit, maxLimit = 100) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const errors = [];
    if (pageNum < 1) errors.push('Page number must be greater than 0');
    if (limitNum < 1 || limitNum > maxLimit) {
      errors.push(`Limit must be between 1 and ${maxLimit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      page: pageNum,
      limit: limitNum,
      skip: (pageNum - 1) * limitNum
    };
  }

  // Input sanitization
  sanitizeInput(input, type = 'string') {
    if (!input) return input;

    switch (type) {
      case 'string':
        return String(input).trim().replace(/[<>]/g, '');
      case 'number':
        const num = Number(input);
        return isNaN(num) ? null : num;
      case 'email':
        return String(input).toLowerCase().trim();
      case 'search':
        return String(input).trim().replace(/[<>]/g, '').substring(0, 100);
      case 'id':
        return String(input).trim().replace(/[^a-zA-Z0-9-_]/g, '');
      default:
        return String(input).trim();
    }
  }

  // Query builder for Mongoose
  createQueryOptions({
    select = null,
    populate = null,
    lean = true,
    sort = null,
    skip = 0,
    limit = null
  } = {}) {
    const options = {};
    if (select) options.select = select;
    if (populate) options.populate = populate;
    if (lean) options.lean = lean;
    if (sort) options.sort = sort;
    if (skip) options.skip = skip;
    if (limit) options.limit = limit;
    return options;
  }

  // Async wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Cache key creation
  getCacheKey(req, prefix = 'api') {
    const { url, method, query, params } = req;
    const rawKey = `${prefix}:${method}:${url}:${JSON.stringify(query)}:${JSON.stringify(params)}`;
    return this.hashKey(rawKey);
  }

  // Hash cache key
  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  // Caching rule
  shouldCache(req) {
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return false;
    if (req.user?.role === 'admin') return false;
    return true;
  }

  // Calculate response time
  getResponseTime(startTime) {
    return Date.now() - startTime;
  }

  // Log performance
  logPerformance(req, responseTime, statusCode) {
    this.loggingService.info('Request Performance', {
      url: req.url,
      method: req.method,
      responseTime,
      statusCode,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  }

  // Role check helpers
  isAuthenticated(req) {
    return !!req.user;
  }

  isAdmin(req) {
    return req.user?.role === 'admin';
  }
}

module.exports = BaseController;
