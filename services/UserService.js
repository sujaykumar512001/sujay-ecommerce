const User = require('../models/User')
const bcrypt = require('bcryptjs')
const performanceMonitor = require('../utils/performanceMonitor')
const CONSTANTS = require('../config/constants')

/**
 * User Service - Handles all user-related operations with advanced caching and security
 */
class UserService {
  constructor({ config, loggingService, cacheService, emailService }) {
    this.config = config
    this.loggingService = loggingService
    this.cacheService = cacheService
    this.emailService = emailService
    this.userConfig = this.getUserConfig()
    this.validateUserConfig()
  }

  /**
   * Get user configuration from environment variables
   */
  getUserConfig() {
    return {
      cache: {
        user: parseInt(process.env.USER_CACHE_TTL) || 15 * 60 * 1000, // 15 minutes
        profile: parseInt(process.env.USER_PROFILE_CACHE_TTL) || 10 * 60 * 1000, // 10 minutes
        stats: parseInt(process.env.USER_STATS_CACHE_TTL) || 30 * 60 * 1000, // 30 minutes
        search: parseInt(process.env.USER_SEARCH_CACHE_TTL) || 5 * 60 * 1000, // 5 minutes
        staleTTL: parseInt(process.env.USER_CACHE_STALE_TTL) || 2 * 60 * 1000 // 2 minutes
      },
      limits: {
        maxSearchLength: parseInt(process.env.USER_MAX_SEARCH_LENGTH) || 100,
        maxCacheKeyLength: parseInt(process.env.USER_MAX_CACHE_KEY_LENGTH) || 200,
        maxUsersPerPage: parseInt(process.env.USER_MAX_PER_PAGE) || 50,
        maxLoginAttempts: parseInt(process.env.USER_MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.USER_LOCKOUT_DURATION) || 15 * 60 * 1000 // 15 minutes
      },
      validation: {
        minPasswordLength: parseInt(process.env.USER_MIN_PASSWORD_LENGTH) || 8,
        maxPasswordLength: parseInt(process.env.USER_MAX_PASSWORD_LENGTH) || 128,
        minNameLength: parseInt(process.env.USER_MIN_NAME_LENGTH) || 2,
        maxNameLength: parseInt(process.env.USER_MAX_NAME_LENGTH) || 50,
        minEmailLength: parseInt(process.env.USER_MIN_EMAIL_LENGTH) || 5,
        maxEmailLength: parseInt(process.env.USER_MAX_EMAIL_LENGTH) || 254
      },
      security: {
        bcryptRounds: parseInt(process.env.USER_BCRYPT_ROUNDS) || 12,
        enableEmailVerification: process.env.USER_EMAIL_VERIFICATION !== 'false',
        enableAccountLockout: process.env.USER_ACCOUNT_LOCKOUT !== 'false',
        enablePasswordHistory: process.env.USER_PASSWORD_HISTORY !== 'false',
        passwordHistorySize: parseInt(process.env.USER_PASSWORD_HISTORY_SIZE) || 5
      },
      performance: {
        enableMonitoring: process.env.USER_PERFORMANCE_MONITORING !== 'false',
        slowQueryThreshold: parseInt(process.env.USER_SLOW_QUERY_THRESHOLD) || 1000
      }
    }
  }

  /**
   * Validate user configuration
   */
  validateUserConfig() {
    // Validate cache TTLs
    Object.entries(this.userConfig.cache).forEach(([key, value]) => {
      if (value < 0) {
        throw new Error(`Invalid cache TTL for ${key}: ${value}`)
      }
    })

    // Validate limits
    Object.entries(this.userConfig.limits).forEach(([key, value]) => {
      if (value < 1) {
        throw new Error(`Invalid limit for ${key}: ${value}`)
      }
    })

    // Validate validation rules
    if (this.userConfig.validation.minPasswordLength < 6) {
      throw new Error('Minimum password length must be at least 6 characters')
    }
    if (this.userConfig.validation.maxPasswordLength < this.userConfig.validation.minPasswordLength) {
      throw new Error('Maximum password length must be greater than minimum')
    }
    if (this.userConfig.validation.minNameLength < 1) {
      throw new Error('Minimum name length must be at least 1 character')
    }
    if (this.userConfig.validation.maxNameLength < this.userConfig.validation.minNameLength) {
      throw new Error('Maximum name length must be greater than minimum')
    }

    // Validate security settings
    if (this.userConfig.security.bcryptRounds < 10 || this.userConfig.security.bcryptRounds > 16) {
      throw new Error('BCrypt rounds must be between 10 and 16')
    }
  }

  /**
   * Log user service events
   */
  log(level, message, data = {}) {
    if (this.loggingService) {
      this.loggingService[level](message, {
        service: 'UserService',
        timestamp: new Date().toISOString(),
        ...data
      })
    } else {
      console[level](`[UserService] ${message}`, data)
    }
  }

  /**
   * Validate user ID
   */
  validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string')
    }
    
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid user ID format')
    }
  }

  /**
   * Validate user data
   */
  validateUserData(userData, isUpdate = false) {
    if (!userData || typeof userData !== 'object') {
      throw new Error('User data must be an object')
    }

    const { email, password, firstName, lastName, phone } = userData

    // Validate email
    if (!isUpdate || email) {
      if (!email || typeof email !== 'string') {
        throw new Error('Email is required and must be a string')
      }
      if (email.length < this.userConfig.validation.minEmailLength || email.length > this.userConfig.validation.maxEmailLength) {
        throw new Error(`Email length must be between ${this.userConfig.validation.minEmailLength} and ${this.userConfig.validation.maxEmailLength} characters`)
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Invalid email format')
      }
    }

    // Validate password (only for creation or password updates)
    if (!isUpdate || password) {
      if (!password || typeof password !== 'string') {
        throw new Error('Password is required and must be a string')
      }
      if (password.length < this.userConfig.validation.minPasswordLength || password.length > this.userConfig.validation.maxPasswordLength) {
        throw new Error(`Password length must be between ${this.userConfig.validation.minPasswordLength} and ${this.userConfig.validation.maxPasswordLength} characters`)
      }
      if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
      }
    }

    // Validate names
    if (firstName && (typeof firstName !== 'string' || firstName.length < this.userConfig.validation.minNameLength || firstName.length > this.userConfig.validation.maxNameLength)) {
      throw new Error(`First name length must be between ${this.userConfig.validation.minNameLength} and ${this.userConfig.validation.maxNameLength} characters`)
    }
    if (lastName && (typeof lastName !== 'string' || lastName.length < this.userConfig.validation.minNameLength || lastName.length > this.userConfig.validation.maxNameLength)) {
      throw new Error(`Last name length must be between ${this.userConfig.validation.minNameLength} and ${this.userConfig.validation.maxNameLength} characters`)
    }

    // Validate phone
    if (phone && (typeof phone !== 'string' || !phone.match(/^\+?[\d\s\-\(\)]+$/))) {
      throw new Error('Invalid phone number format')
    }
  }

  /**
   * Sanitize user data
   */
  sanitizeUserData(userData) {
    const sanitized = { ...userData }

    // Sanitize string fields
    ['firstName', 'lastName', 'email', 'phone'].forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = sanitized[field].trim().replace(/[<>]/g, '')
      }
    })

    return sanitized
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, this.userConfig.security.bcryptRounds)
  }

  /**
   * Compare password
   */
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword)
  }

  /**
   * Sanitize cache key
   */
  sanitizeCacheKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a string')
    }

    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, this.userConfig.limits.maxCacheKeyLength)
    
    if (sanitized.length === 0) {
      throw new Error('Cache key cannot be empty after sanitization')
    }

    return sanitized
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      this.validateUserData(userData, false)
      const sanitizedData = this.sanitizeUserData(userData)

      this.log('info', 'Creating new user', { email: sanitizedData.email })

      return await performanceMonitor.monitor('db_create_user', async () => {
        // Check if user already exists
        const existingUser = await User.findOne({ email: sanitizedData.email.toLowerCase() })
        if (existingUser) {
          throw new Error('User with this email already exists')
        }

        // Hash password
        const hashedPassword = await this.hashPassword(sanitizedData.password)

        // Create user
        const user = new User({
          ...sanitizedData,
          email: sanitizedData.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: !this.userConfig.security.enableEmailVerification,
          status: 'active',
          lastLogin: new Date()
        })

        await user.save()

        // Send welcome email if email service is available
        if (this.emailService && this.userConfig.security.enableEmailVerification) {
          try {
            await this.emailService.sendWelcomeEmail(user)
          } catch (emailError) {
            this.log('warn', 'Failed to send welcome email', { error: emailError.message, userId: user._id })
          }
        }

        // Invalidate user cache
        await this.invalidateUserCache()

        this.log('info', 'User created successfully', { userId: user._id, email: user.email })

        return {
          success: true,
          user: {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            status: user.status
          }
        }
      }, { email: sanitizedData.email })
    } catch (error) {
      this.log('error', 'Error creating user', { error: error.message, email: userData?.email })
      throw error
    }
  }

  /**
   * Get user by ID with caching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    try {
      this.validateUserId(userId)

      const cacheKey = this.sanitizeCacheKey(`user_${userId}`)
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['users', 'user', userId],
        async () => {
          return await performanceMonitor.monitor('db_get_user_by_id', async () => {
            const user = await User.findById(userId)
              .select('-password -passwordHistory -loginAttempts -lockoutUntil')
              .lean()

            if (!user) {
              throw new Error('User not found')
            }

            return {
              success: true,
              user
            }
          }, { userId })
        },
        {
          ttl: this.userConfig.cache.user,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting user by ID', { error: error.message, userId })
      throw error
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User data
   */
  async getUserByEmail(email) {
    try {
      if (!email || typeof email !== 'string') {
        throw new Error('Email is required and must be a string')
      }

      const cacheKey = this.sanitizeCacheKey(`user_email_${email.toLowerCase()}`)
      
      return await this.cacheService.cached(cacheKey, async () => {
        return await performanceMonitor.monitor('db_get_user_by_email', async () => {
          const user = await User.findOne({ email: email.toLowerCase() })
            .select('-password -passwordHistory -loginAttempts -lockoutUntil')
            .lean()

          if (!user) {
            throw new Error('User not found')
          }

          return {
            success: true,
            user
          }
        }, { email })
      }, {
        ttl: this.userConfig.cache.user,
        useMemory: true,
        useRedis: true
      })
    } catch (error) {
      this.log('error', 'Error getting user by email', { error: error.message, email })
      throw error
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, userData) {
    try {
      this.validateUserId(userId)
      this.validateUserData(userData, true)
      const sanitizedData = this.sanitizeUserData(userData)

      this.log('info', 'Updating user', { userId })

      return await performanceMonitor.monitor('db_update_user', async () => {
        const user = await User.findById(userId)
        if (!user) {
          throw new Error('User not found')
        }

        // Check if email is being changed and if it's already taken
        if (sanitizedData.email && sanitizedData.email.toLowerCase() !== user.email.toLowerCase()) {
          const existingUser = await User.findOne({ email: sanitizedData.email.toLowerCase() })
          if (existingUser) {
            throw new Error('Email is already taken')
          }
        }

        // Hash password if it's being updated
        if (sanitizedData.password) {
          sanitizedData.password = await this.hashPassword(sanitizedData.password)
          
          // Add to password history if enabled
          if (this.userConfig.security.enablePasswordHistory) {
            if (!user.passwordHistory) {
              user.passwordHistory = []
            }
            user.passwordHistory.push({
              password: sanitizedData.password,
              changedAt: new Date()
            })
            
            // Keep only the last N passwords
            if (user.passwordHistory.length > this.userConfig.security.passwordHistorySize) {
              user.passwordHistory = user.passwordHistory.slice(-this.userConfig.security.passwordHistorySize)
            }
          }
        }

        // Update user
        Object.assign(user, sanitizedData)
        if (sanitizedData.email) {
          user.email = sanitizedData.email.toLowerCase()
        }
        
        await user.save()

        // Invalidate user cache
        await this.invalidateUserCache(userId)

        this.log('info', 'User updated successfully', { userId })

        return {
          success: true,
          user: {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            status: user.status
          }
        }
      }, { userId })
    } catch (error) {
      this.log('error', 'Error updating user', { error: error.message, userId })
      throw error
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId) {
    try {
      this.validateUserId(userId)

      this.log('info', 'Deleting user', { userId })

      return await performanceMonitor.monitor('db_delete_user', async () => {
        const user = await User.findById(userId)
        if (!user) {
          throw new Error('User not found')
        }

        // Soft delete - mark as deleted instead of actually deleting
        user.status = 'deleted'
        user.deletedAt = new Date()
        await user.save()

        // Invalidate user cache
        await this.invalidateUserCache(userId)

        this.log('info', 'User deleted successfully', { userId })

        return {
          success: true,
          message: 'User deleted successfully'
        }
      }, { userId })
    } catch (error) {
      this.log('error', 'Error deleting user', { error: error.message, userId })
      throw error
    }
  }

  /**
   * Search users
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchUsers(options = {}) {
    try {
      const { search = '', page = 1, limit = this.userConfig.limits.maxUsersPerPage, status = 'active' } = options

      if (search && search.length > this.userConfig.limits.maxSearchLength) {
        throw new Error(`Search query too long (max ${this.userConfig.limits.maxSearchLength} characters)`)
      }

      const cacheKey = this.sanitizeCacheKey(`search_users_${JSON.stringify(options)}`)
      
      return await this.cacheService.cached(cacheKey, async () => {
        return await performanceMonitor.monitor('db_search_users', async () => {
          const filter = { status: { $ne: 'deleted' } }
          
          if (search) {
            filter.$or = [
              { firstName: { $regex: search, $options: 'i' } },
              { lastName: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ]
          }
          
          if (status && status !== 'all') {
            filter.status = status
          }

          const skip = (page - 1) * limit
          const [users, total] = await Promise.all([
            User.find(filter)
              .select('-password -passwordHistory -loginAttempts -lockoutUntil')
              .skip(skip)
              .limit(limit)
              .sort({ createdAt: -1 })
              .lean(),
            User.countDocuments(filter)
          ])

          return {
            success: true,
            users,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              total,
              limit
            }
          }
        }, { options })
      }, {
        ttl: this.userConfig.cache.search,
        useMemory: true,
        useRedis: true
      })
    } catch (error) {
      this.log('error', 'Error searching users', { error: error.message, options })
      throw error
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      const cacheKey = 'user_stats'
      
      return await this.cacheService.staleWhileRevalidate(cacheKey, async () => {
        return await performanceMonitor.monitor('db_get_user_stats', async () => {
          const [totalUsers, activeUsers, verifiedUsers, newUsers] = await Promise.all([
            User.countDocuments({ status: { $ne: 'deleted' } }),
            User.countDocuments({ status: 'active' }),
            User.countDocuments({ emailVerified: true, status: 'active' }),
            User.countDocuments({ 
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              status: 'active'
            })
          ])

          return {
            success: true,
            stats: {
              totalUsers,
              activeUsers,
              verifiedUsers,
              newUsers,
              verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
            }
          }
        })
      }, {
        ttl: this.userConfig.cache.stats,
        staleTTL: this.userConfig.cache.staleTTL
      })
    } catch (error) {
      this.log('error', 'Error getting user stats', { error: error.message })
      throw error
    }
  }

  /**
   * Invalidate user cache
   * @param {string} userId - User ID (optional)
   */
  async invalidateUserCache(userId = null) {
    try {
      if (userId) {
        this.validateUserId(userId)
        await this.cacheService.invalidateTags(['users', 'user', userId])
        this.log('info', `User cache invalidated for user ${userId}`)
      } else {
        await this.cacheService.invalidateTags(['users'])
        this.log('info', 'All user cache invalidated')
      }
    } catch (error) {
      this.log('error', 'Error invalidating user cache', { error: error.message, userId })
    }
  }

  /**
   * Get user service configuration
   */
  getConfig() {
    return {
      cache: this.userConfig.cache,
      limits: this.userConfig.limits,
      validation: this.userConfig.validation,
      security: this.userConfig.security,
      performance: this.userConfig.performance
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getUserStats()
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config: this.getConfig(),
        stats: stats.stats
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }

  // Static methods for fallback (when DI is not available)
  static async createUser(userData) {
    try {
      return await performanceMonitor.monitor('db_create_user', async () => {
        const User = require('../models/User')
        const bcrypt = require('bcryptjs')
        
        const user = new User({
          ...userData,
          password: await bcrypt.hash(userData.password, 12),
          emailVerified: false,
          status: 'active'
        })
        
        await user.save()
        
        return {
          success: true,
          user: {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        }
      }, { email: userData.email })
    } catch (error) {
      console.error('Error in static createUser:', error)
      throw error
    }
  }

  static async getUserById(userId) {
    try {
      return await performanceMonitor.monitor('db_get_user_by_id', async () => {
        const User = require('../models/User')
        
        const user = await User.findById(userId)
          .select('-password')
          .lean()
        
        if (!user) {
          throw new Error('User not found')
        }
        
        return {
          success: true,
          user
        }
      }, { userId })
    } catch (error) {
      console.error('Error in static getUserById:', error)
      throw error
    }
  }

  static async updateUser(userId, userData) {
    try {
      return await performanceMonitor.monitor('db_update_user', async () => {
        const User = require('../models/User')
        const bcrypt = require('bcryptjs')
        
        const user = await User.findById(userId)
        if (!user) {
          throw new Error('User not found')
        }
        
        if (userData.password) {
          userData.password = await bcrypt.hash(userData.password, 12)
        }
        
        Object.assign(user, userData)
        await user.save()
        
        return {
          success: true,
          user: {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        }
      }, { userId })
    } catch (error) {
      console.error('Error in static updateUser:', error)
      throw error
    }
  }

  static async deleteUser(userId) {
    try {
      return await performanceMonitor.monitor('db_delete_user', async () => {
        const User = require('../models/User')
        
        const user = await User.findById(userId)
        if (!user) {
          throw new Error('User not found')
        }
        
        user.status = 'deleted'
        user.deletedAt = new Date()
        await user.save()
        
        return {
          success: true,
          message: 'User deleted successfully'
        }
      }, { userId })
    } catch (error) {
      console.error('Error in static deleteUser:', error)
      throw error
    }
  }
}

module.exports = UserService 