/**
 * User Model
 * Enhanced user management with configuration, validation, and security
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * User Configuration
 */
const userConfig = {
  limits: {
    maxAddresses: parseInt(process.env.USER_MAX_ADDRESSES) || 5,
    maxOrders: parseInt(process.env.USER_MAX_ORDERS) || 100,
    maxReviews: parseInt(process.env.USER_MAX_REVIEWS) || 50,
    maxCartItems: parseInt(process.env.USER_MAX_CART_ITEMS) || 50,
    usernameMinLength: parseInt(process.env.USER_USERNAME_MIN_LENGTH) || 3,
    usernameMaxLength: parseInt(process.env.USER_USERNAME_MAX_LENGTH) || 30,
    firstNameMaxLength: parseInt(process.env.USER_FIRST_NAME_MAX_LENGTH) || 50,
    lastNameMaxLength: parseInt(process.env.USER_LAST_NAME_MAX_LENGTH) || 50,
    passwordMinLength: parseInt(process.env.USER_PASSWORD_MIN_LENGTH) || 6,
    passwordMaxLength: parseInt(process.env.USER_PASSWORD_MAX_LENGTH) || 128,
    phoneMinLength: parseInt(process.env.USER_PHONE_MIN_LENGTH) || 10,
    phoneMaxLength: parseInt(process.env.USER_PHONE_MAX_LENGTH) || 15,
  },
  defaults: {
    newsletter: process.env.USER_DEFAULT_NEWSLETTER === 'true',
    emailNotifications: process.env.USER_DEFAULT_EMAIL_NOTIFICATIONS === 'true',
    smsNotifications: process.env.USER_DEFAULT_SMS_NOTIFICATIONS === 'false',
    currency: process.env.USER_DEFAULT_CURRENCY || 'INR',
    language: process.env.USER_DEFAULT_LANGUAGE || 'en',
    country: process.env.USER_DEFAULT_COUNTRY || 'India',
  },
  validation: {
    passwordMinLength: parseInt(process.env.USER_PASSWORD_MIN_LENGTH) || 6,
    passwordMaxLength: parseInt(process.env.USER_PASSWORD_MAX_LENGTH) || 128,
    nameMinLength: parseInt(process.env.USER_NAME_MIN_LENGTH) || 2,
    nameMaxLength: parseInt(process.env.USER_NAME_MAX_LENGTH) || 50,
    phoneMaxLength: parseInt(process.env.USER_PHONE_MAX_LENGTH) || 15,
    validatePasswordStrength: process.env.USER_VALIDATE_PASSWORD_STRENGTH === 'true',
    allowSpecialCharsInUsername: process.env.USER_ALLOW_SPECIAL_CHARS_IN_USERNAME === 'true',
    requirePhone: process.env.USER_REQUIRE_PHONE === 'true',
    requireEmailVerification: process.env.USER_REQUIRE_EMAIL_VERIFICATION === 'true',
  },
  security: {
    bcryptRounds: parseInt(process.env.USER_BCRYPT_ROUNDS) || 12,
    maxLoginAttempts: parseInt(process.env.USER_MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.USER_LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
    passwordResetExpiry: parseInt(process.env.USER_PASSWORD_RESET_EXPIRY) || 60 * 60 * 1000, // 1 hour
    emailVerificationExpiry: parseInt(process.env.USER_EMAIL_VERIFICATION_EXPIRY) || 24 * 60 * 60 * 1000, // 24 hours
  },
  address: {
    types: (process.env.USER_ADDRESS_TYPES || 'home,work,other').split(','),
    defaultType: process.env.USER_DEFAULT_ADDRESS_TYPE || 'home',
  },
  roles: {
    values: (process.env.USER_ROLES || 'user,admin,moderator').split(','),
    default: process.env.USER_DEFAULT_ROLE || 'user',
  }
};

/**
 * Validate configuration
 */
const validateConfig = () => {
  if (userConfig.limits.usernameMinLength <= 0) {
    throw new Error('USER_USERNAME_MIN_LENGTH must be greater than 0');
  }
  
  if (userConfig.security.bcryptRounds < 10 || userConfig.security.bcryptRounds > 14) {
    throw new Error('USER_BCRYPT_ROUNDS must be between 10 and 14');
  }
  
  if (userConfig.security.maxLoginAttempts <= 0) {
    throw new Error('USER_MAX_LOGIN_ATTEMPTS must be greater than 0');
  }
  
  if (!userConfig.address.types.includes(userConfig.address.defaultType)) {
    throw new Error('USER_DEFAULT_ADDRESS_TYPE must be in USER_ADDRESS_TYPES');
  }
  
  if (!userConfig.roles.values.includes(userConfig.roles.default)) {
    throw new Error('USER_DEFAULT_ROLE must be in USER_ROLES');
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
 * Validate password strength
 */
const validatePasswordStrength = (password) => {
  if (!userConfig.validation.validatePasswordStrength) return true;
  
  const minLength = userConfig.limits.passwordMinLength;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

/**
 * Generate secure token
 */
const generateSecureToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Address Schema
 */
const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: userConfig.address.types,
    default: userConfig.address.defaultType,
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
    set: sanitizeInput
  },
  country: {
    type: String,
    required: true,
    default: userConfig.defaults.country,
    maxlength: 100,
    set: sanitizeInput
  },
  isDefault: { type: Boolean, default: false },
  apartment: { 
    type: String,
    maxlength: 50,
    set: sanitizeInput
  },
  phone: {
    type: String,
    maxlength: userConfig.limits.phoneMaxLength,
    set: sanitizeInput
  }
}, {
  timestamps: true
});

/**
 * User Schema
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [userConfig.limits.usernameMinLength, `Username must be at least ${userConfig.limits.usernameMinLength} characters`],
      maxlength: [userConfig.limits.usernameMaxLength, `Username cannot exceed ${userConfig.limits.usernameMaxLength} characters`],
      match: [
        userConfig.validation.allowSpecialCharsInUsername 
          ? /^[a-zA-Z0-9_\-\.]+$/ 
          : /^[a-zA-Z0-9_]+$/, 
        userConfig.validation.allowSpecialCharsInUsername
          ? "Username can only contain letters, numbers, underscores, hyphens, and dots"
          : "Username can only contain letters, numbers, and underscores"
      ],
      set: sanitizeInput
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [userConfig.limits.firstNameMaxLength, `First name cannot exceed ${userConfig.limits.firstNameMaxLength} characters`],
      set: sanitizeInput
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [userConfig.limits.lastNameMaxLength, `Last name cannot exceed ${userConfig.limits.lastNameMaxLength} characters`],
      set: sanitizeInput
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
      set: sanitizeInput
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [userConfig.limits.passwordMinLength, `Password must be at least ${userConfig.limits.passwordMinLength} characters`],
      validate: {
        validator: validatePasswordStrength,
        message: 'Password must contain uppercase, lowercase, number, and special character'
      },
      select: false,
    },
    phone: {
      type: String,
      required: [userConfig.validation.requirePhone, "Phone number is required"],
      trim: true,
      minlength: [userConfig.limits.phoneMinLength, `Phone number must be at least ${userConfig.limits.phoneMinLength} characters`],
      maxlength: [userConfig.limits.phoneMaxLength, `Phone number cannot exceed ${userConfig.limits.phoneMaxLength} characters`],
      match: [/^\+?[0-9\s\-()]{7,20}$/, "Please enter a valid phone number"],
      set: sanitizeInput
    },
    avatar: {
      url: { 
        type: String,
        maxlength: 500
      },
      public_id: { 
        type: String,
        maxlength: 100
      },
    },
    role: {
      type: String,
      enum: userConfig.roles.values,
      default: userConfig.roles.default,
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: !userConfig.validation.requireEmailVerification },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: Date,
    addresses: [addressSchema],
    preferences: {
      newsletter: { type: Boolean, default: userConfig.defaults.newsletter },
      notifications: {
        email: { type: Boolean, default: userConfig.defaults.emailNotifications },
        sms: { type: Boolean, default: userConfig.defaults.smsNotifications },
        push: { type: Boolean, default: false }
      },
      currency: { type: String, default: userConfig.defaults.currency },
      language: { type: String, default: userConfig.defaults.language },
      timezone: { type: String, default: 'UTC' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          max: 999,
          default: 1,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          maxlength: 200,
          set: sanitizeInput
        }
      },
    ],
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: Date,
    
    // Additional fields
    source: { 
      type: String, 
      enum: ['web', 'mobile', 'api', 'admin', 'social'],
      default: 'web'
    },
    ipAddress: { type: String, maxlength: 45 },
    userAgent: { type: String, maxlength: 500 },
    metadata: mongoose.Schema.Types.Mixed,
    socialLogin: {
      provider: { type: String, enum: ['google', 'facebook', 'twitter', 'github'] },
      providerId: String,
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false }
    },
    profile: {
      bio: { type: String, maxlength: 500, set: sanitizeInput },
      website: { type: String, maxlength: 200 },
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] }
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      twoFactorSecret: { type: String, select: false },
      backupCodes: [{ type: String, select: false }],
      lastPasswordChange: Date,
      passwordHistory: [{ type: String, select: false }]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

userSchema.virtual("displayName").get(function () {
  return this.firstName || this.username || this.email
})

userSchema.virtual("avatarUrl").get(function () {
  if (this.avatar) {
    return this.avatar.startsWith('http') ? this.avatar : `${process.env.CLOUDINARY_URL}/${this.avatar}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.displayName)}&background=random&size=200`
})

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

userSchema.virtual("remainingLoginAttempts").get(function () {
  return Math.max(0, userConfig.security.maxLoginAttempts - this.loginAttempts)
})

userSchema.virtual("defaultAddress").get(function () {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
});

userSchema.virtual("cartItemCount").get(function () {
  return this.cart.reduce((total, item) => total + item.quantity, 0);
});

userSchema.virtual("accountAge").get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "socialLogin.provider": 1, "socialLogin.providerId": 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware
userSchema.pre("save", async function (next) {
  try {
    validateConfig();
    
    // Validate arrays length
    if (this.addresses && this.addresses.length > userConfig.limits.maxAddresses) {
      throw new Error(`Cannot have more than ${userConfig.limits.maxAddresses} addresses`);
    }
    
    if (this.cart && this.cart.length > userConfig.limits.maxCartItems) {
      throw new Error(`Cannot have more than ${userConfig.limits.maxCartItems} cart items`);
    }
    
    // Hash password if modified
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(userConfig.security.bcryptRounds);
      this.password = await bcrypt.hash(this.password, salt);
      
      // Update password history
      if (this.security && this.security.passwordHistory) {
        this.security.passwordHistory.push(this.password);
        if (this.security.passwordHistory.length > 5) {
          this.security.passwordHistory.shift();
        }
      }
      
      this.security.lastPasswordChange = new Date();
    }
    
    // Generate tokens if needed
    if (this.isNew && userConfig.validation.requireEmailVerification) {
      this.emailVerificationToken = generateSecureToken();
      this.emailVerificationExpires = new Date(Date.now() + userConfig.security.emailVerificationExpiry);
      this.isEmailVerified = false;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(`Error comparing password: ${error.message}`);
  }
};

userSchema.methods.incLoginAttempts = async function () {
  try {
    if (this.lockUntil && this.lockUntil < Date.now()) {
      return await this.updateOne({
        $unset: { lockUntil: 1 },
        $set: { loginAttempts: 1 },
      });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= userConfig.security.maxLoginAttempts && !this.isLocked) {
      updates.$set = { lockUntil: new Date(Date.now() + userConfig.security.lockoutDuration) };
    }

    return await this.updateOne(updates);
  } catch (error) {
    throw new Error(`Error incrementing login attempts: ${error.message}`);
  }
};

userSchema.methods.resetLoginAttempts = async function () {
  try {
    return await this.updateOne({
      $unset: { loginAttempts: 1, lockUntil: 1 },
    });
  } catch (error) {
    throw new Error(`Error resetting login attempts: ${error.message}`);
  }
};

userSchema.methods.generatePasswordResetToken = async function () {
  try {
    this.passwordResetToken = generateSecureToken();
    this.passwordResetExpires = new Date(Date.now() + userConfig.security.passwordResetExpiry);
    return await this.save();
  } catch (error) {
    throw new Error(`Error generating password reset token: ${error.message}`);
  }
};

userSchema.methods.resetPassword = async function (newPassword, token) {
  try {
    if (this.passwordResetToken !== token) {
      throw new Error('Invalid reset token');
    }
    
    if (this.passwordResetExpires < new Date()) {
      throw new Error('Reset token has expired');
    }
    
    this.password = newPassword;
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    
    return await this.save();
  } catch (error) {
    throw new Error(`Error resetting password: ${error.message}`);
  }
};

userSchema.methods.verifyEmail = async function (token) {
  try {
    if (this.emailVerificationToken !== token) {
      throw new Error('Invalid verification token');
    }
    
    if (this.emailVerificationExpires < new Date()) {
      throw new Error('Verification token has expired');
    }
    
    this.isEmailVerified = true;
    this.emailVerificationToken = undefined;
    this.emailVerificationExpires = undefined;
    
    return await this.save();
  } catch (error) {
    throw new Error(`Error verifying email: ${error.message}`);
  }
};

userSchema.methods.updateLastLogin = async function () {
  try {
    this.lastLogin = new Date();
    return await this.save();
  } catch (error) {
    throw new Error(`Error updating last login: ${error.message}`);
  }
};

// Cart Operations
userSchema.methods.addToCart = async function (productId, quantity = 1, notes = '') {
  try {
    if (this.cart.length >= userConfig.limits.maxCartItems) {
      throw new Error(`Cannot add more than ${userConfig.limits.maxCartItems} items to cart`);
    }
    
    const existing = this.cart.find(
      (item) => item.product.toString() === productId.toString()
    );

    if (existing) {
      existing.quantity += quantity;
      if (notes) existing.notes = notes;
    } else {
      this.cart.push({ product: productId, quantity, notes });
    }

    return await this.save();
  } catch (error) {
    throw new Error(`Error adding to cart: ${error.message}`);
  }
};

userSchema.methods.removeFromCart = async function (productId) {
  try {
    this.cart = this.cart.filter(
      (item) => item.product.toString() !== productId.toString()
    );
    return await this.save();
  } catch (error) {
    throw new Error(`Error removing from cart: ${error.message}`);
  }
};

userSchema.methods.updateCartItemQuantity = async function (productId, quantity) {
  try {
    const item = this.cart.find(
      (item) => item.product.toString() === productId.toString()
    );
    
    if (!item) {
      throw new Error('Item not found in cart');
    }
    
    if (quantity <= 0) {
      return await this.removeFromCart(productId);
    }
    
    item.quantity = quantity;
    return await this.save();
  } catch (error) {
    throw new Error(`Error updating cart item quantity: ${error.message}`);
  }
};

userSchema.methods.clearCart = async function () {
  try {
    this.cart = [];
    return await this.save();
  } catch (error) {
    throw new Error(`Error clearing cart: ${error.message}`);
  }
};

// Address Operations
userSchema.methods.addAddress = async function (addressData) {
  try {
    if (this.addresses.length >= userConfig.limits.maxAddresses) {
      throw new Error(`Cannot add more than ${userConfig.limits.maxAddresses} addresses`);
    }
    
    if (addressData.isDefault) {
      this.addresses.forEach(addr => addr.isDefault = false);
    }
    
    this.addresses.push(addressData);
    return await this.save();
  } catch (error) {
    throw new Error(`Error adding address: ${error.message}`);
  }
};

userSchema.methods.updateAddress = async function (addressId, addressData) {
  try {
    const address = this.addresses.id(addressId);
    if (!address) {
      throw new Error('Address not found');
    }
    
    if (addressData.isDefault) {
      this.addresses.forEach(addr => addr.isDefault = false);
    }
    
    Object.assign(address, addressData);
    return await this.save();
  } catch (error) {
    throw new Error(`Error updating address: ${error.message}`);
  }
};

userSchema.methods.removeAddress = async function (addressId) {
  try {
    this.addresses = this.addresses.filter(addr => addr._id.toString() !== addressId.toString());
    return await this.save();
  } catch (error) {
    throw new Error(`Error removing address: ${error.message}`);
  }
};

// Static Methods
userSchema.statics.findByEmail = function (email) {
  try {
    return this.findOne({ email: email.toLowerCase() });
  } catch (error) {
    throw new Error(`Error finding user by email: ${error.message}`);
  }
};

userSchema.statics.findByUsername = function (username) {
  try {
    return this.findOne({ username });
  } catch (error) {
    throw new Error(`Error finding user by username: ${error.message}`);
  }
};

userSchema.statics.getUserStats = async function () {
  try {
    return await this.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
          verifiedUsers: { $sum: { $cond: ["$isEmailVerified", 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } }
        }
      }
    ]);
  } catch (error) {
    throw new Error(`Error getting user stats: ${error.message}`);
  }
};

/**
 * Get user configuration (admin function)
 */
userSchema.statics.getConfig = () => {
  return {
    ...userConfig,
    // Don't expose sensitive config
    limits: {
      maxAddresses: userConfig.limits.maxAddresses,
      maxOrders: userConfig.limits.maxOrders,
      maxReviews: userConfig.limits.maxReviews
    }
  };
};

/**
 * Update user configuration (admin function)
 */
userSchema.statics.updateConfig = (newConfig) => {
  // Only allow updating certain fields
  const allowedUpdates = ['limits', 'defaults', 'validation'];
  
  allowedUpdates.forEach(key => {
    if (newConfig[key]) {
      userConfig[key] = { ...userConfig[key], ...newConfig[key] };
    }
  });
};

module.exports = mongoose.model("User", userSchema);
