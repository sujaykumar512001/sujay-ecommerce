/**
 * Validation Service - Handles all validation operations
 */
class ValidationService {
  constructor({ config, loggingService }) {
    this.config = config
    this.loggingService = loggingService
  }

  /**
   * Validate product query parameters
   * @param {Object} query - Query parameters
   * @returns {Object} Validation result
   */
  validateProductQuery(query) {
    const errors = []
    const { search, category, sort, page, limit } = query

    // Validate search
    if (search && typeof search !== 'string') {
      errors.push('Search must be a string')
    }

    // Validate category
    if (category && typeof category !== 'string') {
      errors.push('Category must be a string')
    }

    // Validate sort
    const validSortOptions = ['price-low', 'price-high', 'name', 'rating', 'newest', 'oldest', 'popular', 'views']
    if (sort && !validSortOptions.includes(sort)) {
      errors.push(`Sort must be one of: ${validSortOptions.join(', ')}`)
    }

    // Validate page
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      errors.push('Page must be a positive number')
    }

    // Validate limit
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      errors.push('Limit must be between 1 and 100')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate product ID
   * @param {string} id - Product ID
   * @returns {Object} Validation result
   */
  validateProductId(id) {
    const errors = []

    if (!id) {
      errors.push('Product ID is required')
    } else if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      errors.push('Product ID must be a valid MongoDB ObjectId')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate search query
   * @param {string} query - Search query
   * @returns {Object} Validation result
   */
  validateSearchQuery(query) {
    const errors = []

    if (!query) {
      errors.push('Search query is required')
    } else if (typeof query !== 'string') {
      errors.push('Search query must be a string')
    } else if (query.length < 2) {
      errors.push('Search query must be at least 2 characters long')
    } else if (query.length > 100) {
      errors.push('Search query must be less than 100 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate category
   * @param {string} category - Category name
   * @returns {Object} Validation result
   */
  validateCategory(category) {
    const errors = []

    if (!category) {
      errors.push('Category is required')
    } else if (typeof category !== 'string') {
      errors.push('Category must be a string')
    } else if (category.length < 2) {
      errors.push('Category must be at least 2 characters long')
    } else if (category.length > 50) {
      errors.push('Category must be less than 50 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate user registration data
   * @param {Object} userData - User registration data
   * @returns {Object} Validation result
   */
  validateUserRegistration(userData) {
    const errors = []
    const { firstName, lastName, email, password, confirmPassword } = userData

    // Validate firstName
    if (!firstName || firstName.length < 2) {
      errors.push('First name must be at least 2 characters long')
    }

    // Validate lastName
    if (!lastName || lastName.length < 2) {
      errors.push('Last name must be at least 2 characters long')
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      errors.push('Valid email is required')
    }

    // Validate password
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    }

    // Validate confirmPassword
    if (password !== confirmPassword) {
      errors.push('Passwords do not match')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate user login data
   * @param {Object} loginData - User login data
   * @returns {Object} Validation result
   */
  validateUserLogin(loginData) {
    const errors = []
    const { email, password } = loginData

    // Validate email
    if (!email) {
      errors.push('Email is required')
    }

    // Validate password
    if (!password) {
      errors.push('Password is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate order data
   * @param {Object} orderData - Order data
   * @returns {Object} Validation result
   */
  validateOrder(orderData) {
    const errors = []
    const { items, shippingAddress, paymentMethod } = orderData

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('Order must contain at least one item')
    } else {
      items.forEach((item, index) => {
        if (!item.productId) {
          errors.push(`Item ${index + 1}: Product ID is required`)
        }
        if (!item.quantity || item.quantity < 1) {
          errors.push(`Item ${index + 1}: Quantity must be at least 1`)
        }
      })
    }

    // Validate shipping address
    if (!shippingAddress) {
      errors.push('Shipping address is required')
    } else {
      const { street, city, state, zipCode, country } = shippingAddress
      if (!street || !city || !state || !zipCode || !country) {
        errors.push('Complete shipping address is required')
      }
    }

    // Validate payment method
    if (!paymentMethod) {
      errors.push('Payment method is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate review data
   * @param {Object} reviewData - Review data
   * @returns {Object} Validation result
   */
  validateReview(reviewData) {
    const errors = []
    const { rating, comment, productId } = reviewData

    // Validate productId
    if (!productId) {
      errors.push('Product ID is required')
    }

    // Validate rating
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      errors.push('Rating must be between 1 and 5')
    }

    // Validate comment
    if (!comment || comment.length < 10) {
      errors.push('Comment must be at least 10 characters long')
    } else if (comment.length > 500) {
      errors.push('Comment must be less than 500 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate email
   * @param {string} email - Email address
   * @returns {Object} Validation result
   */
  validateEmail(email) {
    const errors = []
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!email) {
      errors.push('Email is required')
    } else if (!emailRegex.test(email)) {
      errors.push('Valid email is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate password
   * @param {string} password - Password
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const errors = []

    if (!password) {
      errors.push('Password is required')
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate pagination parameters
   * @param {Object} params - Pagination parameters
   * @returns {Object} Validation result
   */
  validatePagination(params) {
    const errors = []
    const { page, limit } = params

    // Validate page
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      errors.push('Page must be a positive number')
    }

    // Validate limit
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      errors.push('Limit must be between 1 and 100')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Sanitize input data
   * @param {Object} data - Input data
   * @returns {Object} Sanitized data
   */
  sanitizeInput(data) {
    const sanitized = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove HTML tags and trim whitespace
        sanitized[key] = value.replace(/<[^>]*>/g, '').trim()
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Validate file upload
   * @param {Object} file - File object
   * @param {Array} allowedTypes - Allowed file types
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Object} Validation result
   */
  validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], maxSize = 5 * 1024 * 1024) {
    const errors = []

    if (!file) {
      errors.push('File is required')
    } else {
      // Validate file type
      if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`File type must be one of: ${allowedTypes.join(', ')}`)
      }

      // Validate file size
      if (file.size > maxSize) {
        errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Log validation errors
   * @param {Array} errors - Validation errors
   * @param {string} context - Validation context
   */
  logValidationErrors(errors, context) {
    if (errors.length > 0) {
      this.loggingService.warn('Validation errors', {
        context,
        errors,
        timestamp: new Date().toISOString()
      })
    }
  }
}

module.exports = ValidationService 