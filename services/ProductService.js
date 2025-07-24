const Product = require('../models/Product')
const performanceMonitor = require('../utils/performanceMonitor')
const CONSTANTS = require('../config/constants')

/**
 * Product Service - Handles all product-related async operations with advanced caching
 */
class ProductService {
  constructor({ cacheService, loggingService, config }) {
    this.cacheService = cacheService
    this.loggingService = loggingService
    this.config = config
    this.productConfig = this.getProductConfig()
    this.validateProductConfig()
  }

  /**
   * Get product configuration from environment variables
   */
  getProductConfig() {
    return {
      cache: {
        featured: parseInt(process.env.PRODUCT_CACHE_FEATURED_TTL) || 10 * 60 * 1000, // 10 minutes
        search: parseInt(process.env.PRODUCT_CACHE_SEARCH_TTL) || 5 * 60 * 1000, // 5 minutes
        product: parseInt(process.env.PRODUCT_CACHE_PRODUCT_TTL) || 15 * 60 * 1000, // 15 minutes
        category: parseInt(process.env.PRODUCT_CACHE_CATEGORY_TTL) || 10 * 60 * 1000, // 10 minutes
        suggestions: parseInt(process.env.PRODUCT_CACHE_SUGGESTIONS_TTL) || 30 * 60 * 1000, // 30 minutes
        stats: parseInt(process.env.PRODUCT_CACHE_STATS_TTL) || 60 * 60 * 1000, // 1 hour
        categories: parseInt(process.env.PRODUCT_CACHE_CATEGORIES_TTL) || 24 * 60 * 60 * 1000, // 24 hours
        brands: parseInt(process.env.PRODUCT_CACHE_BRANDS_TTL) || 24 * 60 * 60 * 1000, // 24 hours
        popular: parseInt(process.env.PRODUCT_CACHE_POPULAR_TTL) || 15 * 60 * 1000, // 15 minutes
        recentlyViewed: parseInt(process.env.PRODUCT_CACHE_RECENTLY_VIEWED_TTL) || 5 * 60 * 1000, // 5 minutes
        staleTTL: parseInt(process.env.PRODUCT_CACHE_STALE_TTL) || 5 * 60 * 1000 // 5 minutes
      },
      limits: {
        featured: parseInt(process.env.PRODUCT_LIMIT_FEATURED) || 8,
        search: parseInt(process.env.PRODUCT_LIMIT_SEARCH) || 12,
        suggestions: parseInt(process.env.PRODUCT_LIMIT_SUGGESTIONS) || 5,
        related: parseInt(process.env.PRODUCT_LIMIT_RELATED) || 4,
        popular: parseInt(process.env.PRODUCT_LIMIT_POPULAR) || 8,
        recentlyViewed: parseInt(process.env.PRODUCT_LIMIT_RECENTLY_VIEWED) || 4,
        maxSearchLength: parseInt(process.env.PRODUCT_MAX_SEARCH_LENGTH) || 100,
        maxCacheKeyLength: parseInt(process.env.PRODUCT_MAX_CACHE_KEY_LENGTH) || 200
      },
      validation: {
        minPrice: parseFloat(process.env.PRODUCT_MIN_PRICE) || 0,
        maxPrice: parseFloat(process.env.PRODUCT_MAX_PRICE) || 1000000,
        minRating: parseFloat(process.env.PRODUCT_MIN_RATING) || 0,
        maxRating: parseFloat(process.env.PRODUCT_MAX_RATING) || 5
      },
      performance: {
        enableMonitoring: process.env.PRODUCT_PERFORMANCE_MONITORING !== 'false',
        slowQueryThreshold: parseInt(process.env.PRODUCT_SLOW_QUERY_THRESHOLD) || 1000
      }
    }
  }

  /**
   * Validate product configuration
   */
  validateProductConfig() {
    // Validate cache TTLs
    Object.entries(this.productConfig.cache).forEach(([key, value]) => {
      if (value < 0) {
        throw new Error(`Invalid cache TTL for ${key}: ${value}`)
      }
    })

    // Validate limits
    Object.entries(this.productConfig.limits).forEach(([key, value]) => {
      if (value < 1) {
        throw new Error(`Invalid limit for ${key}: ${value}`)
      }
    })

    // Validate price range
    if (this.productConfig.validation.minPrice < 0) {
      throw new Error('Minimum price cannot be negative')
    }
    if (this.productConfig.validation.maxPrice <= this.productConfig.validation.minPrice) {
      throw new Error('Maximum price must be greater than minimum price')
    }

    // Validate rating range
    if (this.productConfig.validation.minRating < 0 || this.productConfig.validation.minRating > 5) {
      throw new Error('Minimum rating must be between 0 and 5')
    }
    if (this.productConfig.validation.maxRating < this.productConfig.validation.minRating || this.productConfig.validation.maxRating > 5) {
      throw new Error('Maximum rating must be between minimum rating and 5')
    }
  }

  /**
   * Log product service events
   */
  log(level, message, data = {}) {
    if (this.loggingService) {
      this.loggingService[level](message, {
        service: 'ProductService',
        timestamp: new Date().toISOString(),
        ...data
      })
    } else {
      console[level](`[ProductService] ${message}`, data)
    }
  }

  /**
   * Validate product ID
   */
  validateProductId(productId) {
    if (!productId || typeof productId !== 'string') {
      throw new Error('Product ID is required and must be a string')
    }
    
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid product ID format')
    }
  }

  /**
   * Validate search options
   */
  validateSearchOptions(options) {
    if (!options || typeof options !== 'object') {
      throw new Error('Search options must be an object')
    }

    const { search, category, sort, page, limit, brand, minPrice, maxPrice, rating } = options

    // Validate search query
    if (search && typeof search !== 'string') {
      throw new Error('Search query must be a string')
    }
    if (search && search.length > this.productConfig.limits.maxSearchLength) {
      throw new Error(`Search query too long (max ${this.productConfig.limits.maxSearchLength} characters)`)
    }

    // Validate category
    if (category && typeof category !== 'string') {
      throw new Error('Category must be a string')
    }

    // Validate sort
    if (sort && typeof sort !== 'string') {
      throw new Error('Sort must be a string')
    }

    // Validate pagination
    if (page && (typeof page !== 'number' || page < 1)) {
      throw new Error('Page must be a positive number')
    }
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
      throw new Error('Limit must be between 1 and 100')
    }

    // Validate brand
    if (brand && typeof brand !== 'string') {
      throw new Error('Brand must be a string')
    }

    // Validate price range
    if (minPrice && (typeof minPrice !== 'number' || minPrice < this.productConfig.validation.minPrice)) {
      throw new Error(`Minimum price must be at least ${this.productConfig.validation.minPrice}`)
    }
    if (maxPrice && (typeof maxPrice !== 'number' || maxPrice > this.productConfig.validation.maxPrice)) {
      throw new Error(`Maximum price cannot exceed ${this.productConfig.validation.maxPrice}`)
    }
    if (minPrice && maxPrice && minPrice > maxPrice) {
      throw new Error('Minimum price cannot be greater than maximum price')
    }

    // Validate rating
    if (rating && (typeof rating !== 'number' || rating < this.productConfig.validation.minRating || rating > this.productConfig.validation.maxRating)) {
      throw new Error(`Rating must be between ${this.productConfig.validation.minRating} and ${this.productConfig.validation.maxRating}`)
    }
  }

  /**
   * Sanitize cache key
   */
  sanitizeCacheKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a string')
    }

    // Remove special characters and limit length
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, this.productConfig.limits.maxCacheKeyLength)
    
    if (sanitized.length === 0) {
      throw new Error('Cache key cannot be empty after sanitization')
    }

    return sanitized
  }

  /**
   * Get featured products with advanced caching
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Featured products
   */
  async getFeaturedProducts(limit = this.productConfig.limits.featured) {
    try {
      if (limit < 1 || limit > 50) {
        throw new Error('Limit must be between 1 and 50')
      }

      const cacheKey = this.sanitizeCacheKey(`featured_products_${limit}`)
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['products', 'featured'],
        async () => {
          return await performanceMonitor.monitor('db_get_featured_products', async () => {
            return await Product.getFeatured(limit)
          }, { limit })
        },
        {
          ttl: this.productConfig.cache.featured,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting featured products', { error: error.message, limit })
      throw error
    }
  }

  /**
   * Search products with advanced filtering and caching
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchProducts(options = {}) {
    try {
      this.validateSearchOptions(options)

      const {
        search = '',
        category = 'all',
        sort = 'newest',
        page = 1,
        limit = this.productConfig.limits.search,
        brand,
        minPrice,
        maxPrice,
        rating
      } = options

      // Create cache key based on search parameters
      const cacheKey = this.sanitizeCacheKey(`search_products_${JSON.stringify(options)}`)
      
      return await this.cacheService.cached(cacheKey, async () => {
        return await performanceMonitor.monitor('db_search_products', async () => {
          return await Product.searchProducts(search, {
            category: category === 'all' ? undefined : category,
            sort,
            page,
            limit,
            brand,
            minPrice,
            maxPrice,
            rating
          })
        }, { options })
      }, {
        ttl: this.productConfig.cache.search,
        useMemory: true,
        useRedis: true
      })
    } catch (error) {
      this.log('error', 'Error searching products', { error: error.message, options })
      throw error
    }
  }

  /**
   * Get product by ID with related products and caching
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Product with related products
   */
  async getProductById(productId) {
    try {
      this.validateProductId(productId)

      const cacheKey = this.sanitizeCacheKey(`product_${productId}`)
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['products', 'product', productId],
        async () => {
          return await performanceMonitor.monitor('db_get_product_by_id', async () => {
            const product = await Product.findById(productId)
              .populate("reviews.user", "name avatar")
              .lean()

            if (!product || !product.isActive) {
              throw new Error('Product not found')
            }

            // Get related products and increment view count in parallel
            const [relatedProducts] = await Promise.all([
              Product.find({
                category: product.category,
                _id: { $ne: product._id },
                isActive: true,
              })
                .limit(this.productConfig.limits.related)
                .select("name price images rating")
                .lean(),
              Product.findByIdAndUpdate(
                productId,
                { $inc: { viewCount: 1 } },
                { new: false } // Don't return updated document
              )
            ])

            return {
              product,
              relatedProducts
            }
          }, { productId })
        },
        {
          ttl: this.productConfig.cache.product,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting product by ID', { error: error.message, productId })
      throw error
    }
  }

  /**
   * Get products by category with caching
   * @param {string} category - Category name
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Category products with pagination
   */
  async getProductsByCategory(category, options = {}) {
    try {
      if (!category || typeof category !== 'string') {
        throw new Error('Category is required and must be a string')
      }

      const { page = 1, limit = this.productConfig.limits.search, sort = 'createdAt' } = options
      const cacheKey = this.sanitizeCacheKey(`category_products_${category}_${JSON.stringify(options)}`)
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['products', 'category', category],
        async () => {
          return await performanceMonitor.monitor('db_get_products_by_category', async () => {
            return await Product.getProductsByCategory(category, { page, limit, sort })
          }, { category, options })
        },
        {
          ttl: this.productConfig.cache.category,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting products by category', { error: error.message, category, options })
      throw error
    }
  }

  /**
   * Get search suggestions with caching
   * @param {string} query - Search query
   * @param {number} limit - Number of suggestions
   * @returns {Promise<Array>} Search suggestions
   */
  async getSearchSuggestions(query, limit = this.productConfig.limits.suggestions) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Search query is required and must be a string')
      }
      if (query.length > this.productConfig.limits.maxSearchLength) {
        throw new Error(`Search query too long (max ${this.productConfig.limits.maxSearchLength} characters)`)
      }
      if (limit < 1 || limit > 20) {
        throw new Error('Limit must be between 1 and 20')
      }

      const cacheKey = this.sanitizeCacheKey(`search_suggestions_${query}_${limit}`)
      
      return await this.cacheService.cached(cacheKey, async () => {
        return await performanceMonitor.monitor('db_get_search_suggestions', async () => {
          return await Product.find({
            name: { $regex: query, $options: "i" },
            isActive: true,
          })
            .select("name category")
            .limit(limit)
            .lean()
        }, { query, limit })
      }, {
        ttl: this.productConfig.cache.suggestions,
        useMemory: true,
        useRedis: false // Don't cache suggestions in Redis
      })
    } catch (error) {
      this.log('error', 'Error getting search suggestions', { error: error.message, query, limit })
      throw error
    }
  }

  /**
   * Get product statistics with caching
   * @returns {Promise<Object>} Product statistics
   */
  async getProductStats() {
    try {
      const cacheKey = 'product_stats'
      
      return await this.cacheService.staleWhileRevalidate(cacheKey, async () => {
        return await performanceMonitor.monitor('db_get_product_stats', async () => {
          const stats = await Product.getProductStats()
          return stats[0] || {
            totalProducts: 0,
            totalFeatured: 0,
            avgPrice: 0,
            avgRating: 0,
            totalViews: 0,
            totalSales: 0
          }
        })
      }, {
        ttl: this.productConfig.cache.stats,
        staleTTL: this.productConfig.cache.staleTTL
      })
    } catch (error) {
      this.log('error', 'Error getting product stats', { error: error.message })
      throw error
    }
  }

  /**
   * Get categories with caching
   * @returns {Promise<Array>} Categories
   */
  async getCategories() {
    try {
      const cacheKey = 'product_categories'
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['products', 'categories'],
        async () => {
          return await performanceMonitor.monitor('db_get_categories', async () => {
            return await Product.getCategories()
          })
        },
        {
          ttl: this.productConfig.cache.categories,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting categories', { error: error.message })
      throw error
    }
  }

  /**
   * Get brands with caching
   * @returns {Promise<Array>} Brands
   */
  async getBrands() {
    try {
      const cacheKey = 'product_brands'
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['products', 'brands'],
        async () => {
          return await performanceMonitor.monitor('db_get_brands', async () => {
            return await Product.getBrands()
          })
        },
        {
          ttl: this.productConfig.cache.brands,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting brands', { error: error.message })
      throw error
    }
  }

  /**
   * Get popular products with caching
   * @param {number} limit - Number of products
   * @returns {Promise<Array>} Popular products
   */
  async getPopularProducts(limit = this.productConfig.limits.popular) {
    try {
      if (limit < 1 || limit > 50) {
        throw new Error('Limit must be between 1 and 50')
      }

      const cacheKey = this.sanitizeCacheKey(`popular_products_${limit}`)
      
      return await this.cacheService.taggedCache(
        cacheKey,
        ['products', 'popular'],
        async () => {
          return await performanceMonitor.monitor('db_get_popular_products', async () => {
            return await Product.find({
              isActive: true,
              status: 'active'
            })
              .sort({ totalSales: -1, viewCount: -1 })
              .limit(limit)
              .select('name price images category averageRating totalReviews stock featured sku')
              .lean()
          }, { limit })
        },
        {
          ttl: this.productConfig.cache.popular,
          useMemory: true,
          useRedis: true
        }
      )
    } catch (error) {
      this.log('error', 'Error getting popular products', { error: error.message, limit })
      throw error
    }
  }

  /**
   * Get recently viewed products with caching
   * @param {Array} productIds - Array of product IDs
   * @param {number} limit - Number of products
   * @returns {Promise<Array>} Recently viewed products
   */
  async getRecentlyViewedProducts(productIds, limit = this.productConfig.limits.recentlyViewed) {
    try {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return []
      }

      // Validate product IDs
      productIds.forEach(id => {
        if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('Invalid product ID in recently viewed list')
        }
      })

      if (limit < 1 || limit > 20) {
        throw new Error('Limit must be between 1 and 20')
      }

      const cacheKey = this.sanitizeCacheKey(`recently_viewed_${productIds.join('_')}_${limit}`)
      
      return await this.cacheService.cached(cacheKey, async () => {
        return await performanceMonitor.monitor('db_get_recently_viewed', async () => {
          return await Product.find({
            _id: { $in: productIds },
            isActive: true,
            status: 'active'
          })
            .select('name price images category averageRating sku')
            .limit(limit)
            .lean()
        }, { productIds, limit })
      }, {
        ttl: this.productConfig.cache.recentlyViewed,
        useMemory: true,
        useRedis: false
      })
    } catch (error) {
      this.log('error', 'Error getting recently viewed products', { error: error.message, productIds, limit })
      throw error
    }
  }

  /**
   * Invalidate product cache
   * @param {string} productId - Product ID (optional)
   */
  async invalidateCache(productId = null) {
    try {
      if (productId) {
        this.validateProductId(productId)
        // Invalidate specific product cache
        await this.cacheService.invalidateTags(['products', 'product', productId])
        await this.cacheService.invalidateTags(['products', 'featured'])
        await this.cacheService.invalidateTags(['products', 'popular'])
        this.log('info', `Product cache invalidated for product ${productId}`)
      } else {
        // Invalidate all product cache
        await this.cacheService.invalidateTags(['products'])
        this.log('info', 'All product cache invalidated')
      }
    } catch (error) {
      this.log('error', 'Error invalidating product cache', { error: error.message, productId })
      throw error
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache() {
    try {
      const warmupData = [
        {
          key: `featured_products_${this.productConfig.limits.featured}`,
          fn: () => this.getFeaturedProducts(this.productConfig.limits.featured),
          ttl: this.productConfig.cache.featured
        },
        {
          key: 'product_categories',
          fn: () => this.getCategories(),
          ttl: this.productConfig.cache.categories
        },
        {
          key: 'product_brands',
          fn: () => this.getBrands(),
          ttl: this.productConfig.cache.brands
        },
        {
          key: `popular_products_${this.productConfig.limits.popular}`,
          fn: () => this.getPopularProducts(this.productConfig.limits.popular),
          ttl: this.productConfig.cache.popular
        },
        {
          key: 'product_stats',
          fn: () => this.getProductStats(),
          ttl: this.productConfig.cache.stats
        }
      ]

      await this.cacheService.warmup(warmupData)
      this.log('info', 'Product cache warmup completed')
    } catch (error) {
      this.log('error', 'Error warming up product cache', { error: error.message })
      throw error
    }
  }

  /**
   * Get sort option object
   * @param {string} sort - Sort type
   * @returns {Object} Sort option
   */
  getSortOption(sort) {
    const sortOptions = {
      'price-low': { price: 1 },
      'price-high': { price: -1 },
      'name': { name: 1 },
      'rating': { averageRating: -1 },
      'newest': { createdAt: -1 },
      'oldest': { createdAt: 1 },
      'popular': { totalSales: -1 },
      'views': { viewCount: -1 }
    }

    return sortOptions[sort] || sortOptions.newest
  }

  /**
   * Get product service configuration
   */
  getConfig() {
    return {
      cache: this.productConfig.cache,
      limits: this.productConfig.limits,
      validation: this.productConfig.validation,
      performance: this.productConfig.performance
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getProductStats()
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

  // Static methods for fallback (when DI is not available)
  static async getFeaturedProducts(limit = CONSTANTS.PRODUCTS_PAGE_SIZE) {
    try {
      return await performanceMonitor.monitor('db_get_featured_products', async () => {
        return await Product.getFeatured(limit)
      }, { limit })
    } catch (error) {
      console.error('Error in static getFeaturedProducts:', error)
      return []
    }
  }

  static async searchProducts(options = {}) {
    try {
      const {
        search = '',
        category = 'all',
        sort = 'newest',
        page = 1,
        limit = CONSTANTS.PRODUCTS_PAGE_SIZE,
        brand,
        minPrice,
        maxPrice,
        rating
      } = options

      return await performanceMonitor.monitor('db_search_products', async () => {
        // Get products using the Product model method
        const products = await Product.searchProducts(search, {
          category: category === 'all' ? undefined : category,
          sort,
          page,
          limit,
          brand,
          minPrice,
          maxPrice,
          rating
        })

        // Get total count for pagination
        const filter = { isActive: true, status: "active" }
        if (search) {
          filter.$text = { $search: search }
        }
        if (category && category !== 'all') {
          filter.category = category
        }
        if (brand) filter.brand = brand
        if (minPrice || maxPrice) {
          filter.price = {}
          if (minPrice) filter.price.$gte = minPrice
          if (maxPrice) filter.price.$lte = maxPrice
        }
        if (rating) filter.averageRating = { $gte: rating }

        const total = await Product.countDocuments(filter)
        const totalPages = Math.ceil(total / limit)

        // Get categories for filter
        const categories = await Product.distinct("category", { isActive: true, status: "active" })

        return {
          products: products || [],
          categories: categories || [],
          currentPage: parseInt(page),
          totalPages,
          search: search || "",
          category: category || "all",
          sort: sort || "newest",
          total
        }
      }, { options })
    } catch (error) {
      console.error('Error in static searchProducts:', error)
      return {
        products: [],
        categories: [],
        currentPage: 1,
        totalPages: 1,
        search: options.search || "",
        category: options.category || "all",
        sort: options.sort || "newest",
        total: 0
      }
    }
  }

  static async getCategories() {
    try {
      return await performanceMonitor.monitor('db_get_categories', async () => {
        return await Product.getCategories()
      })
    } catch (error) {
      console.error('Error in static getCategories:', error)
      return []
    }
  }

  static async getBrands() {
    try {
      return await performanceMonitor.monitor('db_get_brands', async () => {
        return await Product.getBrands()
      })
    } catch (error) {
      console.error('Error in static getBrands:', error)
      return []
    }
  }

  static async getProductStats() {
    try {
      return await performanceMonitor.monitor('db_get_product_stats', async () => {
        const stats = await Product.getProductStats()
        return stats[0] || {
          totalProducts: 0,
          totalFeatured: 0,
          avgPrice: 0,
          avgRating: 0,
          totalViews: 0,
          totalSales: 0
        }
      })
    } catch (error) {
      console.error('Error in static getProductStats:', error)
      return {
        totalProducts: 0,
        totalFeatured: 0,
        avgPrice: 0,
        avgRating: 0,
        totalViews: 0,
        totalSales: 0
      }
    }
  }

  static async getProductsByCategory(category, options = {}) {
    try {
      const { page = 1, limit = CONSTANTS.PRODUCTS_PAGE_SIZE, sort = 'createdAt' } = options
      
      return await performanceMonitor.monitor('db_get_products_by_category', async () => {
        return await Product.getProductsByCategory(category, { page, limit, sort })
      }, { category, options })
    } catch (error) {
      console.error('Error in static getProductsByCategory:', error)
      return {
        products: [],
        categories: [],
        currentPage: 1,
        totalPages: 1,
        search: "",
        category: category,
        sort: options.sort || "newest",
      }
    }
  }

  static async getProductById(productId) {
    try {
      return await performanceMonitor.monitor('db_get_product_by_id', async () => {
        // Validate ObjectId
        if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('Invalid product ID')
        }

        const product = await Product.findById(productId)
          .populate("reviews.user", "name avatar")
          .lean()

        if (!product || !product.isActive) {
          throw new Error('Product not found')
        }

        // Get related products and increment view count in parallel
        const [relatedProducts] = await Promise.all([
          Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true,
          })
            .limit(4)
            .select("name price images rating")
            .lean(),
          Product.findByIdAndUpdate(
            productId,
            { $inc: { viewCount: 1 } },
            { new: false } // Don't return updated document
          )
        ])

        return {
          product,
          relatedProducts
        }
      }, { productId })
    } catch (error) {
      console.error('Error in static getProductById:', error)
      throw error
    }
  }

  static async getSearchSuggestions(query, limit = 5) {
    try {
      return await performanceMonitor.monitor('db_get_search_suggestions', async () => {
        return await Product.find({
          name: { $regex: query, $options: "i" },
          isActive: true,
        })
          .select("name category")
          .limit(limit)
          .lean()
      }, { query, limit })
    } catch (error) {
      console.error('Error in static getSearchSuggestions:', error)
      return []
    }
  }

  static async warmupCache() {
    // Static warmup is a no-op since we don't have cache service
    console.log('Static warmupCache called - no cache service available')
  }
}

module.exports = ProductService 