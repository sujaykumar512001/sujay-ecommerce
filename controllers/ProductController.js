/**
 * Product Controller - Handles product-related HTTP requests
 * Demonstrates dependency injection patterns with enhanced security and performance
 */
class ProductController {
  constructor({ 
    productService, 
    cacheService, 
    loggingService, 
    emailService, 
    validationService,
    config 
  }) {
    this.productService = productService
    this.cacheService = cacheService
    this.loggingService = loggingService
    this.emailService = emailService
    this.validationService = validationService
    this.config = config
    this.defaults = this.getDefaults()
  }

  /**
   * Get default configuration values
   */
  getDefaults() {
    return {
      pagination: {
        defaultPage: parseInt(process.env.PRODUCT_DEFAULT_PAGE) || 1,
        defaultLimit: parseInt(process.env.PRODUCT_DEFAULT_LIMIT) || 12,
        maxLimit: parseInt(process.env.PRODUCT_MAX_LIMIT) || 100,
        minLimit: parseInt(process.env.PRODUCT_MIN_LIMIT) || 1
      },
      search: {
        defaultSuggestionsLimit: parseInt(process.env.SEARCH_SUGGESTIONS_LIMIT) || 5,
        maxSuggestionsLimit: parseInt(process.env.SEARCH_MAX_SUGGESTIONS) || 20,
        minQueryLength: parseInt(process.env.SEARCH_MIN_QUERY_LENGTH) || 2,
        maxQueryLength: parseInt(process.env.SEARCH_MAX_QUERY_LENGTH) || 100
      },
      featured: {
        defaultLimit: parseInt(process.env.FEATURED_DEFAULT_LIMIT) || 8,
        maxLimit: parseInt(process.env.FEATURED_MAX_LIMIT) || 20
      },
      cache: {
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5 minutes
        longTTL: parseInt(process.env.CACHE_LONG_TTL) || 3600 // 1 hour
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      }
    }
  }

  /**
   * Sanitize and validate input parameters
   */
  sanitizeInput(input, type = 'string') {
    if (!input) return input

    switch (type) {
      case 'string':
        return String(input).trim().replace(/[<>]/g, '')
      case 'number':
        const num = parseInt(input)
        return isNaN(num) ? null : num
      case 'email':
        return String(input).toLowerCase().trim()
      case 'search':
        return String(input).trim().replace(/[<>]/g, '').substring(0, this.defaults.search.maxQueryLength)
      default:
        return String(input).trim()
    }
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page, limit) {
    const errors = []
    
    const pageNum = this.sanitizeInput(page, 'number') || this.defaults.pagination.defaultPage
    const limitNum = this.sanitizeInput(limit, 'number') || this.defaults.pagination.defaultLimit

    if (pageNum < 1) {
      errors.push('Page number must be greater than 0')
    }

    if (limitNum < this.defaults.pagination.minLimit || limitNum > this.defaults.pagination.maxLimit) {
      errors.push(`Limit must be between ${this.defaults.pagination.minLimit} and ${this.defaults.pagination.maxLimit}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      page: pageNum,
      limit: limitNum
    }
  }

  /**
   * Validate search query
   */
  validateSearchQuery(query) {
    const errors = []
    
    if (!query) {
      errors.push('Search query is required')
      return { isValid: false, errors }
    }

    const sanitizedQuery = this.sanitizeInput(query, 'search')
    
    if (sanitizedQuery.length < this.defaults.search.minQueryLength) {
      errors.push(`Search query must be at least ${this.defaults.search.minQueryLength} characters`)
    }

    if (sanitizedQuery.length > this.defaults.search.maxQueryLength) {
      errors.push(`Search query must be less than ${this.defaults.search.maxQueryLength} characters`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      query: sanitizedQuery
    }
  }

  /**
   * Set cache headers
   */
  setCacheHeaders(res, ttl = this.defaults.cache.defaultTTL) {
    res.set({
      'Cache-Control': `public, max-age=${ttl}`,
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    })
  }

  /**
   * Create standardized response
   */
  createResponse(res, data, options = {}) {
    const {
      success = true,
      statusCode = 200,
      message = null,
      cache = false,
      cacheTTL = this.defaults.cache.defaultTTL,
      requestId = null
    } = options

    const response = {
      success,
      data,
      timestamp: new Date().toISOString(),
      requestId: requestId || res.locals.requestId
    }

    if (message) {
      response.message = message
    }

    if (cache) {
      this.setCacheHeaders(res, cacheTTL)
    }

    return res.status(statusCode).json(response)
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(res, error, options = {}) {
    const {
      statusCode = 500,
      message = null,
      requestId = null
    } = options

    const errorResponse = {
      success: false,
      error: {
        message: message || error.message || 'An error occurred',
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      requestId: requestId || res.locals.requestId
    }

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      errorResponse.error.stack = error.stack
    }

    return res.status(statusCode).json(errorResponse)
  }

  /**
   * Get all products with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProducts(req, res) {
    const startTime = Date.now()
    
    try {
      const { search, category, sort, page, limit } = req.query

      // Sanitize inputs
      const sanitizedSearch = this.sanitizeInput(search, 'search')
      const sanitizedCategory = this.sanitizeInput(category)
      const sanitizedSort = this.sanitizeInput(sort)

      // Validate pagination
      const paginationValidation = this.validatePagination(page, limit)
      if (!paginationValidation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid pagination parameters'), {
          statusCode: 400,
          message: paginationValidation.errors.join(', ')
        })
      }

      // Validate query parameters
      const validation = this.validationService.validateProductQuery({
        ...req.query,
        search: sanitizedSearch,
        category: sanitizedCategory,
        sort: sanitizedSort,
        page: paginationValidation.page,
        limit: paginationValidation.limit
      })
      
      if (!validation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid query parameters'), {
          statusCode: 400,
          message: validation.errors.join(', ')
        })
      }

      // Log the request
      this.loggingService.info('Product list requested', {
        search: sanitizedSearch,
        category: sanitizedCategory,
        sort: sanitizedSort,
        page: paginationValidation.page,
        limit: paginationValidation.limit,
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Get products from service
      const result = await this.productService.searchProducts({
        search: sanitizedSearch,
        category: sanitizedCategory,
        sort: sanitizedSort,
        page: paginationValidation.page,
        limit: paginationValidation.limit
      })

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Product list retrieved successfully', {
        totalProducts: result.totalProducts,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, result, {
        cache: true,
        cacheTTL: this.defaults.cache.defaultTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting products', {
        error: error.message,
        stack: error.stack,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve products',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get product by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductById(req, res) {
    const startTime = Date.now()
    
    try {
      const { id } = req.params
      const sanitizedId = this.sanitizeInput(id)

      // Validate product ID
      const validation = this.validationService.validateProductId(sanitizedId)
      if (!validation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid product ID'), {
          statusCode: 400,
          message: validation.errors.join(', ')
        })
      }

      // Log the request
      this.loggingService.info('Product detail requested', {
        productId: sanitizedId,
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Get product from service
      const { product, relatedProducts } = await this.productService.getProductById(sanitizedId)

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Product detail retrieved successfully', {
        productId: sanitizedId,
        hasRelatedProducts: relatedProducts.length > 0,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, { product, relatedProducts }, {
        cache: true,
        cacheTTL: this.defaults.cache.longTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting product by ID', {
        productId: req.params.id,
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      if (error.message === 'Product not found') {
        return this.createErrorResponse(res, error, {
          statusCode: 404,
          message: 'Product not found',
          requestId: res.locals.requestId
        })
      }

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve product',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get featured products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFeaturedProducts(req, res) {
    const startTime = Date.now()
    
    try {
      const { limit } = req.query
      const sanitizedLimit = this.sanitizeInput(limit, 'number') || this.defaults.featured.defaultLimit

      // Validate limit
      if (sanitizedLimit > this.defaults.featured.maxLimit) {
        return this.createErrorResponse(res, new Error('Limit exceeds maximum allowed'), {
          statusCode: 400,
          message: `Limit cannot exceed ${this.defaults.featured.maxLimit}`
        })
      }

      // Log the request
      this.loggingService.info('Featured products requested', {
        limit: sanitizedLimit,
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Get featured products from service
      const products = await this.productService.getFeaturedProducts(sanitizedLimit)

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Featured products retrieved successfully', {
        count: products.length,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, products, {
        cache: true,
        cacheTTL: this.defaults.cache.longTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting featured products', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve featured products',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get products by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductsByCategory(req, res) {
    const startTime = Date.now()
    
    try {
      const { category } = req.params
      const { page, limit, sort } = req.query
      
      const sanitizedCategory = this.sanitizeInput(category)
      const sanitizedSort = this.sanitizeInput(sort) || 'createdAt'

      // Validate category
      const validation = this.validationService.validateCategory(sanitizedCategory)
      if (!validation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid category'), {
          statusCode: 400,
          message: validation.errors.join(', ')
        })
      }

      // Validate pagination
      const paginationValidation = this.validatePagination(page, limit)
      if (!paginationValidation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid pagination parameters'), {
          statusCode: 400,
          message: paginationValidation.errors.join(', ')
        })
      }

      // Log the request
      this.loggingService.info('Category products requested', {
        category: sanitizedCategory,
        page: paginationValidation.page,
        limit: paginationValidation.limit,
        sort: sanitizedSort,
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Get products from service
      const result = await this.productService.getProductsByCategory(sanitizedCategory, {
        page: paginationValidation.page,
        limit: paginationValidation.limit,
        sort: sanitizedSort
      })

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Category products retrieved successfully', {
        category: sanitizedCategory,
        totalProducts: result.totalProducts,
        currentPage: result.currentPage,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, result, {
        cache: true,
        cacheTTL: this.defaults.cache.defaultTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting category products', {
        category: req.params.category,
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve category products',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Search products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchProducts(req, res) {
    const startTime = Date.now()
    
    try {
      const { q } = req.query

      // Validate search query
      const searchValidation = this.validateSearchQuery(q)
      if (!searchValidation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid search query'), {
          statusCode: 400,
          message: searchValidation.errors.join(', ')
        })
      }

      // Log the request
      this.loggingService.info('Product search requested', {
        query: searchValidation.query,
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Search products from service
      const products = await this.productService.searchProducts({ search: searchValidation.query })

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Product search completed successfully', {
        query: searchValidation.query,
        resultsCount: products.products.length,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, products, {
        cache: true,
        cacheTTL: this.defaults.cache.defaultTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error searching products', {
        query: req.query.q,
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to search products',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get search suggestions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchSuggestions(req, res) {
    const startTime = Date.now()
    
    try {
      const { q, limit } = req.query

      // Validate search query
      const searchValidation = this.validateSearchQuery(q)
      if (!searchValidation.isValid) {
        return this.createErrorResponse(res, new Error('Invalid search query'), {
          statusCode: 400,
          message: searchValidation.errors.join(', ')
        })
      }

      // Validate limit
      const sanitizedLimit = this.sanitizeInput(limit, 'number') || this.defaults.search.defaultSuggestionsLimit
      if (sanitizedLimit > this.defaults.search.maxSuggestionsLimit) {
        return this.createErrorResponse(res, new Error('Limit exceeds maximum allowed'), {
          statusCode: 400,
          message: `Limit cannot exceed ${this.defaults.search.maxSuggestionsLimit}`
        })
      }

      // Get suggestions from service
      const suggestions = await this.productService.getSearchSuggestions(searchValidation.query, sanitizedLimit)

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Search suggestions retrieved successfully', {
        query: searchValidation.query,
        suggestionsCount: suggestions.length,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, suggestions, {
        cache: true,
        cacheTTL: this.defaults.cache.defaultTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting search suggestions', {
        query: req.query.q,
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to get search suggestions',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get product statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductStats(req, res) {
    const startTime = Date.now()
    
    try {
      // Log the request
      this.loggingService.info('Product stats requested', {
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Get stats from service
      const stats = await this.productService.getProductStats()

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Product stats retrieved successfully', {
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, stats, {
        cache: true,
        cacheTTL: this.defaults.cache.longTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting product stats', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve product statistics',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategories(req, res) {
    const startTime = Date.now()
    
    try {
      // Get categories from service
      const categories = await this.productService.getCategories()

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Categories retrieved successfully', {
        categoriesCount: categories.length,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, categories, {
        cache: true,
        cacheTTL: this.defaults.cache.longTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting categories', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve categories',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get brands
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBrands(req, res) {
    const startTime = Date.now()
    
    try {
      // Get brands from service
      const brands = await this.productService.getBrands()

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Brands retrieved successfully', {
        brandsCount: brands.length,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, brands, {
        cache: true,
        cacheTTL: this.defaults.cache.longTTL,
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error getting brands', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to retrieve brands',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Invalidate product cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async invalidateCache(req, res) {
    const startTime = Date.now()
    
    try {
      const { productId } = req.params
      const sanitizedProductId = this.sanitizeInput(productId)

      // Log the request
      this.loggingService.info('Product cache invalidation requested', {
        productId: sanitizedProductId,
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Invalidate cache
      await this.productService.invalidateCache(sanitizedProductId)

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Product cache invalidated successfully', {
        productId: sanitizedProductId,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, { productId: sanitizedProductId }, {
        message: 'Product cache invalidated successfully',
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error invalidating product cache', {
        productId: req.params.productId,
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to invalidate product cache',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Warm up product cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async warmupCache(req, res) {
    const startTime = Date.now()
    
    try {
      // Log the request
      this.loggingService.info('Product cache warmup requested', {
        userId: req.user ? req.user._id : 'anonymous',
        requestId: res.locals.requestId,
        ip: req.ip
      })

      // Warm up cache
      await this.productService.warmupCache()

      const responseTime = Date.now() - startTime

      // Log successful response
      this.loggingService.info('Product cache warmup completed successfully', {
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createResponse(res, { status: 'warmed' }, {
        message: 'Product cache warmup completed successfully',
        requestId: res.locals.requestId
      })

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.loggingService.error('Error warming up product cache', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        requestId: res.locals.requestId
      })

      return this.createErrorResponse(res, error, {
        message: 'Failed to warm up product cache',
        requestId: res.locals.requestId
      })
    }
  }

  /**
   * Get controller statistics
   */
  getControllerStats() {
    return {
      defaults: this.defaults,
      config: this.config,
      timestamp: new Date().toISOString()
    }
  }
}

module.exports = ProductController 