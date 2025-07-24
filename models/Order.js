/**
 * Order Model
 * Enhanced order management with configuration, validation, and security
 */

const mongoose = require("mongoose");

/**
 * Order Configuration
 */
const orderConfig = {
  tax: {
    rate: parseFloat(process.env.ORDER_TAX_RATE) || 0.085,
    enabled: process.env.ORDER_TAX_ENABLED !== 'false'
  },
  currency: {
    default: process.env.ORDER_DEFAULT_CURRENCY || 'USD',
    supported: process.env.ORDER_SUPPORTED_CURRENCIES?.split(',') || ['USD', 'EUR', 'GBP', 'CAD']
  },
  location: {
    defaultCountry: process.env.ORDER_DEFAULT_COUNTRY || 'United States',
    supportedCountries: process.env.ORDER_SUPPORTED_COUNTRIES?.split(',') || ['United States', 'Canada', 'United Kingdom']
  },
  payment: {
    methods: process.env.ORDER_PAYMENT_METHODS?.split(',') || [
      'credit_card', 'debit_card', 'paypal', 'stripe', 'cash_on_delivery', 'bank_transfer'
    ],
    statuses: process.env.ORDER_PAYMENT_STATUSES?.split(',') || [
      'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    ]
  },
  shipping: {
    methods: process.env.ORDER_SHIPPING_METHODS?.split(',') || [
      'standard', 'express', 'overnight', 'pickup', 'same_day'
    ],
    statuses: process.env.ORDER_SHIPPING_STATUSES?.split(',') || [
      'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned'
    ]
  },
  order: {
    statuses: process.env.ORDER_STATUSES?.split(',') || [
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    ],
    numberPrefix: process.env.ORDER_NUMBER_PREFIX || 'ORD',
    numberFormat: process.env.ORDER_NUMBER_FORMAT || 'timestamp-sequence'
  },
  limits: {
    maxItems: parseInt(process.env.ORDER_MAX_ITEMS) || 50,
    maxQuantity: parseInt(process.env.ORDER_MAX_QUANTITY) || 999,
    maxPrice: parseFloat(process.env.ORDER_MAX_PRICE) || 999999.99,
    maxDiscount: parseFloat(process.env.ORDER_MAX_DISCOUNT) || 1000.00
  },
  validation: {
    requirePhone: process.env.ORDER_REQUIRE_PHONE === 'true',
    requireEmail: process.env.ORDER_REQUIRE_EMAIL === 'true',
    validateZipCode: process.env.ORDER_VALIDATE_ZIPCODE !== 'false'
  }
};

/**
 * Validate configuration
 */
const validateConfig = () => {
  if (orderConfig.tax.rate < 0 || orderConfig.tax.rate > 1) {
    throw new Error('ORDER_TAX_RATE must be between 0 and 1');
  }
  
  if (!orderConfig.currency.supported.includes(orderConfig.currency.default)) {
    throw new Error('ORDER_DEFAULT_CURRENCY must be in ORDER_SUPPORTED_CURRENCIES');
  }
  
  if (!orderConfig.location.supportedCountries.includes(orderConfig.location.defaultCountry)) {
    throw new Error('ORDER_DEFAULT_COUNTRY must be in ORDER_SUPPORTED_COUNTRIES');
  }
};

/**
 * Sanitize input data
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

/**
 * Generate order number
 */
const generateOrderNumber = async (Order) => {
  const count = await Order.countDocuments();
  
  switch (orderConfig.order.numberFormat) {
    case 'timestamp-sequence':
      return `${orderConfig.order.numberPrefix}-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    case 'date-sequence':
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `${orderConfig.order.numberPrefix}-${today}-${(count + 1).toString().padStart(4, '0')}`;
    case 'random':
      return `${orderConfig.order.numberPrefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    default:
      return `${orderConfig.order.numberPrefix}-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
};

/**
 * Validate zip code format
 */
const validateZipCode = (zipCode, country) => {
  if (!orderConfig.validation.validateZipCode) return true;
  
  const patterns = {
    'United States': /^\d{5}(-\d{4})?$/,
    'Canada': /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    'United Kingdom': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i
  };
  
  const pattern = patterns[country] || /^.+$/;
  return pattern.test(zipCode);
};

/**
 * Order Item Schema
 */
const orderItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    maxlength: 200,
    set: sanitizeInput
  },
  image: { 
    type: String,
    maxlength: 500
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0,
    max: orderConfig.limits.maxPrice
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1,
    max: orderConfig.limits.maxQuantity
  },
  variant: {
    name: { type: String, maxlength: 100, set: sanitizeInput },
    value: { type: String, maxlength: 100, set: sanitizeInput },
  },
  sku: { type: String, maxlength: 50 },
  weight: { type: Number, min: 0 },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  }
}, {
  timestamps: true
});

/**
 * Shipping Address Schema
 */
const shippingAddressSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: true,
    maxlength: 50,
    set: sanitizeInput
  },
  lastName: { 
    type: String, 
    required: true,
    maxlength: 50,
    set: sanitizeInput
  },
  email: { 
    type: String,
    required: orderConfig.validation.requireEmail,
    maxlength: 100,
    set: sanitizeInput
  },
  phone: { 
    type: String,
    required: orderConfig.validation.requirePhone,
    maxlength: 20,
    set: sanitizeInput
  },
  street: { 
    type: String, 
    required: true,
    maxlength: 200,
    set: sanitizeInput
  },
  city: { 
    type: String, 
    required: true,
    maxlength: 100,
    set: sanitizeInput
  },
  state: { 
    type: String, 
    required: true,
    maxlength: 100,
    set: sanitizeInput
  },
  zipCode: { 
    type: String, 
    required: true,
    maxlength: 20,
    set: sanitizeInput,
    validate: {
      validator: function(value) {
        return validateZipCode(value, this.country);
      },
      message: 'Invalid zip code format for the selected country'
    }
  },
  country: { 
    type: String, 
    required: true, 
    default: orderConfig.location.defaultCountry,
    enum: orderConfig.location.supportedCountries,
    set: sanitizeInput
  },
  apartment: { type: String, maxlength: 50, set: sanitizeInput },
  company: { type: String, maxlength: 100, set: sanitizeInput }
}, {
  timestamps: true
});

/**
 * Payment Schema
 */
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: orderConfig.payment.methods,
    required: true,
  },
  status: {
    type: String,
    enum: orderConfig.payment.statuses,
    default: "pending",
  },
  transactionId: { type: String, maxlength: 100 },
  paymentIntentId: { type: String, maxlength: 100 },
  amount: { 
    type: Number, 
    required: true, 
    min: 0,
    max: orderConfig.limits.maxPrice
  },
  currency: { 
    type: String, 
    default: orderConfig.currency.default,
    enum: orderConfig.currency.supported
  },
  paidAt: Date,
  refundedAt: Date,
  refundAmount: { 
    type: Number, 
    default: 0,
    min: 0,
    max: orderConfig.limits.maxPrice
  },
  gateway: { type: String, maxlength: 50 },
  gatewayResponse: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

/**
 * Tracking Schema
 */
const trackingSchema = new mongoose.Schema({
  carrier: { type: String, maxlength: 100, set: sanitizeInput },
  trackingNumber: { type: String, maxlength: 100, set: sanitizeInput },
  trackingUrl: { type: String, maxlength: 500 },
  estimatedDelivery: Date,
  actualDelivery: Date,
  status: {
    type: String,
    enum: orderConfig.shipping.statuses,
    default: "pending",
  },
  updates: [
    {
      status: { type: String, maxlength: 100, set: sanitizeInput },
      location: { type: String, maxlength: 200, set: sanitizeInput },
      description: { type: String, maxlength: 500, set: sanitizeInput },
      timestamp: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: true
});

/**
 * Order Schema
 */
const orderSchema = new mongoose.Schema({
  orderNumber: { 
    type: String, 
    required: true,
    unique: true,
    maxlength: 50
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  items: [orderItemSchema],

  shippingAddress: { 
    type: shippingAddressSchema, 
    required: true 
  },
  billingAddress: shippingAddressSchema,

  payment: paymentSchema,

  pricing: {
    subtotal: { 
      type: Number, 
      required: true, 
      min: 0,
      max: orderConfig.limits.maxPrice
    },
    tax: { 
      type: Number, 
      default: 0, 
      min: 0,
      max: orderConfig.limits.maxPrice
    },
    shipping: { 
      type: Number, 
      default: 0, 
      min: 0,
      max: orderConfig.limits.maxPrice
    },
    discount: { 
      type: Number, 
      default: 0, 
      min: 0,
      max: orderConfig.limits.maxDiscount
    },
    total: { 
      type: Number, 
      required: true, 
      min: 0,
      max: orderConfig.limits.maxPrice
    },
  },

  status: {
    type: String,
    enum: orderConfig.order.statuses,
    default: "pending",
  },

  shipping: {
    method: { 
      type: String, 
      enum: orderConfig.shipping.methods, 
      default: "standard" 
    },
    cost: { 
      type: Number, 
      default: 0,
      min: 0,
      max: orderConfig.limits.maxPrice
    },
    estimatedDelivery: Date,
    actualDelivery: Date,
    tracking: trackingSchema,
  },

  notes: {
    customer: { type: String, maxlength: 1000, set: sanitizeInput },
    internal: { type: String, maxlength: 1000, set: sanitizeInput },
  },

  coupon: {
    code: { type: String, maxlength: 50, set: sanitizeInput },
    discount: { 
      type: Number, 
      min: 0,
      max: orderConfig.limits.maxDiscount
    },
    type: { 
      type: String, 
      enum: ["percentage", "fixed"] 
    },
  },

  statusHistory: [
    {
      status: { type: String, maxlength: 100, set: sanitizeInput },
      timestamp: { type: Date, default: Date.now },
      note: { type: String, maxlength: 500, set: sanitizeInput },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],

  cancelledAt: Date,
  cancelReason: { type: String, maxlength: 500, set: sanitizeInput },
  refundedAt: Date,
  refundAmount: { 
    type: Number, 
    min: 0,
    max: orderConfig.limits.maxPrice
  },
  
  // Additional fields
  source: { 
    type: String, 
    enum: ['web', 'mobile', 'api', 'admin'],
    default: 'web'
  },
  ipAddress: { type: String, maxlength: 45 },
  userAgent: { type: String, maxlength: 500 },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "shippingAddress.email": 1 });
orderSchema.index({ "payment.transactionId": 1 });
orderSchema.index({ "shipping.tracking.trackingNumber": 1 });

// Virtuals
orderSchema.virtual("customerName").get(function () {
  return `${this.shippingAddress.firstName} ${this.shippingAddress.lastName}`;
});

orderSchema.virtual("orderAge").get(function () {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

orderSchema.virtual("isDelivered").get(function () {
  return this.status === 'delivered';
});

orderSchema.virtual("isCancelled").get(function () {
  return this.status === 'cancelled';
});

orderSchema.virtual("isRefunded").get(function () {
  return this.status === 'refunded';
});

// Hooks
orderSchema.pre("save", async function (next) {
  try {
    validateConfig();
    
    if (this.isNew && !this.orderNumber) {
      this.orderNumber = await generateOrderNumber(this.constructor);
    }
    
    // Validate items array length
    if (this.items && this.items.length > orderConfig.limits.maxItems) {
      throw new Error(`Order cannot have more than ${orderConfig.limits.maxItems} items`);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

orderSchema.pre("save", function (next) {
  try {
    if (this.isModified("status") && !this.isNew) {
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
orderSchema.methods.calculateTotals = function () {
  try {
    this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (orderConfig.tax.enabled) {
      this.pricing.tax = Math.round(this.pricing.subtotal * orderConfig.tax.rate * 100) / 100;
    } else {
      this.pricing.tax = 0;
    }
    
    this.pricing.total = this.pricing.subtotal + this.pricing.tax + this.pricing.shipping - this.pricing.discount;
    
    // Ensure total is not negative
    if (this.pricing.total < 0) {
      this.pricing.total = 0;
    }
    
    return this;
  } catch (error) {
    throw new Error(`Error calculating totals: ${error.message}`);
  }
};

orderSchema.methods.updateStatus = async function (newStatus, note, updatedBy) {
  try {
    if (!orderConfig.order.statuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    
    this.status = newStatus;
    this.statusHistory.push({ 
      status: newStatus, 
      timestamp: new Date(), 
      note: sanitizeInput(note), 
      updatedBy 
    });

    switch (newStatus) {
      case "cancelled":
        this.cancelledAt = new Date();
        break;
      case "delivered":
        this.shipping.actualDelivery = new Date();
        break;
      case "refunded":
        this.refundedAt = new Date();
        break;
    }

    return await this.save();
  } catch (error) {
    throw new Error(`Error updating status: ${error.message}`);
  }
};

orderSchema.methods.addTracking = async function (trackingInfo) {
  try {
    this.shipping.tracking = { ...this.shipping.tracking, ...trackingInfo };
    return await this.save();
  } catch (error) {
    throw new Error(`Error adding tracking: ${error.message}`);
  }
};

orderSchema.methods.updateTracking = async function (status, location, description) {
  try {
    if (!orderConfig.shipping.statuses.includes(status)) {
      throw new Error(`Invalid tracking status: ${status}`);
    }
    
    if (!this.shipping.tracking.updates) {
      this.shipping.tracking.updates = [];
    }

    this.shipping.tracking.updates.push({
      status: sanitizeInput(status),
      location: sanitizeInput(location),
      description: sanitizeInput(description),
      timestamp: new Date(),
    });

    this.shipping.tracking.status = status;

    return await this.save();
  } catch (error) {
    throw new Error(`Error updating tracking: ${error.message}`);
  }
};

orderSchema.methods.applyCoupon = function (couponCode, discount, type) {
  try {
    if (discount > orderConfig.limits.maxDiscount) {
      throw new Error(`Discount cannot exceed ${orderConfig.limits.maxDiscount}`);
    }
    
    this.coupon = {
      code: sanitizeInput(couponCode),
      discount: discount,
      type: type
    };
    
    this.calculateTotals();
    return this;
  } catch (error) {
    throw new Error(`Error applying coupon: ${error.message}`);
  }
};

// Statics
orderSchema.statics.getByUser = function (userId, { page = 1, limit = 10, status } = {}) {
  try {
    const filter = { user: userId };
    if (status && orderConfig.order.statuses.includes(status)) {
      filter.status = status;
    }

    return this.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("items.product", "name images price sku");
  } catch (error) {
    throw new Error(`Error fetching user orders: ${error.message}`);
  }
};

orderSchema.statics.getRecent = function (limit = 10) {
  try {
    return this.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "firstName lastName email")
      .populate("items.product", "name price");
  } catch (error) {
    throw new Error(`Error fetching recent orders: ${error.message}`);
  }
};

orderSchema.statics.getByStatus = function (status, { page = 1, limit = 10 } = {}) {
  try {
    if (!orderConfig.order.statuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    return this.find({ status })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "firstName lastName email")
      .populate("items.product", "name price");
  } catch (error) {
    throw new Error(`Error fetching orders by status: ${error.message}`);
  }
};

/**
 * Get order configuration (admin function)
 */
orderSchema.statics.getConfig = () => {
  return {
    ...orderConfig,
    // Don't expose sensitive config
    limits: {
      maxItems: orderConfig.limits.maxItems,
      maxQuantity: orderConfig.limits.maxQuantity,
      maxPrice: orderConfig.limits.maxPrice,
      maxDiscount: orderConfig.limits.maxDiscount
    }
  };
};

/**
 * Update order configuration (admin function)
 */
orderSchema.statics.updateConfig = (newConfig) => {
  // Only allow updating certain fields
  const allowedUpdates = ['tax', 'limits', 'validation'];
  
  allowedUpdates.forEach(key => {
    if (newConfig[key]) {
      orderConfig[key] = { ...orderConfig[key], ...newConfig[key] };
    }
  });
};

module.exports = mongoose.model("Order", orderSchema);
