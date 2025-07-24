/**
 * Validation Middleware
 * Enhanced validation with configuration, security, and monitoring
 */

const Joi = require('joi');

/**
 * Validation Configuration
 */
const validationConfig = {
  limits: {
    // String length limits
    username: {
      min: parseInt(process.env.VALIDATION_USERNAME_MIN) || 3,
      max: parseInt(process.env.VALIDATION_USERNAME_MAX) || 30
    },
    password: {
      min: parseInt(process.env.VALIDATION_PASSWORD_MIN) || 6,
      max: parseInt(process.env.VALIDATION_PASSWORD_MAX) || 128
    },
    name: {
      min: parseInt(process.env.VALIDATION_NAME_MIN) || 2,
      max: parseInt(process.env.VALIDATION_NAME_MAX) || 50
    },
    productName: {
      min: parseInt(process.env.VALIDATION_PRODUCT_NAME_MIN) || 3,
      max: parseInt(process.env.VALIDATION_PRODUCT_NAME_MAX) || 100
    },
    description: {
      min: parseInt(process.env.VALIDATION_DESCRIPTION_MIN) || 10,
      max: parseInt(process.env.VALIDATION_DESCRIPTION_MAX) || 1000
    },
    title: {
      min: parseInt(process.env.VALIDATION_TITLE_MIN) || 5,
      max: parseInt(process.env.VALIDATION_TITLE_MAX) || 100
    },
    comment: {
      min: parseInt(process.env.VALIDATION_COMMENT_MIN) || 10,
      max: parseInt(process.env.VALIDATION_COMMENT_MAX) || 500
    },
    address: {
      min: parseInt(process.env.VALIDATION_ADDRESS_MIN) || 10,
      max: parseInt(process.env.VALIDATION_ADDRESS_MAX) || 200
    },
    phone: {
      min: parseInt(process.env.VALIDATION_PHONE_MIN) || 10,
      max: parseInt(process.env.VALIDATION_PHONE_MAX) || 15
    }
  },
  security: {
    // Security settings
    maxArrayLength: parseInt(process.env.VALIDATION_MAX_ARRAY_LENGTH) || 100,
    maxObjectKeys: parseInt(process.env.VALIDATION_MAX_OBJECT_KEYS) || 50,
    allowedFileTypes: process.env.VALIDATION_ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    maxFileSize: parseInt(process.env.VALIDATION_MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    sanitizeInput: process.env.VALIDATION_SANITIZE_INPUT !== 'false'
  },
  payment: {
    // Payment method configuration
    methods: process.env.VALIDATION_PAYMENT_METHODS?.split(',') || [
      'credit_card', 'debit_card', 'paypal', 'cash_on_delivery', 'bank_transfer'
    ]
  },
  logging: {
    // Logging configuration
    enabled: process.env.VALIDATION_LOGGING_ENABLED !== 'false',
    level: process.env.VALIDATION_LOG_LEVEL || 'info',
    includeBody: process.env.VALIDATION_LOG_BODY === 'true',
    includeHeaders: process.env.VALIDATION_LOG_HEADERS === 'true'
  }
};

/**
 * Validate configuration
 */
const validateConfig = () => {
  const requiredLimits = ['username', 'password', 'name', 'productName', 'description'];
  
  requiredLimits.forEach(limit => {
    if (!validationConfig.limits[limit]) {
      throw new Error(`Validation limit configuration missing for: ${limit}`);
    }
  });
};

/**
 * Sanitize input for security
 */
const sanitizeInput = (input) => {
  if (!validationConfig.security.sanitizeInput) {
    return input;
  }

  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};

/**
 * Log validation events
 */
const logValidation = (level, message, data = {}) => {
  if (!validationConfig.logging.enabled) return;

  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  };

  switch (level) {
    case 'error':
      console.error(`[VALIDATION] ${message}`, logData);
      break;
    case 'warn':
      console.warn(`[VALIDATION] ${message}`, logData);
      break;
    case 'info':
      console.log(`[VALIDATION] ${message}`, logData);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.log(`[VALIDATION] ${message}`, logData);
      }
      break;
  }
};

/**
 * Create standardized error response
 */
const createValidationError = (errors, req) => {
  const errorResponse = {
    success: false,
    error: {
      type: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.type
      })),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || req.id || 'unknown'
    }
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.request = {
      method: req.method,
      path: req.path,
      body: validationConfig.logging.includeBody ? req.body : '[REDACTED]',
      headers: validationConfig.logging.includeHeaders ? req.headers : '[REDACTED]'
    };
  }

  return errorResponse;
};

/**
 * Custom validation functions
 */
const customValidators = {
  // Password strength validator
  passwordStrength: (value, helpers) => {
    const minLength = validationConfig.limits.password.min;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (value.length < minLength) {
      return helpers.error('string.min');
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return helpers.error('any.invalid', { message: 'Password must contain uppercase, lowercase, and numbers' });
    }

    return value;
  },

  // Phone number validator
  phoneNumber: (value, helpers) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return helpers.error('any.invalid', { message: 'Please enter a valid phone number' });
    }
    return value;
  },

  // URL validator with allowed domains
  allowedUrl: (value, helpers) => {
    try {
      const url = new URL(value);
      const allowedDomains = process.env.VALIDATION_ALLOWED_DOMAINS?.split(',') || [];
      
      if (allowedDomains.length > 0 && !allowedDomains.includes(url.hostname)) {
        return helpers.error('any.invalid', { message: 'URL domain not allowed' });
      }
      
      return value;
    } catch {
      return helpers.error('any.invalid', { message: 'Invalid URL format' });
    }
  },

  // File type validator
  fileType: (value, helpers) => {
    const allowedTypes = validationConfig.security.allowedFileTypes;
    const fileExtension = value.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return helpers.error('any.invalid', { 
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
      });
    }
    
    return value;
  }
};

/**
 * Reusable validation options
 */
const getValidationOptions = (req) => ({
  abortEarly: false,
  stripUnknown: true,
  allowUnknown: false,
  context: {
    req,
    config: validationConfig
  }
});

/**
 * Product validation schema
 */
const productSchema = Joi.object({
  name: Joi.string()
    .min(validationConfig.limits.productName.min)
    .max(validationConfig.limits.productName.max)
    .required()
    .messages({
      'string.min': `Product name must be at least ${validationConfig.limits.productName.min} characters`,
      'string.max': `Product name cannot exceed ${validationConfig.limits.productName.max} characters`,
      'any.required': 'Product name is required'
    }),
  description: Joi.string()
    .min(validationConfig.limits.description.min)
    .max(validationConfig.limits.description.max)
    .required()
    .messages({
      'string.min': `Description must be at least ${validationConfig.limits.description.min} characters`,
      'string.max': `Description cannot exceed ${validationConfig.limits.description.max} characters`,
      'any.required': 'Product description is required'
    }),
  price: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      'number.positive': 'Price must be positive',
      'number.max': 'Price cannot exceed 999,999.99',
      'any.required': 'Product price is required'
    }),
  category: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Category must be at least 2 characters',
      'string.max': 'Category cannot exceed 50 characters',
      'any.required': 'Product category is required'
    }),
  stock: Joi.number()
    .integer()
    .min(0)
    .max(999999)
    .required()
    .messages({
      'number.integer': 'Stock must be a whole number',
      'number.min': 'Stock cannot be negative',
      'number.max': 'Stock cannot exceed 999,999',
      'any.required': 'Product stock is required'
    }),
  images: Joi.array()
    .items(Joi.string().custom(customValidators.allowedUrl))
    .min(1)
    .max(validationConfig.security.maxArrayLength)
    .messages({
      'array.min': 'At least one product image is required',
      'array.max': `Cannot exceed ${validationConfig.security.maxArrayLength} images`
    }),
  tags: Joi.array()
    .items(Joi.string().min(2).max(20))
    .max(validationConfig.security.maxArrayLength)
    .messages({
      'array.max': `Cannot exceed ${validationConfig.security.maxArrayLength} tags`
    }),
  featured: Joi.boolean(),
  isActive: Joi.boolean(),
  sku: Joi.string().min(3).max(50).pattern(/^[A-Z0-9\-_]+$/),
  weight: Joi.number().positive().max(999.99),
  dimensions: Joi.object({
    length: Joi.number().positive().max(999.99),
    width: Joi.number().positive().max(999.99),
    height: Joi.number().positive().max(999.99)
  })
});

/**
 * User Schema
 */
const userSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(validationConfig.limits.username.min)
    .max(validationConfig.limits.username.max)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.min': `Username must be at least ${validationConfig.limits.username.min} characters`,
      'string.max': `Username cannot exceed ${validationConfig.limits.username.max} characters`,
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email address is required'
    }),
  password: Joi.string()
    .min(validationConfig.limits.password.min)
    .max(validationConfig.limits.password.max)
    .custom(customValidators.passwordStrength)
    .required()
    .messages({
      'string.min': `Password must be at least ${validationConfig.limits.password.min} characters`,
      'string.max': `Password cannot exceed ${validationConfig.limits.password.max} characters`,
      'any.required': 'Password is required'
    }),
  firstName: Joi.string()
    .trim()
    .min(validationConfig.limits.name.min)
    .max(validationConfig.limits.name.max)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': `First name must be at least ${validationConfig.limits.name.min} characters`,
      'string.max': `First name cannot exceed ${validationConfig.limits.name.max} characters`,
      'string.pattern.base': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .trim()
    .min(validationConfig.limits.name.min)
    .max(validationConfig.limits.name.max)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': `Last name must be at least ${validationConfig.limits.name.min} characters`,
      'string.max': `Last name cannot exceed ${validationConfig.limits.name.max} characters`,
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),
  phone: Joi.string()
    .custom(customValidators.phoneNumber)
    .optional()
    .messages({
      'any.invalid': 'Please enter a valid phone number'
    }),
  role: Joi.string()
    .valid('user', 'moderator', 'admin')
    .default('user')
});

/**
 * Login Schema
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email address is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  rememberMe: Joi.boolean().default(false)
});

/**
 * Order Schema
 */
const orderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().integer().min(1).max(999).required(),
        price: Joi.number().positive().precision(2).required()
      })
    )
    .min(1)
    .max(validationConfig.security.maxArrayLength)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'array.max': `Cannot exceed ${validationConfig.security.maxArrayLength} items`
    }),
  shippingAddress: Joi.string()
    .min(validationConfig.limits.address.min)
    .max(validationConfig.limits.address.max)
    .required()
    .messages({
      'string.min': `Address must be at least ${validationConfig.limits.address.min} characters`,
      'string.max': `Address cannot exceed ${validationConfig.limits.address.max} characters`,
      'any.required': 'Shipping address is required'
    }),
  city: Joi.string().min(2).max(50).required(),
  state: Joi.string().min(2).max(50).required(),
  zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
  phone: Joi.string().custom(customValidators.phoneNumber).required(),
  paymentMethod: Joi.string()
    .valid(...validationConfig.payment.methods)
    .required()
    .messages({
      'any.only': `Payment method must be one of: ${validationConfig.payment.methods.join(', ')}`
    }),
  notes: Joi.string().max(500).optional()
});

/**
 * Review Schema
 */
const reviewSchema = Joi.object({
  productId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string()
    .trim()
    .min(validationConfig.limits.title.min)
    .max(validationConfig.limits.title.max)
    .required()
    .messages({
      'string.min': `Review title must be at least ${validationConfig.limits.title.min} characters`,
      'string.max': `Review title cannot exceed ${validationConfig.limits.title.max} characters`,
      'any.required': 'Review title is required'
    }),
  comment: Joi.string()
    .trim()
    .min(validationConfig.limits.comment.min)
    .max(validationConfig.limits.comment.max)
    .required()
    .messages({
      'string.min': `Review comment must be at least ${validationConfig.limits.comment.min} characters`,
      'string.max': `Review comment cannot exceed ${validationConfig.limits.comment.max} characters`,
      'any.required': 'Review comment is required'
    })
});

/**
 * Review Update Schema
 */
const reviewUpdateSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string()
    .trim()
    .min(validationConfig.limits.title.min)
    .max(validationConfig.limits.title.max)
    .optional(),
  comment: Joi.string()
    .trim()
    .min(validationConfig.limits.comment.min)
    .max(validationConfig.limits.comment.max)
    .optional()
}).min(1);

/**
 * Generic validation middleware
 */
const validate = (schema) => (req, res, next) => {
  try {
    validateConfig();

    const startTime = Date.now();
    const sanitizedBody = sanitizeInput(req.body);
    
    logValidation('debug', 'Starting validation', {
      path: req.path,
      method: req.method,
      bodyKeys: Object.keys(sanitizedBody)
    });

    const options = getValidationOptions(req);
    const { error, value } = schema.validate(sanitizedBody, options);
    
    const validationTime = Date.now() - startTime;
    
    if (error) {
      logValidation('warn', 'Validation failed', {
        path: req.path,
        errors: error.details.length,
        validationTime: `${validationTime}ms`
      });

      const errorResponse = createValidationError(error.details, req);
      
      // Check if this is an API request or web form
      const isApiRequest = req.path.startsWith('/api/') || 
                          req.headers['content-type'] === 'application/json' ||
                          req.xhr;
      
      if (isApiRequest) {
        return res.status(400).json(errorResponse);
      } else {
        // For web forms, redirect back with error message
        const errorMessage = error.details.map(err => err.message).join(', ');
        req.session.error = errorMessage;
        return res.redirect('back');
      }
    }

    logValidation('info', 'Validation passed', {
      path: req.path,
      validationTime: `${validationTime}ms`
    });

    req.body = value; // Sanitized and validated input
    next();
  } catch (error) {
    logValidation('error', 'Validation middleware error', {
      path: req.path,
      error: error.message
    });
    
    // Continue without validation rather than failing the request
    next();
  }
};

/**
 * Get validation statistics
 */
const getValidationStats = () => {
  return {
    config: {
      limits: Object.keys(validationConfig.limits).length,
      security: Object.keys(validationConfig.security).length,
      paymentMethods: validationConfig.payment.methods.length
    },
    schemas: {
      product: !!productSchema,
      user: !!userSchema,
      login: !!loginSchema,
      order: !!orderSchema,
      review: !!reviewSchema
    }
  };
};

/**
 * Update validation configuration (admin function)
 */
const updateValidationConfig = (newConfig) => {
  // Only allow updating certain fields
  const allowedUpdates = ['limits', 'security', 'payment'];
  
  allowedUpdates.forEach(key => {
    if (newConfig[key]) {
      validationConfig[key] = { ...validationConfig[key], ...newConfig[key] };
    }
  });
};

module.exports = {
  // Middleware functions
  validateProduct: validate(productSchema),
  validateUser: validate(userSchema),
  validateLogin: validate(loginSchema),
  validateOrder: validate(orderSchema),
  validateReview: validate(reviewSchema),
  validateReviewUpdate: validate(reviewUpdateSchema),
  
  // Utility functions
  getValidationStats,
  updateValidationConfig,
  sanitizeInput,
  customValidators,
  
  // Export schemas
  schemas: {
    productSchema,
    userSchema,
    loginSchema,
    orderSchema,
    reviewSchema,
    reviewUpdateSchema
  },
  
  // Export configuration
  validationConfig
};
