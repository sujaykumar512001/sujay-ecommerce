const performanceMonitor = require('../utils/performanceMonitor')
const CONSTANTS = require('../config/constants')

/**
 * Enhanced Cache Service with in-memory caching only
 * Provides fast, reliable caching without external dependencies
 */
class CacheService {
  constructor() {
    this.config = this.getConfig()
    this.validateConfig()
    this.memoryCache = new Map()
    this.cleanupInterval = null
    
    // Initialize cache cleanup
    this.startCleanupInterval()
  }

  /**
   * Get configuration from environment variables
   */
  getConfig() {
    return {
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 5 * 60 * 1000, // 5 minutes
      cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 60000, // 1 minute
      maxMemorySize: parseInt(process.env.CACHE_MAX_MEMORY_SIZE) || 1000, // Max cache entries
      staleTTL: parseInt(process.env.CACHE_STALE_TTL) || 60 * 1000, // 1 minute for stale data
      tagTTL: parseInt(process.env.CACHE_TAG_TTL) || 24 * 60 * 60 * 1000, // 24 hours
      logging: {
        enabled: process.env.CACHE_LOGGING_ENABLED !== 'false',
        level: process.env.CACHE_LOG_LEVEL || 'info'
      }
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (this.config.defaultTTL < 1000) {
      throw new Error('Cache default TTL must be at least 1000ms')
    }
    if (this.config.cleanupInterval < 10000) {
      throw new Error('Cache cleanup interval must be at least 10000ms')
    }
    if (this.config.maxMemorySize < 10) {
      throw new Error('Cache max memory size must be at least 10 entries')
    }
  }

  /**
   * Log cache events
   */
  log(level, message, data = {}) {
    if (!this.config.logging.enabled) return

    const logData = {
      timestamp: new Date().toISOString(),
      service: 'CacheService',
      level,
      message,
      ...data
    }

    switch (level) {
      case 'error':
        console.error(`[CACHE] ${message}`, logData)
        break
      case 'warn':
        console.warn(`[CACHE] ${message}`, logData)
        break
      case 'info':
        console.log(`[CACHE] ${message}`, logData)
        break
      case 'debug':
        if (this.config.logging.level === 'debug') {
          console.log(`[CACHE DEBUG] ${message}`, logData)
        }
        break
    }
  }

  /**
   * Validate cache key
   */
  validateKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string')
    }
    if (key.length > 250) {
      throw new Error('Cache key must be 250 characters or less')
    }
    if (!/^[a-zA-Z0-9:_-]+$/.test(key)) {
      throw new Error('Cache key contains invalid characters')
    }
  }

  /**
   * Validate TTL value
   */
  validateTTL(ttl) {
    if (typeof ttl !== 'number' || ttl < 0) {
      throw new Error('TTL must be a positive number')
    }
    if (ttl > 24 * 60 * 60 * 1000) { // 24 hours
      throw new Error('TTL cannot exceed 24 hours')
    }
  }

  /**
   * Check memory cache size limit
   */
  checkMemoryLimit() {
    if (this.memoryCache.size >= this.config.maxMemorySize) {
      this.log('warn', 'Cache memory limit reached, removing oldest entries', {
        currentSize: this.memoryCache.size,
        maxSize: this.config.maxMemorySize
      })
      
      // Remove oldest entries (first 10% of cache)
      const entriesToRemove = Math.ceil(this.config.maxMemorySize * 0.1)
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].expiry - b[1].expiry)
        .slice(0, entriesToRemove)
      
      entries.forEach(([key]) => {
        this.memoryCache.delete(key)
      })
    }
  }

  /**
   * Start periodic cleanup of expired cache entries
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries()
    }, this.config.cleanupInterval)
    
    this.log('info', 'Cache cleanup interval started', {
      interval: this.config.cleanupInterval
    })
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredEntries() {
    const now = Date.now()
    let removedCount = 0
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        this.memoryCache.delete(key)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
      this.log('debug', 'Cleaned up expired cache entries', {
        removedCount,
        remainingCount: this.memoryCache.size
      })
    }
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Cache options
   */
  async set(key, value, ttl = this.config.defaultTTL, options = {}) {
    try {
      this.validateKey(key)
      this.validateTTL(ttl)
      
      const { useMemory = true } = options
      
      if (!useMemory) {
        this.log('warn', 'Memory cache disabled, skipping set operation', { key })
        return
      }

      const serializedValue = JSON.stringify({
        value,
        timestamp: Date.now(),
        ttl
      })

      // Check memory limit before setting
      this.checkMemoryLimit()

      const expiry = Date.now() + ttl
      this.memoryCache.set(key, {
        value: serializedValue,
        expiry
      })

      this.log('debug', 'Cache set successful', {
        key,
        ttl,
        expiry: new Date(expiry).toISOString()
      })
    } catch (error) {
      this.log('error', 'Cache set error', {
        key,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {any|null} Cached value or null if expired/not found
   */
  async get(key, options = {}) {
    try {
      this.validateKey(key)
      
      const { useMemory = true } = options

      if (!useMemory) {
        this.log('warn', 'Memory cache disabled, returning null', { key })
        return null
      }

      const memoryItem = this.memoryCache.get(key)
      if (!memoryItem) {
        this.log('debug', 'Cache miss', { key })
        return null
      }

      if (Date.now() < memoryItem.expiry) {
        const parsed = JSON.parse(memoryItem.value)
        this.log('debug', 'Cache hit', { key })
        return parsed.value
      }

      // Remove expired item
      this.memoryCache.delete(key)
      this.log('debug', 'Cache expired, removed', { key })
      return null
    } catch (error) {
      this.log('error', 'Cache get error', {
        key,
        error: error.message
      })
      return null
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      this.validateKey(key)
      
      const existed = this.memoryCache.has(key)
      this.memoryCache.delete(key)
      
      if (existed) {
        this.log('debug', 'Cache key deleted', { key })
      }
    } catch (error) {
      this.log('error', 'Cache delete error', {
        key,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      const size = this.memoryCache.size
      this.memoryCache.clear()
      
      this.log('info', 'Cache cleared', { clearedCount: size })
    } catch (error) {
      this.log('error', 'Cache clear error', {
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get cache size
   * @returns {number} Number of cached items
   */
  size() {
    return this.memoryCache.size
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  async getStats() {
    const now = Date.now()
    let validItems = 0
    let expiredItems = 0
    let totalSize = 0

    for (const [key, item] of this.memoryCache.entries()) {
      totalSize += JSON.stringify(item).length
      if (now > item.expiry) {
        expiredItems++
        this.memoryCache.delete(key)
      } else {
        validItems++
      }
    }

    return {
      memory: {
        total: this.memoryCache.size,
        valid: validItems,
        expired: expiredItems,
        sizeBytes: totalSize,
        maxSize: this.config.maxMemorySize
      },
      config: {
        defaultTTL: this.config.defaultTTL,
        cleanupInterval: this.config.cleanupInterval,
        staleTTL: this.config.staleTTL
      },
      redis: {
        connected: false,
        message: 'Redis disabled - using in-memory cache only'
      }
    }
  }

  /**
   * Cache wrapper for async functions with advanced options
   * @param {string} key - Cache key
   * @param {Function} asyncFn - Async function to cache
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Cached or fresh result
   */
  async cached(key, asyncFn, options = {}) {
    const {
      ttl = this.config.defaultTTL,
      useMemory = true,
      staleWhileRevalidate = false,
      staleTTL = this.config.staleTTL
    } = options

    return await performanceMonitor.monitor(`cache_${key}`, async () => {
      // Try to get from cache first
      const cached = await this.get(key, { useMemory })
      if (cached !== null) {
        return cached
      }

      // Execute function and cache result
      try {
        const result = await asyncFn()
        await this.set(key, result, ttl, { useMemory })
        return result
      } catch (error) {
        this.log('error', 'Cache function execution error', {
          key,
          error: error.message
        })
        throw error
      }
    }, { key, ttl, useMemory })
  }

  /**
   * Stale-while-revalidate caching pattern
   * @param {string} key - Cache key
   * @param {Function} asyncFn - Async function to cache
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Cached or fresh result
   */
  async staleWhileRevalidate(key, asyncFn, options = {}) {
    const {
      ttl = this.config.defaultTTL,
      staleTTL = this.config.staleTTL
    } = options

    // Try to get from cache
    const cached = await this.get(key)
    if (cached !== null) {
      // Return cached data immediately
      // Then refresh in background
      setImmediate(async () => {
        try {
          const freshResult = await asyncFn()
          await this.set(key, freshResult, ttl)
          this.log('debug', 'Background cache refresh completed', { key })
        } catch (error) {
          this.log('error', 'Background refresh error', {
            key,
            error: error.message
          })
        }
      })
      return cached
    }

    // No cache, execute and cache
    const result = await asyncFn()
    await this.set(key, result, ttl)
    return result
  }

  /**
   * Cache with tags for easier invalidation
   * @param {string} key - Cache key
   * @param {Array} tags - Cache tags
   * @param {Function} asyncFn - Async function to cache
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Cached or fresh result
   */
  async taggedCache(key, tags, asyncFn, options = {}) {
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error('Tags must be a non-empty array')
    }

    const tagKey = `tags:${tags.join(':')}`
    
    // Check if any tag is invalidated
    const tagVersion = await this.get(tagKey) || 0
    const versionedKey = `${key}:v${tagVersion}`
    
    return this.cached(versionedKey, asyncFn, options)
  }

  /**
   * Invalidate cache by tags
   * @param {Array} tags - Tags to invalidate
   */
  async invalidateTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error('Tags must be a non-empty array')
    }

    const tagKey = `tags:${tags.join(':')}`
    const currentVersion = await this.get(tagKey) || 0
    await this.set(tagKey, currentVersion + 1, this.config.tagTTL)
    
    this.log('info', 'Cache tags invalidated', {
      tags,
      newVersion: currentVersion + 1
    })
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match keys (supports * wildcard)
   */
  async invalidate(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string')
    }

    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      let removedCount = 0
      
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key)
          removedCount++
        }
      }
      
      this.log('info', 'Cache invalidated by pattern', {
        pattern,
        removedCount
      })
    } catch (error) {
      this.log('error', 'Cache invalidation error', {
        pattern,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Warm up cache with frequently accessed data
   * @param {Array} warmupData - Array of {key, fn, ttl} objects
   */
  async warmup(warmupData) {
    if (!Array.isArray(warmupData)) {
      throw new Error('Warmup data must be an array')
    }

    this.log('info', 'Starting cache warmup', {
      itemCount: warmupData.length
    })
    
    const promises = warmupData.map(async ({ key, fn, ttl = this.config.defaultTTL }) => {
      try {
        this.validateKey(key)
        this.validateTTL(ttl)
        
        const result = await fn()
        await this.set(key, result, ttl)
        this.log('debug', 'Cache warmed up', { key })
      } catch (error) {
        this.log('error', 'Failed to warm up cache', {
          key,
          error: error.message
        })
      }
    })

    await Promise.allSettled(promises)
    this.log('info', 'Cache warmup completed')
  }

  /**
   * Get cache keys by pattern
   * @param {string} pattern - Pattern to match keys
   * @returns {Array} Array of matching keys
   */
  async getKeys(pattern = '*') {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string')
    }

    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return Array.from(this.memoryCache.keys()).filter(key => regex.test(key))
    } catch (error) {
      this.log('error', 'Error getting cache keys', {
        pattern,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Close cache service
   */
  async close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.log('info', 'Cache service closed')
  }
}

// Create singleton instance
const cacheService = new CacheService()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing cache connections...')
  await cacheService.close()
  process.exit(0)
})

module.exports = cacheService 