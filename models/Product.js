/**
 * Product Model
 * Enhanced product management with configuration, validation, and security
 */

const mongoose = require("mongoose");

/**
 * Product Configuration
 */
const productConfig = {
  limits: {
    nameLength: parseInt(process.env.PRODUCT_NAME_MAX_LENGTH) || 200,
    descriptionLength: parseInt(process.env.PRODUCT_DESCRIPTION_MAX_LENGTH) || 2000,
    shortDescriptionLength: parseInt(process.env.PRODUCT_SHORT_DESC_MAX_LENGTH) || 500,
    commentLength: parseInt(process.env.PRODUCT_COMMENT_MAX_LENGTH) || 500,
    maxPrice: parseFloat(process.env.PRODUCT_MAX_PRICE) || 999999.99,
    maxStock: parseInt(process.env.PRODUCT_MAX_STOCK) || 999999,
    maxImages: parseInt(process.env.PRODUCT_MAX_IMAGES) || 10,
    maxVariants: parseInt(process.env.PRODUCT_MAX_VARIANTS) || 50,
    maxSpecifications: parseInt(process.env.PRODUCT_MAX_SPECS) || 20,
    maxTags: parseInt(process.env.PRODUCT_MAX_TAGS) || 20
  },
  defaults: {
    lowStockThreshold: parseInt(process.env.PRODUCT_LOW_STOCK_THRESHOLD) || 10,
    maxRating: parseInt(process.env.PRODUCT_MAX_RATING) || 5,
    minRating: parseInt(process.env.PRODUCT_MIN_RATING) || 1
  },
  units: {
    weight: process.env.PRODUCT_WEIGHT_UNITS?.split(',') || ['kg', 'lb', 'g', 'oz'],
    dimensions: process.env.PRODUCT_DIMENSION_UNITS?.split(',') || ['cm', 'in', 'm', 'ft'],
    defaultWeight: process.env.PRODUCT_DEFAULT_WEIGHT_UNIT || 'kg',
    defaultDimension: process.env.PRODUCT_DEFAULT_DIMENSION_UNIT || 'cm'
  },
  status: {
    values: process.env.PRODUCT_STATUSES?.split(',') || ['draft', 'active', 'inactive', 'discontinued'],
    default: process.env.PRODUCT_DEFAULT_STATUS || 'draft'
  },
  condition: {
    values: process.env.PRODUCT_CONDITIONS?.split(',') || ['new', 'used', 'refurbished'],
    default: process.env.PRODUCT_DEFAULT_CONDITION || 'new'
  },
  shipping: {
    classes: process.env.PRODUCT_SHIPPING_CLASSES?.split(',') || ['standard', 'express', 'overnight'],
    defaultClass: process.env.PRODUCT_DEFAULT_SHIPPING_CLASS || 'standard'
  },
  search: {
    weights: {
      name: parseInt(process.env.PRODUCT_SEARCH_NAME_WEIGHT) || 10,
      brand: parseInt(process.env.PRODUCT_SEARCH_BRAND_WEIGHT) || 5,
      tags: parseInt(process.env.PRODUCT_SEARCH_TAGS_WEIGHT) || 3,
      description: parseInt(process.env.PRODUCT_SEARCH_DESC_WEIGHT) || 1
    }
  },
  validation: {
    requireBrand: process.env.PRODUCT_REQUIRE_BRAND === 'true',
    requireImages: process.env.PRODUCT_REQUIRE_IMAGES === 'true',
    validatePrice: process.env.PRODUCT_VALIDATE_PRICE !== 'false',
    validateStock: process.env.PRODUCT_VALIDATE_STOCK !== 'false'
  }
};

/**
 * Validate configuration
 */
const validateConfig = () => {
  if (productConfig.limits.nameLength <= 0) {
    throw new Error('PRODUCT_NAME_MAX_LENGTH must be greater than 0');
  }
  
  if (productConfig.limits.maxPrice <= 0) {
    throw new Error('PRODUCT_MAX_PRICE must be greater than 0');
  }
  
  if (!productConfig.units.weight.includes(productConfig.units.defaultWeight)) {
    throw new Error('PRODUCT_DEFAULT_WEIGHT_UNIT must be in PRODUCT_WEIGHT_UNITS');
  }
  
  if (!productConfig.units.dimensions.includes(productConfig.units.defaultDimension)) {
    throw new Error('PRODUCT_DEFAULT_DIMENSION_UNIT must be in PRODUCT_DIMENSION_UNITS');
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
 * Validate price range
 */
const validatePrice = (price, salePrice) => {
  if (productConfig.validation.validatePrice) {
    if (price < 0 || price > productConfig.limits.maxPrice) {
      throw new Error(`Price must be between 0 and ${productConfig.limits.maxPrice}`);
    }
    
    if (salePrice && (salePrice < 0 || salePrice > productConfig.limits.maxPrice)) {
      throw new Error(`Sale price must be between 0 and ${productConfig.limits.maxPrice}`);
    }
    
    if (salePrice && salePrice >= price) {
      throw new Error('Sale price must be less than regular price');
    }
  }
};

/**
 * Validate stock quantity
 */
const validateStock = (stock) => {
  if (productConfig.validation.validateStock) {
    if (stock < 0 || stock > productConfig.limits.maxStock) {
      throw new Error(`Stock must be between 0 and ${productConfig.limits.maxStock}`);
    }
  }
};

/**
 * Generate SKU
 */
const generateSKU = (name, category, brand) => {
  const prefix = (name || 'PROD').substring(0, 3).toUpperCase();
  const categoryCode = (category || 'GEN').substring(0, 3).toUpperCase();
  const brandCode = (brand || 'BRD').substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  
  return `${prefix}-${categoryCode}-${brandCode}-${timestamp}`;
};

/**
 * Review Schema
 */
const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: productConfig.defaults.minRating,
    max: productConfig.defaults.maxRating,
  },
  comment: {
    type: String,
    required: true,
    maxlength: productConfig.limits.commentLength,
    set: sanitizeInput
  },
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  verified: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  reported: { type: Boolean, default: false },
  reportReason: { type: String, maxlength: 200, set: sanitizeInput }
}, { 
  timestamps: true 
});

/**
 * Variant Schema
 */
const variantSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    maxlength: 100,
    set: sanitizeInput
  },
  value: { 
    type: String, 
    required: true,
    maxlength: 100,
    set: sanitizeInput
  },
  price: { 
    type: Number, 
    default: 0,
    min: 0,
    max: productConfig.limits.maxPrice
  },
  stock: { 
    type: Number, 
    default: 0,
    min: 0,
    max: productConfig.limits.maxStock
  },
  sku: { 
    type: String,
    maxlength: 50,
    set: sanitizeInput
  },
  images: [{
    url: { type: String, maxlength: 500 },
    public_id: { type: String, maxlength: 100 },
    alt: { type: String, maxlength: 100, set: sanitizeInput },
  }],
  weight: {
    value: { type: Number, min: 0 },
    unit: { 
      type: String, 
      enum: productConfig.units.weight,
      default: productConfig.units.defaultWeight
    }
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { 
      type: String, 
      enum: productConfig.units.dimensions,
      default: productConfig.units.defaultDimension
    }
  }
}, {
  timestamps: true
});

/**
 * Product Schema
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: productConfig.limits.nameLength,
    set: sanitizeInput
  },
  description: {
    type: String,
    required: true,
    maxlength: productConfig.limits.descriptionLength,
    set: sanitizeInput
  },
  shortDescription: {
    type: String,
    maxlength: productConfig.limits.shortDescriptionLength,
    set: sanitizeInput
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    max: productConfig.limits.maxPrice
  },
  salePrice: {
    type: Number,
    min: 0,
    max: productConfig.limits.maxPrice,
    validate: {
      validator: function (value) {
        return !value || value < this.price;
      },
      message: "Sale price must be less than regular price",
    },
  },
  cost: {
    type: Number,
    min: 0,
    max: productConfig.limits.maxPrice
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 50,
    set: v => v ? v.toUpperCase() : v
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    set: sanitizeInput
  },
  subcategory: { 
    type: String,
    maxlength: 100,
    set: sanitizeInput
  },
  brand: { 
    type: String,
    required: productConfig.validation.requireBrand,
    maxlength: 100,
    set: sanitizeInput
  },
  tags: [{ 
    type: String, 
    lowercase: true, 
    trim: true,
    maxlength: 50,
    set: sanitizeInput
  }],
  images: [{
    url: { 
      type: String, 
      required: true,
      maxlength: 500
    },
    public_id: { type: String, maxlength: 100 },
    alt: { type: String, maxlength: 100, set: sanitizeInput },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  variants: [variantSchema],
  specifications: [{
    name: { 
      type: String, 
      required: true,
      maxlength: 100,
      set: sanitizeInput
    },
    value: { 
      type: String, 
      required: true,
      maxlength: 500,
      set: sanitizeInput
    },
  }],
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: productConfig.limits.maxStock
  },
  lowStockThreshold: {
    type: Number,
    default: productConfig.defaults.lowStockThreshold,
    min: 0,
    max: productConfig.limits.maxStock
  },
  weight: {
    value: { type: Number, min: 0 },
    unit: {
      type: String,
      enum: productConfig.units.weight,
      default: productConfig.units.defaultWeight
    },
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: {
      type: String,
      enum: productConfig.units.dimensions,
      default: productConfig.units.defaultDimension
    },
  },
  shipping: {
    free: { type: Boolean, default: false },
    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    class: {
      type: String,
      enum: productConfig.shipping.classes,
      default: productConfig.shipping.defaultClass
    },
  },
  seo: {
    metaTitle: { type: String, maxlength: 60, set: sanitizeInput },
    metaDescription: { type: String, maxlength: 160, set: sanitizeInput },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200
    },
    keywords: [{ type: String, maxlength: 50, set: sanitizeInput }]
  },
  status: {
    type: String,
    enum: productConfig.status.values,
    default: productConfig.status.default
  },
  featured: { type: Boolean, default: false },
  condition: {
    type: String,
    enum: productConfig.condition.values,
    default: productConfig.condition.default
  },
  reviews: [reviewSchema],
  averageRating: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: productConfig.defaults.maxRating 
  },
  totalReviews: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  wishlistCount: { type: Number, default: 0 },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Additional fields
  source: { 
    type: String, 
    enum: ['web', 'mobile', 'api', 'admin', 'import'],
    default: 'web'
  },
  metadata: mongoose.Schema.Types.Mixed,
  lastStockUpdate: Date,
  lastPriceUpdate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// OPTIMIZED INDEXES FOR BETTER QUERY PERFORMANCE

// Text search index (for search functionality)
productSchema.index({ 
  name: "text", 
  description: "text", 
  tags: "text",
  brand: "text"
}, {
  weights: productConfig.search.weights,
  name: "product_text_search"
});

// Compound indexes for common query patterns
productSchema.index({ 
  isActive: 1, 
  featured: 1, 
  status: 1 
}, { name: "active_featured_status" });

productSchema.index({ 
  isActive: 1, 
  category: 1, 
  status: 1 
}, { name: "active_category_status" });

productSchema.index({ 
  isActive: 1, 
  price: 1, 
  averageRating: -1 
}, { name: "active_price_rating" });

productSchema.index({ 
  isActive: 1, 
  category: 1, 
  price: 1 
}, { name: "active_category_price" });

productSchema.index({ 
  isActive: 1, 
  createdAt: -1 
}, { name: "active_created_desc" });

productSchema.index({ 
  isActive: 1, 
  totalSales: -1 
}, { name: "active_sales_desc" });

productSchema.index({ 
  isActive: 1, 
  viewCount: -1 
}, { name: "active_views_desc" });

// Single field indexes for specific queries
productSchema.index({ sku: 1 }, { unique: true, name: "sku_unique" });
productSchema.index({ "seo.slug": 1 }, { unique: true, name: "slug_unique" });
productSchema.index({ brand: 1 }, { name: "brand_index" });
productSchema.index({ vendor: 1 }, { name: "vendor_index" });
productSchema.index({ createdBy: 1 }, { name: "created_by_index" });

// Sparse indexes for optional fields
productSchema.index({ salePrice: 1 }, { sparse: true, name: "sale_price_sparse" });
productSchema.index({ stock: 1 }, { name: "stock_index" });

// Virtuals
productSchema.virtual("currentPrice").get(function () {
  return this.salePrice && this.salePrice < this.price ? this.salePrice : this.price;
});

productSchema.virtual("discountPercentage").get(function () {
  return this.salePrice && this.salePrice < this.price
    ? Math.round(((this.price - this.salePrice) / this.price) * 100)
    : 0;
});

productSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out-of-stock";
  if (this.stock <= this.lowStockThreshold) return "low-stock";
  return "in-stock";
});

productSchema.virtual("primaryImage").get(function () {
  return this.images.find((img) => img.isPrimary) || this.images[0];
});

productSchema.virtual("isOnSale").get(function () {
  return this.salePrice && this.salePrice < this.price;
});

productSchema.virtual("profitMargin").get(function () {
  if (!this.cost || !this.price) return null;
  return Math.round(((this.price - this.cost) / this.price) * 100);
});

// Pre-save hooks for optimization
productSchema.pre("save", function (next) {
  try {
    validateConfig();
    
    // Generate SKU if not provided
    if (!this.sku) {
      this.sku = generateSKU(this.name, this.category, this.brand);
    }
    
    // Generate slug if name is modified
    if (this.isModified("name")) {
      this.seo.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    
    // Update isActive based on status
    if (this.isModified("status")) {
      this.isActive = this.status === "active";
    }
    
    // Validate price and stock
    validatePrice(this.price, this.salePrice);
    validateStock(this.stock);
    
    // Validate arrays length
    if (this.images && this.images.length > productConfig.limits.maxImages) {
      throw new Error(`Cannot have more than ${productConfig.limits.maxImages} images`);
    }
    
    if (this.variants && this.variants.length > productConfig.limits.maxVariants) {
      throw new Error(`Cannot have more than ${productConfig.limits.maxVariants} variants`);
    }
    
    if (this.specifications && this.specifications.length > productConfig.limits.maxSpecifications) {
      throw new Error(`Cannot have more than ${productConfig.limits.maxSpecifications} specifications`);
    }
    
    if (this.tags && this.tags.length > productConfig.limits.maxTags) {
      throw new Error(`Cannot have more than ${productConfig.limits.maxTags} tags`);
    }
    
    // Calculate average rating if reviews changed
    if (this.isModified("reviews")) {
      this.calculateAverageRating();
    }
    
    // Update timestamps
    if (this.isModified("stock")) {
      this.lastStockUpdate = new Date();
    }
    
    if (this.isModified("price") || this.isModified("salePrice")) {
      this.lastPriceUpdate = new Date();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-find hooks for query optimization
productSchema.pre("find", function() {
  // Add default filter for active products if not explicitly specified
  if (!this._conditions.isActive && !this._conditions.status) {
    this.where({ isActive: true });
  }
});

productSchema.pre("findOne", function() {
  // Add default filter for active products if not explicitly specified
  if (!this._conditions.isActive && !this._conditions.status) {
    this.where({ isActive: true });
  }
});

// Instance Methods
productSchema.methods.calculateAverageRating = function () {
  try {
    if (!this.reviews.length) {
      this.averageRating = 0;
      this.totalReviews = 0;
    } else {
      const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
      this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10;
      this.totalReviews = this.reviews.length;
    }
    return this;
  } catch (error) {
    throw new Error(`Error calculating average rating: ${error.message}`);
  }
};

productSchema.methods.addReview = async function (userId, rating, comment) {
  try {
    if (rating < productConfig.defaults.minRating || rating > productConfig.defaults.maxRating) {
      throw new Error(`Rating must be between ${productConfig.defaults.minRating} and ${productConfig.defaults.maxRating}`);
    }
    
    const existing = this.reviews.find((r) => r.user.toString() === userId.toString());
    if (existing) {
      existing.rating = rating;
      existing.comment = sanitizeInput(comment);
    } else {
      this.reviews.push({ 
        user: userId, 
        rating, 
        comment: sanitizeInput(comment) 
      });
    }
    
    this.calculateAverageRating();
    return await this.save();
  } catch (error) {
    throw new Error(`Error adding review: ${error.message}`);
  }
};

productSchema.methods.incrementViewCount = async function () {
  try {
    this.viewCount += 1;
    return await this.save();
  } catch (error) {
    throw new Error(`Error incrementing view count: ${error.message}`);
  }
};

productSchema.methods.updateStock = async function (quantity, operation = 'set') {
  try {
    validateStock(quantity);
    
    switch (operation) {
      case 'add':
        this.stock += quantity;
        break;
      case 'subtract':
        this.stock = Math.max(0, this.stock - quantity);
        break;
      case 'set':
      default:
        this.stock = quantity;
        break;
    }
    
    this.lastStockUpdate = new Date();
    return await this.save();
  } catch (error) {
    throw new Error(`Error updating stock: ${error.message}`);
  }
};

productSchema.methods.updatePrice = async function (newPrice, newSalePrice = null) {
  try {
    validatePrice(newPrice, newSalePrice);
    
    this.price = newPrice;
    if (newSalePrice !== null) {
      this.salePrice = newSalePrice;
    }
    
    this.lastPriceUpdate = new Date();
    return await this.save();
  } catch (error) {
    throw new Error(`Error updating price: ${error.message}`);
  }
};

// OPTIMIZED STATIC METHODS

productSchema.statics.getFeatured = function (limit = 10) {
  try {
    return this.find({ 
      isActive: true, 
      featured: true, 
      status: "active" 
    })
      .select('name price images category averageRating totalReviews stock featured sku brand')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    throw new Error(`Error fetching featured products: ${error.message}`);
  }
};

productSchema.statics.searchProducts = function (query, options = {}) {
  try {
    const {
      category, minPrice, maxPrice, rating, brand,
      sort = "createdAt", page = 1, limit = 20, featured
    } = options;

    const filter = { isActive: true, status: "active" };
    
    // Text search
    if (query) {
      filter.$text = { $search: query };
    }
    
    // Filters
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (featured !== undefined) filter.featured = featured;
    
    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }
    
    // Rating filter
    if (rating) filter.averageRating = { $gte: rating };

    // Optimized sort options
    const sortOptions = {
      "price-low": { price: 1 },
      "price-high": { price: -1 },
      "rating": { averageRating: -1 },
      "popular": { totalSales: -1 },
      "views": { viewCount: -1 },
      "createdAt": { createdAt: -1 },
      "name": { name: 1 }
    };

    return this.find(filter)
      .select('name price images category averageRating totalReviews stock featured sku brand')
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  } catch (error) {
    throw new Error(`Error searching products: ${error.message}`);
  }
};

productSchema.statics.getProductsByCategory = function (category, options = {}) {
  try {
    const { page = 1, limit = 20, sort = "createdAt" } = options;
    
    const filter = { 
      isActive: true, 
      status: "active", 
      category 
    };

    const sortOptions = {
      "price-low": { price: 1 },
      "price-high": { price: -1 },
      "rating": { averageRating: -1 },
      "popular": { totalSales: -1 },
      "createdAt": { createdAt: -1 }
    };

    return this.find(filter)
      .select('name price images category averageRating totalReviews stock featured sku')
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  } catch (error) {
    throw new Error(`Error fetching products by category: ${error.message}`);
  }
};

productSchema.statics.getProductStats = function () {
  try {
    return this.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalFeatured: { $sum: { $cond: ["$featured", 1, 0] } },
          avgPrice: { $avg: "$price" },
          avgRating: { $avg: "$averageRating" },
          totalViews: { $sum: "$viewCount" },
          totalSales: { $sum: "$totalSales" }
        }
      }
    ]);
  } catch (error) {
    throw new Error(`Error fetching product stats: ${error.message}`);
  }
};

productSchema.statics.getCategories = function () {
  try {
    return this.distinct("category", { isActive: true, status: "active" });
  } catch (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }
};

productSchema.statics.getBrands = function () {
  try {
    return this.distinct("brand", { isActive: true, status: "active", brand: { $ne: null } });
  } catch (error) {
    throw new Error(`Error fetching brands: ${error.message}`);
  }
};

productSchema.statics.getLowStockProducts = function (threshold = null) {
  try {
    const stockThreshold = threshold || productConfig.defaults.lowStockThreshold;
    return this.find({
      isActive: true,
      stock: { $lte: stockThreshold },
      stock: { $gt: 0 }
    })
      .select('name sku stock lowStockThreshold')
      .sort({ stock: 1 })
      .lean();
  } catch (error) {
    throw new Error(`Error fetching low stock products: ${error.message}`);
  }
};

/**
 * Get product configuration (admin function)
 */
productSchema.statics.getConfig = () => {
  return {
    ...productConfig,
    // Don't expose sensitive config
    limits: {
      nameLength: productConfig.limits.nameLength,
      descriptionLength: productConfig.limits.descriptionLength,
      shortDescriptionLength: productConfig.limits.shortDescriptionLength,
      commentLength: productConfig.limits.commentLength,
      maxPrice: productConfig.limits.maxPrice,
      maxStock: productConfig.limits.maxStock,
      maxImages: productConfig.limits.maxImages,
      maxVariants: productConfig.limits.maxVariants,
      maxSpecifications: productConfig.limits.maxSpecifications,
      maxTags: productConfig.limits.maxTags
    }
  };
};

/**
 * Update product configuration (admin function)
 */
productSchema.statics.updateConfig = (newConfig) => {
  // Only allow updating certain fields
  const allowedUpdates = ['limits', 'defaults', 'validation'];
  
  allowedUpdates.forEach(key => {
    if (newConfig[key]) {
      productConfig[key] = { ...productConfig[key], ...newConfig[key] };
    }
  });
};

module.exports = mongoose.model("Product", productSchema);
