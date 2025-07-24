/**
 * Application Constants and Configuration
 * Centralized configuration for all hardcoded values
 */

module.exports = {
  // Tax and Shipping Configuration
  TAX_RATE: process.env.TAX_RATE || 0.08, // 8% tax rate
  FREE_SHIPPING_THRESHOLD: process.env.FREE_SHIPPING_THRESHOLD || 50, // Free shipping over $50
  SHIPPING_COST: process.env.SHIPPING_COST || 5.99, // Standard shipping cost
  SHIPPING_COST_ALT: process.env.SHIPPING_COST_ALT || 10, // Alternative shipping cost

  // Pagination Configuration
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
  PRODUCTS_PAGE_SIZE: parseInt(process.env.PRODUCTS_PAGE_SIZE) || 12,
  ADMIN_PAGE_SIZE: parseInt(process.env.ADMIN_PAGE_SIZE) || 10,
  REVIEWS_PAGE_SIZE: parseInt(process.env.REVIEWS_PAGE_SIZE) || 10,
  USER_ORDERS_PAGE_SIZE: parseInt(process.env.USER_ORDERS_PAGE_SIZE) || 10,
  USER_RECENT_ORDERS_LIMIT: parseInt(process.env.USER_RECENT_ORDERS_LIMIT) || 10,

  // User Configuration
  USER_CONFIG: {
    MIN_NAME_LENGTH: parseInt(process.env.USER_MIN_NAME_LENGTH) || 2,
    MAX_NAME_LENGTH: parseInt(process.env.USER_MAX_NAME_LENGTH) || 50,
    MAX_PHONE_LENGTH: parseInt(process.env.USER_MAX_PHONE_LENGTH) || 20,
    MAX_ADDRESSES: parseInt(process.env.USER_MAX_ADDRESSES) || 5,
    MAX_WISHLIST_ITEMS: parseInt(process.env.USER_MAX_WISHLIST_ITEMS) || 50,
    MAX_CART_ITEMS: parseInt(process.env.USER_MAX_CART_ITEMS) || 20,
    DEFAULT_COUNTRY: process.env.USER_DEFAULT_COUNTRY || 'US',
    DEFAULT_CURRENCY: process.env.USER_DEFAULT_CURRENCY || 'USD',
    DEFAULT_LANGUAGE: process.env.USER_DEFAULT_LANGUAGE || 'en'
  },

  // Stock Configuration
  LOW_STOCK_THRESHOLD: parseInt(process.env.LOW_STOCK_THRESHOLD) || 10,
  OUT_OF_STOCK_THRESHOLD: parseInt(process.env.OUT_OF_STOCK_THRESHOLD) || 0,

  // Price Configuration
  DEFAULT_MIN_PRICE: parseFloat(process.env.DEFAULT_MIN_PRICE) || 0,
  DEFAULT_MAX_PRICE: parseFloat(process.env.DEFAULT_MAX_PRICE) || 1000,

  // Coupon Configuration
  COUPONS: {
    'SAVE10': { 
      discount: parseInt(process.env.COUPON_SAVE10_DISCOUNT) || 10, 
      type: 'percentage' 
    },
    'FREESHIP': { 
      discount: parseFloat(process.env.COUPON_FREESHIP_DISCOUNT) || 5.99, 
      type: 'fixed' 
    }
  },

  // Time Configuration (in milliseconds)
  SESSION_SAVE_DELAY: parseInt(process.env.SESSION_SAVE_DELAY) || 100,
  ANALYTICS_PERIODS: {
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
  },

  // Validation Configuration
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH) || 6,
  SEARCH_MIN_LENGTH: parseInt(process.env.SEARCH_MIN_LENGTH) || 2,
  SEARCH_MAX_LENGTH: parseInt(process.env.SEARCH_MAX_LENGTH) || 100,

  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'],

  // Security Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // API Configuration
  API_CONFIG: {
    TIMEOUT: parseInt(process.env.API_TIMEOUT) || 10000,
    MAX_RETRIES: parseInt(process.env.API_MAX_RETRIES) || 3,
    RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY) || 1000,
    MAX_CONCURRENT: parseInt(process.env.API_MAX_CONCURRENT) || 10,
    USER_AGENT: process.env.API_USER_AGENT || 'Ecommerce-App/1.0',
    LOGGING_ENABLED: process.env.API_LOGGING_ENABLED !== 'false',
    LOG_LEVEL: process.env.API_LOG_LEVEL || 'info'
  },

  // API Error Codes
  API_ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR'
  },

  // API Status Codes
  API_STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
  },

  // Cache Configuration
  CACHE_CONFIG: {
    DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 5 * 60 * 1000, // 5 minutes
    CLEANUP_INTERVAL: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 60000, // 1 minute
    MAX_MEMORY_SIZE: parseInt(process.env.CACHE_MAX_MEMORY_SIZE) || 1000, // Max cache entries
    STALE_TTL: parseInt(process.env.CACHE_STALE_TTL) || 60 * 1000, // 1 minute for stale data
    TAG_TTL: parseInt(process.env.CACHE_TAG_TTL) || 24 * 60 * 60 * 1000, // 24 hours
    LOGGING_ENABLED: process.env.CACHE_LOGGING_ENABLED !== 'false',
    LOG_LEVEL: process.env.CACHE_LOG_LEVEL || 'info'
  },

  // Cache Error Codes
  CACHE_ERROR_CODES: {
    KEY_INVALID: 'CACHE_KEY_INVALID',
    TTL_INVALID: 'CACHE_TTL_INVALID',
    MEMORY_LIMIT_EXCEEDED: 'CACHE_MEMORY_LIMIT_EXCEEDED',
    SERIALIZATION_ERROR: 'CACHE_SERIALIZATION_ERROR',
    DESERIALIZATION_ERROR: 'CACHE_DESERIALIZATION_ERROR',
    PATTERN_INVALID: 'CACHE_PATTERN_INVALID'
  },

  // Cache Key Patterns
  CACHE_KEY_PATTERNS: {
    PRODUCT: 'product:*',
    USER: 'user:*',
    ORDER: 'order:*',
    CATEGORY: 'category:*',
    SEARCH: 'search:*',
    TAGS: 'tags:*'
  },

  // Email Configuration
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yadavcollection.com',
  EMAIL_SUBJECTS: {
    WELCOME: process.env.EMAIL_WELCOME_SUBJECT || 'Welcome to Yadav Collection!',
    ORDER_CONFIRMATION: process.env.EMAIL_ORDER_SUBJECT || 'Order Confirmation',
    PASSWORD_RESET: process.env.EMAIL_PASSWORD_RESET_SUBJECT || 'Password Reset Request'
  },

  // Site Configuration
  SITE_NAME: process.env.SITE_NAME || 'Yadav Collection',
  SITE_URL: process.env.SITE_URL || 'https://yadavcollection.com',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // Password Reset Configuration
  PASSWORD_RESET_EXPIRY: process.env.PASSWORD_RESET_EXPIRY || '1 hour',
  PASSWORD_RESET_TOKEN_LENGTH: parseInt(process.env.PASSWORD_RESET_TOKEN_LENGTH) || 32,

  // Error Messages
  ERROR_MESSAGES: {
    SERVER_ERROR: process.env.ERROR_SERVER_ERROR || 'Server error',
    VALIDATION_ERROR: process.env.ERROR_VALIDATION_ERROR || 'Validation error',
    NOT_FOUND: process.env.ERROR_NOT_FOUND || 'Resource not found',
    UNAUTHORIZED: process.env.ERROR_UNAUTHORIZED || 'Unauthorized access',
    FORBIDDEN: process.env.ERROR_FORBIDDEN || 'Access forbidden',
    INVALID_INPUT: process.env.ERROR_INVALID_INPUT || 'Invalid input provided',
    SESSION_SAVE_FAILED: process.env.ERROR_SESSION_SAVE_FAILED || 'Session save failed',
    EMAIL_FAILED: process.env.ERROR_EMAIL_FAILED || 'Email sending failed',
    USER_NOT_FOUND: process.env.ERROR_USER_NOT_FOUND || 'User not found',
    PROFILE_LOAD_ERROR: process.env.ERROR_PROFILE_LOAD_ERROR || 'Error loading profile',
    PROFILE_UPDATE_ERROR: process.env.ERROR_PROFILE_UPDATE_ERROR || 'Error updating profile',
    ORDERS_LOAD_ERROR: process.env.ERROR_ORDERS_LOAD_ERROR || 'Error loading orders. Please try again.',
    ORDER_NOT_FOUND: process.env.ERROR_ORDER_NOT_FOUND || 'Order not found',
    ORDER_LOAD_ERROR: process.env.ERROR_ORDER_LOAD_ERROR || 'Error loading order',
    UNAUTHORIZED_ORDER_ACCESS: process.env.ERROR_UNAUTHORIZED_ORDER_ACCESS || 'Not authorized to view this order',
    INVALID_ORDER_ID: process.env.ERROR_INVALID_ORDER_ID || 'Invalid order ID',
    WISHLIST_LOAD_ERROR: process.env.ERROR_WISHLIST_LOAD_ERROR || 'Error loading wishlist',
    WISHLIST_ADD_ERROR: process.env.ERROR_WISHLIST_ADD_ERROR || 'Error adding to wishlist',
    WISHLIST_REMOVE_ERROR: process.env.ERROR_WISHLIST_REMOVE_ERROR || 'Error removing from wishlist',
    INVALID_PRODUCT_ID: process.env.ERROR_INVALID_PRODUCT_ID || 'Invalid product ID'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    USER_REGISTERED: process.env.SUCCESS_USER_REGISTERED || 'User registered successfully',
    USER_LOGGED_IN: process.env.SUCCESS_USER_LOGGED_IN || 'User logged in successfully',
    USER_LOGGED_OUT: process.env.SUCCESS_USER_LOGGED_OUT || 'User logged out successfully',
    PROFILE_UPDATED: process.env.SUCCESS_PROFILE_UPDATED || 'Profile updated successfully',
    PASSWORD_CHANGED: process.env.SUCCESS_PASSWORD_CHANGED || 'Password changed successfully',
    ORDER_CREATED: process.env.SUCCESS_ORDER_CREATED || 'Order created successfully',
    CART_UPDATED: process.env.SUCCESS_CART_UPDATED || 'Cart updated successfully',
    CART_CLEARED: process.env.SUCCESS_CART_CLEARED || 'Cart cleared successfully',
    REVIEW_ADDED: process.env.SUCCESS_REVIEW_ADDED || 'Review added successfully',
    PRODUCT_CREATED: process.env.SUCCESS_PRODUCT_CREATED || 'Product created successfully',
    PRODUCT_UPDATED: process.env.SUCCESS_PRODUCT_UPDATED || 'Product updated successfully',
    PRODUCT_DELETED: process.env.SUCCESS_PRODUCT_DELETED || 'Product deleted successfully',
    PRODUCT_ADDED_TO_WISHLIST: process.env.SUCCESS_PRODUCT_ADDED_TO_WISHLIST || 'Product added to wishlist!',
    PRODUCT_REMOVED_FROM_WISHLIST: process.env.SUCCESS_PRODUCT_REMOVED_FROM_WISHLIST || 'Product removed from wishlist!'
  },

  // Info Messages
  INFO_MESSAGES: {
    PRODUCT_ALREADY_IN_WISHLIST: process.env.INFO_PRODUCT_ALREADY_IN_WISHLIST || 'Product already in wishlist',
    CART_EMPTY: process.env.INFO_CART_EMPTY || 'Your cart is empty',
    NO_ORDERS: process.env.INFO_NO_ORDERS || 'No orders found',
    NO_WISHLIST_ITEMS: process.env.INFO_NO_WISHLIST_ITEMS || 'No items in wishlist',
    NO_PRODUCTS: process.env.INFO_NO_PRODUCTS || 'No products found',
    NO_REVIEWS: process.env.INFO_NO_REVIEWS || 'No reviews found'
  },

  // Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Order Status
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // User Roles
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
  },

  // Product Status
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
    ARCHIVED: 'archived'
  },

  // Review Status
  REVIEW_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    PAYPAL: 'paypal',
    BANK_TRANSFER: 'bank_transfer',
    CASH_ON_DELIVERY: 'cash_on_delivery'
  },

  // Sort Options
  SORT_OPTIONS: {
    PRICE_LOW: 'price-low',
    PRICE_HIGH: 'price-high',
    RATING: 'rating',
    POPULAR: 'popular',
    NAME: 'name',
    NEWEST: 'newest',
    OLDEST: 'oldest',
    VIEWS: 'views'
  },

  // Filter Options
  FILTER_OPTIONS: {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
    FEATURED: 'featured',
    ON_SALE: 'on_sale'
  },

  // Database Configuration
  DB_SLOW_QUERY_THRESHOLD: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 1000,
  DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  DB_SOCKET_TIMEOUT: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
  DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE) || 10,
}; 