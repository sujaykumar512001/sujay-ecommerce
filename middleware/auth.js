const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Configuration
 * Handles JWT and session-based authentication with security features
 */
class AuthMiddleware {
  constructor() {
    this.config = this.getConfig();
    this.failedAttempts = new Map(); // Track failed authentication attempts
  }

  /**
   * Get configuration from environment variables
   */
  getConfig() {
    return {
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        issuer: process.env.JWT_ISSUER || 'ecommerce-app',
        audience: process.env.JWT_AUDIENCE || 'ecommerce-users'
      },
      security: {
        maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.AUTH_LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
        tokenPrefix: process.env.AUTH_TOKEN_PREFIX || 'Bearer',
        cookieName: process.env.AUTH_COOKIE_NAME || 'token',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000 // 24 hours
      },
      roles: {
        admin: 'admin',
        moderator: 'moderator',
        user: 'user'
      },
      logging: {
        enabled: process.env.AUTH_LOGGING_ENABLED !== 'false',
        level: process.env.AUTH_LOG_LEVEL || 'info'
      }
    };
  }

  /**
   * Validate JWT secret is configured
   */
  validateConfig() {
    if (!this.config.jwt.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    if (this.config.jwt.secret === 'your-secret-key') {
      throw new Error('JWT_SECRET must be changed from default value');
    }
  }

  /**
   * Log authentication events
   */
  log(level, message, data = {}) {
    if (!this.config.logging.enabled) return;

    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };

    switch (level) {
      case 'error':
        console.error(`[AUTH] ${message}`, logData);
        break;
      case 'warn':
        console.warn(`[AUTH] ${message}`, logData);
        break;
      case 'info':
        console.log(`[AUTH] ${message}`, logData);
        break;
      case 'debug':
        if (this.config.logging.level === 'debug') {
          console.log(`[AUTH DEBUG] ${message}`, logData);
        }
        break;
    }
  }

  /**
   * Extract token from request
   */
  extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith(`${this.config.security.tokenPrefix} `)) {
      return authHeader.substring(this.config.security.tokenPrefix.length + 1);
    }

    // Check cookies
    if (req.cookies && req.cookies[this.config.security.cookieName]) {
      return req.cookies[this.config.security.cookieName];
    }

    // Check query parameters (for specific use cases)
    if (req.query.token) {
      return req.query.token;
    }

    return null;
  }

  /**
   * Validate token format
   */
  validateTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check if parts are base64 encoded
    try {
      parts.forEach(part => {
        if (part) {
          Buffer.from(part, 'base64');
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if IP is rate limited
   */
  isRateLimited(ip) {
    const attempts = this.failedAttempts.get(ip);
    if (!attempts) return false;

    const { count, lastAttempt } = attempts;
    const timeSinceLastAttempt = Date.now() - lastAttempt;

    // Reset if lockout period has passed
    if (timeSinceLastAttempt > this.config.security.lockoutDuration) {
      this.failedAttempts.delete(ip);
      return false;
    }

    return count >= this.config.security.maxFailedAttempts;
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(ip) {
    const attempts = this.failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedAttempts.set(ip, attempts);

    this.log('warn', 'Failed authentication attempt', {
      ip,
      attemptCount: attempts.count,
      maxAttempts: this.config.security.maxFailedAttempts
    });
  }

  /**
   * Clear failed attempts for successful authentication
   */
  clearFailedAttempts(ip) {
    this.failedAttempts.delete(ip);
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(res, statusCode, message, details = {}) {
    const errorResponse = {
      success: false,
      error: {
        message,
        code: details.code || 'AUTH_ERROR',
        timestamp: new Date().toISOString()
      }
    };

    if (process.env.NODE_ENV === 'development' && details.debug) {
      errorResponse.error.debug = details.debug;
    }

    return res.status(statusCode).json(errorResponse);
  }

  /**
   * Verify JWT token with enhanced security
   */
  async verifyToken(token, options = {}) {
    try {
      // Validate token format first
      if (!this.validateTokenFormat(token)) {
        throw new Error('Invalid token format');
      }

      const decoded = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        ...options
      });

      return { success: true, decoded };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        code: this.getJWTErrorCode(error)
      };
    }
  }

  /**
   * Get JWT error code for better error handling
   */
  getJWTErrorCode(error) {
    if (error.name === 'TokenExpiredError') return 'TOKEN_EXPIRED';
    if (error.name === 'JsonWebTokenError') return 'TOKEN_INVALID';
    if (error.name === 'NotBeforeError') return 'TOKEN_NOT_ACTIVE';
    return 'TOKEN_ERROR';
  }

  /**
   * Generate JWT token with enhanced security
   */
  generateToken(userId, options = {}) {
    this.validateConfig();

    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      ...options.payload
    };

    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: options.expiresIn || this.config.jwt.expiresIn,
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
      ...options
    });
  }

  /**
   * Check user role with validation
   */
  hasRole(user, requiredRoles) {
    if (!user || !user.role) {
      return false;
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role);
  }

  /**
   * Middleware to verify JWT token
   */
  authenticateToken = async (req, res, next) => {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress;

    try {
      // Check rate limiting
      if (this.isRateLimited(ip)) {
        this.log('warn', 'Rate limited authentication attempt', { ip });
        return this.createErrorResponse(res, 429, 'Too many authentication attempts. Please try again later.');
      }

      const token = this.extractToken(req);
      
      if (!token) {
        this.recordFailedAttempt(ip);
        this.log('info', 'No token provided', { ip, path: req.path });
        return this.createErrorResponse(res, 401, 'Authentication token required');
      }

      // Verify token
      const verification = await this.verifyToken(token);
      if (!verification.success) {
        this.recordFailedAttempt(ip);
        this.log('warn', 'Token verification failed', { 
          ip, 
          path: req.path, 
          error: verification.error,
          code: verification.code
        });
        return this.createErrorResponse(res, 401, 'Invalid authentication token');
      }

      // Get user information
      const user = await User.findById(verification.decoded.userId).select('-password');
      if (!user) {
        this.recordFailedAttempt(ip);
        this.log('warn', 'User not found for token', { 
          ip, 
          userId: verification.decoded.userId 
        });
        return this.createErrorResponse(res, 401, 'User not found');
      }

      // Check if user is active
      if (user.status && user.status !== 'active') {
        this.log('warn', 'Inactive user authentication attempt', { 
          ip, 
          userId: user._id,
          status: user.status
        });
        return this.createErrorResponse(res, 401, 'Account is not active');
      }

      // Set user in request
      req.user = user;
      req.userId = user._id;
      req.token = token;

      // Clear failed attempts on successful authentication
      this.clearFailedAttempts(ip);

      const responseTime = Date.now() - startTime;
      this.log('info', 'Authentication successful', {
        ip,
        userId: user._id,
        username: user.username,
        role: user.role,
        path: req.path,
        responseTime: `${responseTime}ms`
      });

      next();
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailedAttempt(ip);
      
      this.log('error', 'Authentication error', {
        ip,
        path: req.path,
        error: error.message,
        responseTime: `${responseTime}ms`
      });

      return this.createErrorResponse(res, 500, 'Authentication service error');
    }
  };

  /**
   * Middleware to require admin privileges
   */
  requireAdmin = async (req, res, next) => {
    try {
      if (!req.user) {
        return this.createErrorResponse(res, 401, 'Authentication required');
      }
      
      if (!this.hasRole(req.user, this.config.roles.admin)) {
        this.log('warn', 'Admin access denied', {
          userId: req.user._id,
          username: req.user.username,
          role: req.user.role,
          path: req.path
        });
        return this.createErrorResponse(res, 403, 'Admin privileges required');
      }
      
      this.log('info', 'Admin access granted', {
        userId: req.user._id,
        username: req.user.username,
        path: req.path
      });
      
      next();
    } catch (error) {
      this.log('error', 'Admin check error', {
        error: error.message,
        path: req.path
      });
      return this.createErrorResponse(res, 500, 'Authorization service error');
    }
  };

  /**
   * Moderator or Admin access
   */
  moderator = (req, res, next) => {
    if (!req.user) {
      return this.createErrorResponse(res, 401, 'Authentication required');
    }

    if (this.hasRole(req.user, [this.config.roles.admin, this.config.roles.moderator])) {
      this.log('info', 'Moderator access granted', {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
        path: req.path
      });
      next();
    } else {
      this.log('warn', 'Moderator access denied', {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
        path: req.path
      });
      return this.createErrorResponse(res, 403, 'Moderator privileges required');
    }
  };

  /**
   * Optional authentication middleware
   */
  optionalAuth = async (req, res, next) => {
    const token = this.extractToken(req);
    
    if (token) {
      try {
        const verification = await this.verifyToken(token);
        if (verification.success) {
          const user = await User.findById(verification.decoded.userId).select('-password');
          if (user && (!user.status || user.status === 'active')) {
            req.user = user;
            req.userId = user._id;
            req.token = token;
            
            this.log('debug', 'Optional authentication successful', {
              userId: user._id,
              username: user.username,
              role: user.role
            });
          }
        }
      } catch (error) {
        this.log('debug', 'Optional authentication failed', {
          error: error.message
        });
      }
    } else if (req.session && req.session.user) {
      // Fallback to session authentication
      req.user = req.session.user;
      req.userId = req.session.user._id;
      
      this.log('debug', 'Session authentication used', {
        userId: req.user._id,
        username: req.user.username
      });
    }
    
    next();
  };

  /**
   * JWT authentication for web pages
   */
  authenticateTokenWeb = async (req, res, next) => {
    const token = this.extractToken(req);
    
    if (token) {
      try {
        const verification = await this.verifyToken(token);
        if (verification.success) {
          const user = await User.findById(verification.decoded.userId).select('-password');
          if (user && (!user.status || user.status === 'active')) {
            req.user = user;
            req.userId = user._id;
            req.token = token;
            
            this.log('info', 'Web authentication successful', {
              userId: user._id,
              username: user.username,
              role: user.role
            });
            return next();
          }
        }
      } catch (error) {
        this.log('warn', 'Web authentication failed', {
          error: error.message
        });
      }
    }
    
    // Fallback to session authentication
    if (req.session && req.session.user) {
      req.user = req.session.user;
      req.userId = req.session.user._id;
      
      this.log('info', 'Web session authentication used', {
        userId: req.user._id,
        username: req.user.username
      });
      return next();
    }
    
    this.log('info', 'Web authentication failed, redirecting to login');
    return res.redirect('/users/login');
  };

  /**
   * Admin authentication for web pages
   */
  requireAdminWeb = async (req, res, next) => {
    try {
      if (!req.user) {
        this.log('info', 'Web admin access denied - no user');
        return res.redirect('/users/login');
      }
      
      if (!this.hasRole(req.user, this.config.roles.admin)) {
        this.log('warn', 'Web admin access denied - insufficient privileges', {
          userId: req.user._id,
          username: req.user.username,
          role: req.user.role
        });
        return res.redirect('/');
      }
      
      this.log('info', 'Web admin access granted', {
        userId: req.user._id,
        username: req.user.username
      });
      next();
    } catch (error) {
      this.log('error', 'Web admin check error', {
        error: error.message
      });
      res.redirect('/users/login');
    }
  };

  /**
   * Protect routes - require authentication
   */
  protect = async (req, res, next) => {
    try {
      await this.authenticateToken(req, res, next);
    } catch (error) {
      this.log('error', 'Protect middleware error', {
        error: error.message,
        ip: req.ip
      });
      return this.createErrorResponse(res, 401, 'Authentication required');
    }
  };

  /**
   * Check if user owns resource or is admin
   */
  ownerOrAdmin = (resourceUserField = "user") => {
    return (req, res, next) => {
      if (!req.user) {
        return this.createErrorResponse(res, 401, 'Authentication required');
      }

      // Admin can access everything
      if (this.hasRole(req.user, this.config.roles.admin)) {
        return next();
      }

      // Check if user owns the resource
      const resource = req.resource || req.body || req.params;
      const resourceUserId = resource[resourceUserField];

      if (resourceUserId && resourceUserId.toString() === req.user._id.toString()) {
        return next();
      }

      this.log('warn', 'Resource access denied', {
        userId: req.user._id,
        username: req.user.username,
        resourceUserId,
        resourceUserField
      });

      return this.createErrorResponse(res, 403, 'Access denied. You can only access your own resources.');
    };
  };

  /**
   * Get authentication statistics
   */
  getAuthStats() {
    const stats = {
      failedAttempts: this.failedAttempts.size,
      totalFailedAttempts: 0,
      lockedIPs: 0
    };

    for (const [ip, attempts] of this.failedAttempts.entries()) {
      stats.totalFailedAttempts += attempts.count;
      if (this.isRateLimited(ip)) {
        stats.lockedIPs++;
      }
    }

    return stats;
  }

  /**
   * Clear all failed attempts (admin function)
   */
  clearAllFailedAttempts() {
    this.failedAttempts.clear();
    this.log('info', 'All failed authentication attempts cleared');
  }
}

// Create and export instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions
module.exports = {
  protect: authMiddleware.protect,
  authenticateToken: authMiddleware.authenticateToken,
  requireAdmin: authMiddleware.requireAdmin,
  moderator: authMiddleware.moderator,
  optionalAuth: authMiddleware.optionalAuth,
  authenticateTokenWeb: authMiddleware.authenticateTokenWeb,
  requireAdminWeb: authMiddleware.requireAdminWeb,
  generateToken: (userId, options) => authMiddleware.generateToken(userId, options),
  verifyToken: (token, options) => authMiddleware.verifyToken(token, options),
  ownerOrAdmin: (resourceUserField) => authMiddleware.ownerOrAdmin(resourceUserField),
  // Export the instance for additional functionality
  auth: authMiddleware
}; 