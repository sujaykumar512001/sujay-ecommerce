/**
 * Application Constants and Centralized Configuration
 * Used across the e-commerce app
 */

const parseList = (value, fallback = []) =>
  value ? value.split(',').map((v) => v.trim()) : fallback;

const inDev = process.env.NODE_ENV !== 'production';

module.exports = {
  // Tax & Shipping
  TAX_RATE: parseFloat(process.env.TAX_RATE) || 0.08,
  FREE_SHIPPING_THRESHOLD: parseFloat(process.env.FREE_SHIPPING_THRESHOLD) || 50,
  SHIPPING_COST: parseFloat(process.env.SHIPPING_COST) || 5.99,
  SHIPPING_COST_ALT: parseFloat(process.env.SHIPPING_COST_ALT) || 10,

  // Pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
  PRODUCTS_PAGE_SIZE: parseInt(process.env.PRODUCTS_PAGE_SIZE) || 12,
  ADMIN_PAGE_SIZE: parseInt(process.env.ADMIN_PAGE_SIZE) || 10,
  REVIEWS_PAGE_SIZE: parseInt(process.env.REVIEWS_PAGE_SIZE) || 10,
  USER_ORDERS_PAGE_SIZE: parseInt(process.env.USER_ORDERS_PAGE_SIZE) || 10,
  USER_RECENT_ORDERS_LIMIT: parseInt(process.env.USER_RECENT_ORDERS_LIMIT) || 10,

  // User Config
  USER_CONFIG: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MAX_PHONE_LENGTH: 20,
    MAX_ADDRESSES: 5,
    MAX_WISHLIST_ITEMS: 50,
    MAX_CART_ITEMS: 20,
    DEFAULT_COUNTRY: process.env.USER_DEFAULT_COUNTRY || 'US',
    DEFAULT_CURRENCY: process.env.USER_DEFAULT_CURRENCY || 'USD',
    DEFAULT_LANGUAGE: process.env.USER_DEFAULT_LANGUAGE || 'en'
  },

  // Inventory / Price
  LOW_STOCK_THRESHOLD: 10,
  OUT_OF_STOCK_THRESHOLD: 0,
  DEFAULT_MIN_PRICE: 0,
  DEFAULT_MAX_PRICE: 1000,

  // Dynamic coupon config (can later move to DB)
  COUPONS: {
    SAVE10: { discount: 10, type: 'percentage' },
    FREESHIP: { discount: 5.99, type: 'fixed' }
  },

  // Security
  SESSION_SECRET: (() => {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    if (!inDev) throw new Error('SESSION_SECRET must be set in production');
    return 'dev-session-secret';
  })(),

  JWT_SECRET: (() => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (!inDev) throw new Error('JWT_SECRET must be set in production');
    return 'dev-jwt-secret';
  })(),

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Upload Config
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: parseList(process.env.ALLOWED_IMAGE_TYPES, [
    'image/jpeg',
    'image/png',
    'image/webp'
  ]),

  // File Validation
  PASSWORD_MIN_LENGTH: 8,
  SEARCH_MIN_LENGTH: 2,
  SEARCH_MAX_LENGTH: 100,

  // Site Info
  SITE_NAME: process.env.SITE_NAME || 'Yadav Collection',
  SITE_URL: process.env.SITE_URL || 'https://yadavcollection.com',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // Email
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yadavcollection.com',
  EMAIL_SUBJECTS: {
    WELCOME: process.env.EMAIL_WELCOME_SUBJECT || 'Welcome to Yadav Collection!',
    ORDER_CONFIRMATION: process.env.EMAIL_ORDER_SUBJECT || 'Order Confirmation',
    PASSWORD_RESET: process.env.EMAIL_PASSWORD_RESET_SUBJECT || 'Password Reset Request'
  },

  // Password Reset
  PASSWORD_RESET_EXPIRY: process.env.PASSWORD_RESET_EXPIRY || '1h',
  PASSWORD_RESET_TOKEN_LENGTH: parseInt(process.env.PASSWORD_RESET_TOKEN_LENGTH) || 32,

  // Analytics
  SESSION_SAVE_DELAY: 100,
  ANALYTICS_PERIODS: {
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
  },

  // Cache
  CACHE_CONFIG: {
    DEFAULT_TTL: 5 * 60 * 1000,
    CLEANUP_INTERVAL: 60 * 1000,
    MAX_MEMORY_SIZE: 1000,
    STALE_TTL: 60 * 1000,
    TAG_TTL: 24 * 60 * 60 * 1000,
    LOGGING_ENABLED: process.env.CACHE_LOGGING_ENABLED !== 'false',
    LOG_LEVEL: process.env.CACHE_LOG_LEVEL || 'info'
  },

  // API Config
  API_CONFIG: {
    TIMEOUT: 10000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    MAX_CONCURRENT: 10,
    USER_AGENT: 'Ecommerce-App/1.0',
    LOGGING_ENABLED: process.env.API_LOGGING_ENABLED !== 'false',
    LOG_LEVEL: process.env.API_LOG_LEVEL || 'info'
  },

  // DB
  DB_SLOW_QUERY_THRESHOLD: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 1000,
  DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  DB_SOCKET_TIMEOUT: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
  DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE) || 10,

  // Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },

  // Error Messages
  ERROR_MESSAGES: {
    INVALID_INPUT: 'Invalid input provided',
    NOT_FOUND: 'Resource not found',
    SERVER_ERROR: 'Internal server error',
    FORBIDDEN: 'Access forbidden',
    UNAUTHORIZED: 'Unauthorized access',
    SESSION_SAVE_FAILED: 'Failed to save session',
    PROFILE_LOAD_ERROR: 'Failed to load profile',
    USER_NOT_FOUND: 'User not found',
    PROFILE_UPDATE_ERROR: 'Failed to update profile',
    ORDERS_LOAD_ERROR: 'Failed to load orders',
    INVALID_ORDER_ID: 'Invalid order ID',
    ORDER_NOT_FOUND: 'Order not found',
    UNAUTHORIZED_ORDER_ACCESS: 'Unauthorized access to order'
  },

  // User Roles / Status
  USER_ROLES: { USER: 'user', ADMIN: 'admin', MODERATOR: 'moderator' },
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
    ARCHIVED: 'archived'
  },
  REVIEW_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  PAYMENT_METHODS: {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    PAYPAL: 'paypal',
    BANK_TRANSFER: 'bank_transfer',
    CASH_ON_DELIVERY: 'cash_on_delivery'
  },

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

  FILTER_OPTIONS: {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
    FEATURED: 'featured',
    ON_SALE: 'on_sale'
  }
};
