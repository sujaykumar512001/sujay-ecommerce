const axios = require('axios')
const performanceMonitor = require('../utils/performanceMonitor')
const CONSTANTS = require('../config/constants')

/**
 * API Service - Handles external API calls with retry logic and error handling
 */
class ApiService {
  constructor() {
    this.config = this.getConfig()
    this.validateConfig()
  }

  /**
   * Get configuration from environment variables
   */
  getConfig() {
    return {
      timeout: parseInt(process.env.API_TIMEOUT) || 10000, // 10 seconds
      maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.API_RETRY_DELAY) || 1000, // 1 second
      maxConcurrentRequests: parseInt(process.env.API_MAX_CONCURRENT) || 10,
      userAgent: process.env.API_USER_AGENT || 'Ecommerce-App/1.0',
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': process.env.API_USER_AGENT || 'Ecommerce-App/1.0'
      },
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrorCodes: ['ECONNRESET', 'ENOTFOUND', 'ECONNABORTED', 'ETIMEDOUT', 'ENETUNREACH'],
      logging: {
        enabled: process.env.API_LOGGING_ENABLED !== 'false',
        level: process.env.API_LOG_LEVEL || 'info'
      }
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (this.config.timeout < 1000) {
      throw new Error('API timeout must be at least 1000ms')
    }
    if (this.config.maxRetries < 0 || this.config.maxRetries > 10) {
      throw new Error('API max retries must be between 0 and 10')
    }
    if (this.config.retryDelay < 100) {
      throw new Error('API retry delay must be at least 100ms')
    }
  }

  /**
   * Log API events
   */
  log(level, message, data = {}) {
    if (!this.config.logging.enabled) return

    const logData = {
      timestamp: new Date().toISOString(),
      service: 'ApiService',
      level,
      message,
      ...data
    }

    switch (level) {
      case 'error':
        console.error(`[API] ${message}`, logData)
        break
      case 'warn':
        console.warn(`[API] ${message}`, logData)
        break
      case 'info':
        console.log(`[API] ${message}`, logData)
        break
      case 'debug':
        if (this.config.logging.level === 'debug') {
          console.log(`[API DEBUG] ${message}`, logData)
        }
        break
    }
  }

  /**
   * Validate request configuration
   */
  validateRequestConfig(config) {
    if (!config.url) {
      throw new Error('URL is required for API request')
    }

    // Validate URL format
    try {
      new URL(config.url)
    } catch (error) {
      throw new Error(`Invalid URL format: ${config.url}`)
    }

    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
    if (config.method && !validMethods.includes(config.method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${config.method}`)
    }

    // Validate timeout
    if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
      throw new Error('Timeout must be between 1000ms and 60000ms')
    }
  }

  /**
   * Sanitize request data
   */
  sanitizeRequestData(data) {
    if (!data || typeof data !== 'object') {
      return data
    }

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization']
    const sanitized = { ...data }

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })

    return sanitized
  }

  /**
   * Make HTTP request with retry logic
   * @param {Object} config - Axios config
   * @param {number} retries - Number of retries
   * @returns {Promise<Object>} Response data
   */
  async request(config, retries = this.config.maxRetries) {
    try {
      this.validateRequestConfig(config)
    } catch (error) {
      this.log('error', 'Invalid request configuration', { error: error.message, config: this.sanitizeRequestData(config) })
      throw error
    }

    const operation = `api_request_${config.method || 'GET'}_${new URL(config.url).hostname}`
    const startTime = Date.now()
    
    this.log('info', 'Making API request', {
      method: config.method || 'GET',
      url: config.url,
      retries: retries
    })

    return await performanceMonitor.monitor(operation, async () => {
      try {
        const response = await axios({
          timeout: this.config.timeout,
          headers: {
            ...this.config.defaultHeaders,
            ...config.headers
          },
          ...config
        })

        const duration = Date.now() - startTime
        this.log('info', 'API request successful', {
          method: config.method || 'GET',
          url: config.url,
          status: response.status,
          duration: `${duration}ms`
        })

        return response.data
      } catch (error) {
        const duration = Date.now() - startTime
        
        this.log('error', 'API request failed', {
          method: config.method || 'GET',
          url: config.url,
          error: error.message,
          status: error.response?.status,
          duration: `${duration}ms`,
          retries: retries
        })

        if (retries > 0 && this.isRetryableError(error)) {
          this.log('info', 'Retrying API request', {
            method: config.method || 'GET',
            url: config.url,
            retriesLeft: retries - 1
          })

          await this.delay(this.config.retryDelay * (this.config.maxRetries - retries + 1))
          return this.request(config, retries - 1)
        }

        throw this.formatError(error)
      }
    }, { url: config.url, method: config.method, retries })
  }

  /**
   * Make GET request
   * @param {string} url - Request URL
   * @param {Object} config - Additional config
   * @returns {Promise<Object>} Response data
   */
  async get(url, config = {}) {
    return this.request({ method: 'GET', url, ...config })
  }

  /**
   * Make POST request
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {Object} config - Additional config
   * @returns {Promise<Object>} Response data
   */
  async post(url, data = {}, config = {}) {
    return this.request({ method: 'POST', url, data, ...config })
  }

  /**
   * Make PUT request
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {Object} config - Additional config
   * @returns {Promise<Object>} Response data
   */
  async put(url, data = {}, config = {}) {
    return this.request({ method: 'PUT', url, data, ...config })
  }

  /**
   * Make DELETE request
   * @param {string} url - Request URL
   * @param {Object} config - Additional config
   * @returns {Promise<Object>} Response data
   */
  async delete(url, config = {}) {
    return this.request({ method: 'DELETE', url, ...config })
  }

  /**
   * Make concurrent requests with rate limiting
   * @param {Array} requests - Array of request configs
   * @returns {Promise<Array>} Array of responses
   */
  async concurrent(requests) {
    if (!Array.isArray(requests)) {
      throw new Error('Requests must be an array')
    }

    if (requests.length === 0) {
      return []
    }

    if (requests.length > this.config.maxConcurrentRequests) {
      this.log('warn', 'Too many concurrent requests', {
        requested: requests.length,
        maxAllowed: this.config.maxConcurrentRequests
      })
      throw new Error(`Too many concurrent requests. Maximum allowed: ${this.config.maxConcurrentRequests}`)
    }

    const operation = 'concurrent_api_requests'
    
    this.log('info', 'Making concurrent API requests', {
      count: requests.length
    })

    return await performanceMonitor.monitor(operation, async () => {
      try {
        const responses = await Promise.allSettled(
          requests.map(config => this.request(config))
        )
        
        const results = responses.map((response, index) => {
          if (response.status === 'fulfilled') {
            return { success: true, data: response.value, index }
          } else {
            return { success: false, error: response.reason, index }
          }
        })

        const successCount = results.filter(r => r.success).length
        const failureCount = results.length - successCount

        this.log('info', 'Concurrent API requests completed', {
          total: results.length,
          success: successCount,
          failures: failureCount
        })

        return results
      } catch (error) {
        this.log('error', 'Concurrent API requests failed', {
          error: error.message,
          requestCount: requests.length
        })
        throw this.formatError(error)
      }
    }, { requestCount: requests.length })
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} Whether error is retryable
   */
  isRetryableError(error) {
    // Network errors
    if (error.code && this.config.retryableErrorCodes.includes(error.code)) {
      return true
    }
    
    // HTTP status codes
    if (error.response && this.config.retryableStatusCodes.includes(error.response.status)) {
      return true
    }
    
    return false
  }

  /**
   * Format error for consistent error handling
   * @param {Error} error - Error object
   * @returns {Error} Formatted error
   */
  formatError(error) {
    if (error.response) {
      // Server responded with error status
      const formattedError = new Error(`API Error: ${error.response.status} - ${error.response.statusText}`)
      formattedError.status = error.response.status
      formattedError.data = error.response.data
      formattedError.url = error.config?.url
      formattedError.method = error.config?.method
      return formattedError
    } else if (error.request) {
      // Request was made but no response received
      const formattedError = new Error(`Network Error: No response received from ${error.config?.url}`)
      formattedError.url = error.config?.url
      formattedError.method = error.config?.method
      return formattedError
    } else {
      // Something else happened
      const formattedError = new Error(`Request Error: ${error.message}`)
      formattedError.originalError = error
      return formattedError
    }
  }

  /**
   * Delay execution with exponential backoff
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create request with authentication
   * @param {string} token - Authentication token
   * @param {Object} config - Request config
   * @returns {Object} Config with auth headers
   */
  withAuth(token, config = {}) {
    if (!token) {
      throw new Error('Authentication token is required')
    }

    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      }
    }
  }

  /**
   * Create request with custom headers
   * @param {Object} headers - Custom headers
   * @param {Object} config - Request config
   * @returns {Object} Config with custom headers
   */
  withHeaders(headers, config = {}) {
    if (!headers || typeof headers !== 'object') {
      throw new Error('Headers must be an object')
    }

    return {
      ...config,
      headers: {
        ...config.headers,
        ...headers
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      config: {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        maxConcurrentRequests: this.config.maxConcurrentRequests
      },
      logging: {
        enabled: this.config.logging.enabled,
        level: this.config.logging.level
      }
    }
  }
}

// Create singleton instance
const apiService = new ApiService()

module.exports = apiService 