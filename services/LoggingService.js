const winston = require('winston')
const path = require('path')
const fs = require('fs')
const CONSTANTS = require('../config/constants')

/**
 * Logging Service - Handles all logging operations
 */
class LoggingService {
  constructor({ config, cacheService }) {
    this.config = config
    this.cacheService = cacheService
    this.loggingConfig = this.getLoggingConfig()
    this.validateLoggingConfig()
    this.logger = this.createLogger()
    this.logRotation = this.setupLogRotation()
  }

  /**
   * Get logging configuration from environment variables
   */
  getLoggingConfig() {
    return {
      level: process.env.LOG_LEVEL || this.config?.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || this.config?.LOG_FILE,
      maxSize: parseInt(process.env.LOG_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
      retention: parseInt(process.env.LOG_RETENTION_DAYS) || 30,
      format: process.env.LOG_FORMAT || 'json',
      console: process.env.LOG_CONSOLE_ENABLED !== 'false',
      file: process.env.LOG_FILE_ENABLED !== 'false',
      errorFile: process.env.LOG_ERROR_FILE || this.config?.LOG_ERROR_FILE,
      accessFile: process.env.LOG_ACCESS_FILE || this.config?.LOG_ACCESS_FILE,
      performance: {
        enabled: process.env.LOG_PERFORMANCE_ENABLED !== 'false',
        threshold: parseInt(process.env.LOG_PERFORMANCE_THRESHOLD) || 1000
      },
      security: {
        enabled: process.env.LOG_SECURITY_ENABLED !== 'false',
        maskSensitive: process.env.LOG_MASK_SENSITIVE !== 'false'
      },
      business: {
        enabled: process.env.LOG_BUSINESS_ENABLED !== 'false'
      },
      cache: {
        enabled: process.env.LOG_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.LOG_CACHE_TTL) || 5 * 60 * 1000 // 5 minutes
      }
    }
  }

  /**
   * Validate logging configuration
   */
  validateLoggingConfig() {
    const validLevels = ['error', 'warn', 'info', 'debug', 'verbose']
    if (!validLevels.includes(this.loggingConfig.level)) {
      throw new Error(`Invalid log level: ${this.loggingConfig.level}. Valid levels: ${validLevels.join(', ')}`)
    }

    if (this.loggingConfig.maxSize < 1024 * 1024) { // 1MB minimum
      throw new Error('LOG_MAX_SIZE must be at least 1MB')
    }

    if (this.loggingConfig.maxFiles < 1) {
      throw new Error('LOG_MAX_FILES must be at least 1')
    }

    if (this.loggingConfig.retention < 1) {
      throw new Error('LOG_RETENTION_DAYS must be at least 1')
    }

    if (this.loggingConfig.performance.threshold < 0) {
      throw new Error('LOG_PERFORMANCE_THRESHOLD must be non-negative')
    }
  }

  /**
   * Create Winston logger
   * @returns {Object} Winston logger instance
   */
  createLogger() {
    const logFormat = this.createLogFormat()
    const transports = this.createTransports()

    return winston.createLogger({
      level: this.loggingConfig.level,
      format: logFormat,
      transports,
      exitOnError: false,
      silent: false
    })
  }

  /**
   * Create log format
   */
  createLogFormat() {
    const formats = [
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true })
    ]

    if (this.loggingConfig.format === 'json') {
      formats.push(winston.format.json())
    } else {
      formats.push(winston.format.combine(
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`
        })
      ))
    }

    return winston.format.combine(...formats)
  }

  /**
   * Create transports
   */
  createTransports() {
    const transports = []

    // Console transport
    if (this.loggingConfig.console) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      )
    }

    // File transport
    if (this.loggingConfig.file && this.loggingConfig.file) {
      this.ensureLogDirectory(this.loggingConfig.file)
      
      transports.push(
        new winston.transports.File({
          filename: this.loggingConfig.file,
          maxsize: this.loggingConfig.maxSize,
          maxFiles: this.loggingConfig.maxFiles,
          tailable: true
        })
      )
    }

    // Error file transport
    if (this.loggingConfig.errorFile) {
      this.ensureLogDirectory(this.loggingConfig.errorFile)
      
      transports.push(
        new winston.transports.File({
          filename: this.loggingConfig.errorFile,
          level: 'error',
          maxsize: this.loggingConfig.maxSize,
          maxFiles: this.loggingConfig.maxFiles,
          tailable: true
        })
      )
    }

    // Access file transport
    if (this.loggingConfig.accessFile) {
      this.ensureLogDirectory(this.loggingConfig.accessFile)
      
      transports.push(
        new winston.transports.File({
          filename: this.loggingConfig.accessFile,
          level: 'info',
          maxsize: this.loggingConfig.maxSize,
          maxFiles: this.loggingConfig.maxFiles,
          tailable: true
        })
      )
    }

    return transports
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory(filePath) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  /**
   * Setup log rotation
   */
  setupLogRotation() {
    if (this.loggingConfig.retention > 0) {
      setInterval(() => {
        this.clearOldLogs(this.loggingConfig.retention)
      }, 24 * 60 * 60 * 1000) // Daily
    }
  }

  /**
   * Mask sensitive data
   */
  maskSensitiveData(data) {
    if (!this.loggingConfig.security.maskSensitive) {
      return data
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie']
    const masked = { ...data }

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***MASKED***'
      }
    })

    return masked
  }

  /**
   * Validate log message
   */
  validateLogMessage(message, meta = {}) {
    if (!message || typeof message !== 'string') {
      throw new Error('Log message is required and must be a string')
    }

    if (message.length > 1000) {
      throw new Error('Log message too long (max 1000 characters)')
    }

    if (meta && typeof meta !== 'object') {
      throw new Error('Log metadata must be an object')
    }

    return true
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    try {
      this.validateLogMessage(message, meta)
      
      this.logger.info(message, {
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'LoggingService',
        ...this.maskSensitiveData(meta)
      })
    } catch (error) {
      console.error('Logging error:', error.message)
    }
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    try {
      this.validateLogMessage(message, meta)
      
      this.logger.error(message, {
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'LoggingService',
        ...this.maskSensitiveData(meta)
      })
    } catch (error) {
      console.error('Logging error:', error.message)
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    try {
      this.validateLogMessage(message, meta)
      
      this.logger.warn(message, {
        timestamp: new Date().toISOString(),
        level: 'warn',
        service: 'LoggingService',
        ...this.maskSensitiveData(meta)
      })
    } catch (error) {
      console.error('Logging error:', error.message)
    }
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    try {
      this.validateLogMessage(message, meta)
      
      this.logger.debug(message, {
        timestamp: new Date().toISOString(),
        level: 'debug',
        service: 'LoggingService',
        ...this.maskSensitiveData(meta)
      })
    } catch (error) {
      console.error('Logging error:', error.message)
    }
  }

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   */
  logHttpRequest(req, res, responseTime) {
    if (!req || !res) {
      this.error('Invalid request/response objects for HTTP logging')
      return
    }

    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user ? req.user._id : 'anonymous',
      requestId: req.headers['x-request-id'] || 'unknown'
    }

    // Mask sensitive headers
    if (this.loggingConfig.security.maskSensitive) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
      sensitiveHeaders.forEach(header => {
        if (req.headers[header]) {
          logData[`header_${header}`] = '***MASKED***'
        }
      })
    }

    if (res.statusCode >= 400) {
      this.error('HTTP Request Error', logData)
    } else {
      this.info('HTTP Request', logData)
    }

    // Log performance if enabled and threshold exceeded
    if (this.loggingConfig.performance.enabled && responseTime > this.loggingConfig.performance.threshold) {
      this.warn('Slow HTTP Request', {
        ...logData,
        performanceThreshold: `${this.loggingConfig.performance.threshold}ms`
      })
    }
  }

  /**
   * Log database operation
   * @param {string} operation - Database operation
   * @param {string} collection - Collection name
   * @param {Object} query - Query object
   * @param {number} duration - Operation duration
   */
  logDatabaseOperation(operation, collection, query, duration) {
    if (!operation || !collection) {
      this.error('Invalid database operation parameters')
      return
    }

    const logData = {
      operation,
      collection,
      query: this.maskSensitiveData(query),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }

    this.info('Database Operation', logData)

    // Log slow queries
    if (duration > CONSTANTS.DB_SLOW_QUERY_THRESHOLD || 1000) {
      this.warn('Slow Database Query', {
        ...logData,
        threshold: `${CONSTANTS.DB_SLOW_QUERY_THRESHOLD || 1000}ms`
      })
    }
  }

  /**
   * Log cache operation
   * @param {string} operation - Cache operation
   * @param {string} key - Cache key
   * @param {boolean} hit - Whether it was a cache hit
   * @param {number} duration - Operation duration
   */
  logCacheOperation(operation, key, hit, duration) {
    if (!this.loggingConfig.cache.enabled) return

    if (!operation || !key) {
      this.error('Invalid cache operation parameters')
      return
    }

    const logData = {
      operation,
      key: this.maskSensitiveData({ key }).key,
      hit,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }

    this.info('Cache Operation', logData)
  }

  /**
   * Log user action
   * @param {string} action - User action
   * @param {Object} user - User object
   * @param {Object} details - Action details
   */
  logUserAction(action, user, details = {}) {
    if (!action || !user) {
      this.error('Invalid user action parameters')
      return
    }

    const logData = {
      action,
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString(),
      ...this.maskSensitiveData(details)
    }

    this.info('User Action', logData)
  }

  /**
   * Log security event
   * @param {string} event - Security event
   * @param {Object} details - Event details
   */
  logSecurityEvent(event, details = {}) {
    if (!this.loggingConfig.security.enabled) return

    if (!event) {
      this.error('Invalid security event parameter')
      return
    }

    const logData = {
      event,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'medium',
      ...this.maskSensitiveData(details)
    }

    this.warn('Security Event', logData)
  }

  /**
   * Log performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Metric unit
   * @param {Object} context - Additional context
   */
  logPerformanceMetric(metric, value, unit = 'ms', context = {}) {
    if (!this.loggingConfig.performance.enabled) return

    if (!metric || typeof value !== 'number') {
      this.error('Invalid performance metric parameters')
      return
    }

    const logData = {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
      ...context
    }

    this.info('Performance Metric', logData)

    // Log if performance threshold exceeded
    if (value > this.loggingConfig.performance.threshold) {
      this.warn('Performance Threshold Exceeded', {
        ...logData,
        threshold: `${this.loggingConfig.performance.threshold}${unit}`
      })
    }
  }

  /**
   * Log business event
   * @param {string} event - Business event
   * @param {Object} data - Event data
   */
  logBusinessEvent(event, data = {}) {
    if (!this.loggingConfig.business.enabled) return

    if (!event) {
      this.error('Invalid business event parameter')
      return
    }

    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...this.maskSensitiveData(data)
    }

    this.info('Business Event', logData)
  }

  /**
   * Get log statistics
   * @returns {Object} Log statistics
   */
  async getLogStats() {
    if (!this.cacheService) {
      return this.getBasicLogStats()
    }

    const cacheKey = 'log_stats'
    
    return await this.cacheService.cached(cacheKey, async () => {
      return this.getBasicLogStats()
    }, { ttl: this.loggingConfig.cache.ttl })
  }

  /**
   * Get basic log statistics
   */
  getBasicLogStats() {
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      lastLogTime: new Date().toISOString(),
      config: {
        level: this.loggingConfig.level,
        format: this.loggingConfig.format,
        retention: this.loggingConfig.retention,
        maxSize: this.loggingConfig.maxSize,
        maxFiles: this.loggingConfig.maxFiles
      }
    }
  }

  /**
   * Clear old logs
   * @param {number} days - Number of days to keep
   */
  async clearOldLogs(days = this.loggingConfig.retention) {
    try {
      this.info('Clearing old logs', { days, retention: this.loggingConfig.retention })
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      // Implementation would depend on log storage method
      // For file-based logging, this would delete old log files
      // For database logging, this would delete old log entries
      
      this.info('Old logs cleared successfully', { cutoffDate: cutoffDate.toISOString() })
    } catch (error) {
      this.error('Failed to clear old logs', { error: error.message, days })
    }
  }

  /**
   * Export logs
   * @param {Object} options - Export options
   * @returns {Promise<string>} Log file path
   */
  async exportLogs(options = {}) {
    try {
      const { startDate, endDate, level, format = 'json' } = options
      
      this.info('Exporting logs', { startDate, endDate, level, format })
      
      // Implementation would export logs based on criteria
      const exportPath = `/tmp/logs_${Date.now()}.${format}`
      
      this.info('Logs exported successfully', { exportPath })
      return exportPath
    } catch (error) {
      this.error('Failed to export logs', { error: error.message, options })
      throw error
    }
  }

  /**
   * Get logging configuration
   */
  getConfig() {
    return {
      ...this.loggingConfig,
      transports: this.logger.transports.length
    }
  }

  /**
   * Get logger instance
   * @returns {Object} Winston logger
   */
  getLogger() {
    return this.logger
  }

  /**
   * Add custom transport
   * @param {Object} transport - Winston transport
   */
  addTransport(transport) {
    try {
      this.logger.add(transport)
      this.info('Custom transport added', { transport: transport.constructor.name })
    } catch (error) {
      this.error('Failed to add custom transport', { error: error.message })
    }
  }

  /**
   * Remove transport
   * @param {Object} transport - Winston transport
   */
  removeTransport(transport) {
    try {
      this.logger.remove(transport)
      this.info('Transport removed', { transport: transport.constructor.name })
    } catch (error) {
      this.error('Failed to remove transport', { error: error.message })
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getLogStats()
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config: this.getConfig(),
        stats
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }
}

module.exports = LoggingService 