/**
 * Review Model
 * Enhanced review management with configuration, validation, and security
 */

const mongoose = require("mongoose");

/**
 * Review Configuration
 */
const reviewConfig = {
  limits: {
    titleMinLength: parseInt(process.env.REVIEW_TITLE_MIN_LENGTH) || 5,
    titleMaxLength: parseInt(process.env.REVIEW_TITLE_MAX_LENGTH) || 100,
    commentMinLength: parseInt(process.env.REVIEW_COMMENT_MIN_LENGTH) || 10,
    commentMaxLength: parseInt(process.env.REVIEW_COMMENT_MAX_LENGTH) || 1000,
    prosConsMaxLength: parseInt(process.env.REVIEW_PROS_CONS_MAX_LENGTH) || 100,
    responseMaxLength: parseInt(process.env.REVIEW_RESPONSE_MAX_LENGTH) || 500,
    moderationNotesMaxLength: parseInt(process.env.REVIEW_MODERATION_NOTES_MAX_LENGTH) || 1000,
    maxImages: parseInt(process.env.REVIEW_MAX_IMAGES) || 5,
    maxProsCons: parseInt(process.env.REVIEW_MAX_PROS_CONS) || 10
  },
  rating: {
    min: parseInt(process.env.REVIEW_MIN_RATING) || 1,
    max: parseInt(process.env.REVIEW_MAX_RATING) || 5,
    defaultStars: parseInt(process.env.REVIEW_DEFAULT_STARS) || 5
  },
  defaults: {
    autoApprove: process.env.REVIEW_AUTO_APPROVE !== 'false',
    requireModeration: process.env.REVIEW_REQUIRE_MODERATION === 'true',
    defaultWouldRecommend: process.env.REVIEW_DEFAULT_WOULD_RECOMMEND !== 'false'
  },
  timeframes: {
    dayThreshold: parseInt(process.env.REVIEW_DAY_THRESHOLD) || 30,
    monthThreshold: parseInt(process.env.REVIEW_MONTH_THRESHOLD) || 365,
    daysInMonth: parseInt(process.env.REVIEW_DAYS_IN_MONTH) || 30,
    daysInYear: parseInt(process.env.REVIEW_DAYS_IN_YEAR) || 365
  },
  validation: {
    requireTitle: process.env.REVIEW_REQUIRE_TITLE !== 'false',
    requireComment: process.env.REVIEW_REQUIRE_COMMENT !== 'false',
    requireRating: process.env.REVIEW_REQUIRE_RATING !== 'false',
    validateImageUrls: process.env.REVIEW_VALIDATE_IMAGE_URLS !== 'false',
    allowAnonymous: process.env.REVIEW_ALLOW_ANONYMOUS === 'true'
  }
};

/**
 * Validate configuration
 */
const validateConfig = () => {
  if (reviewConfig.rating.min < 1) {
    throw new Error('REVIEW_MIN_RATING must be at least 1');
  }
  
  if (reviewConfig.rating.max < reviewConfig.rating.min) {
    throw new Error('REVIEW_MAX_RATING must be greater than REVIEW_MIN_RATING');
  }
  
  if (reviewConfig.limits.titleMinLength <= 0) {
    throw new Error('REVIEW_TITLE_MIN_LENGTH must be greater than 0');
  }
  
  if (reviewConfig.limits.commentMinLength <= 0) {
    throw new Error('REVIEW_COMMENT_MIN_LENGTH must be greater than 0');
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
 * Validate image URL
 */
const validateImageUrl = (url) => {
  if (!reviewConfig.validation.validateImageUrls) return true;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Review Schema
 */
const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: !reviewConfig.validation.allowAnonymous,
    },
    rating: {
      type: Number,
      required: [reviewConfig.validation.requireRating, "Rating is required"],
      min: [reviewConfig.rating.min, `Rating must be at least ${reviewConfig.rating.min}`],
      max: [reviewConfig.rating.max, `Rating cannot exceed ${reviewConfig.rating.max}`],
    },
    title: {
      type: String,
      required: [reviewConfig.validation.requireTitle, "Review title is required"],
      trim: true,
      minlength: [reviewConfig.limits.titleMinLength, `Title must be at least ${reviewConfig.limits.titleMinLength} characters long`],
      maxlength: [reviewConfig.limits.titleMaxLength, `Title cannot exceed ${reviewConfig.limits.titleMaxLength} characters`],
      set: sanitizeInput
    },
    comment: {
      type: String,
      required: [reviewConfig.validation.requireComment, "Review comment is required"],
      trim: true,
      minlength: [reviewConfig.limits.commentMinLength, `Comment must be at least ${reviewConfig.limits.commentMinLength} characters long`],
      maxlength: [reviewConfig.limits.commentMaxLength, `Comment cannot exceed ${reviewConfig.limits.commentMaxLength} characters`],
      set: sanitizeInput
    },
    pros: [
      {
        type: String,
        trim: true,
        maxlength: [reviewConfig.limits.prosConsMaxLength, `Each pro cannot exceed ${reviewConfig.limits.prosConsMaxLength} characters`],
        set: sanitizeInput
      },
    ],
    cons: [
      {
        type: String,
        trim: true,
        maxlength: [reviewConfig.limits.prosConsMaxLength, `Each con cannot exceed ${reviewConfig.limits.prosConsMaxLength} characters`],
        set: sanitizeInput
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
          validate: {
            validator: validateImageUrl,
            message: 'Invalid image URL format'
          }
        },
        alt: {
          type: String,
          default: "",
          maxlength: 100,
          set: sanitizeInput
        },
        order: { type: Number, default: 0 }
      },
    ],
    wouldRecommend: {
      type: Boolean,
      default: reviewConfig.defaults.defaultWouldRecommend,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    votedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        helpful: {
          type: Boolean,
          required: true,
        },
        votedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isApproved: {
      type: Boolean,
      default: reviewConfig.defaults.autoApprove,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    moderationNotes: {
      type: String,
      trim: true,
      maxlength: reviewConfig.limits.moderationNotesMaxLength,
      set: sanitizeInput
    },
    response: {
      comment: {
        type: String,
        trim: true,
        maxlength: [reviewConfig.limits.responseMaxLength, `Response cannot exceed ${reviewConfig.limits.responseMaxLength} characters`],
        set: sanitizeInput
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      respondedAt: {
        type: Date,
      },
    },
    
    // Additional fields
    source: { 
      type: String, 
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    },
    ipAddress: { type: String, maxlength: 45 },
    userAgent: { type: String, maxlength: 500 },
    metadata: mongoose.Schema.Types.Mixed,
    reported: { type: Boolean, default: false },
    reportReason: { type: String, maxlength: 200, set: sanitizeInput },
    reportCount: { type: Number, default: 0, min: 0 }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for helpfulness percentage
reviewSchema.virtual("helpfulnessPercentage").get(function () {
  if (this.totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / this.totalVotes) * 100);
});

// Virtual for review age
reviewSchema.virtual("reviewAge").get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day ago";
  if (diffDays < reviewConfig.timeframes.dayThreshold) return `${diffDays} days ago`;
  if (diffDays < reviewConfig.timeframes.monthThreshold) {
    const months = Math.floor(diffDays / reviewConfig.timeframes.daysInMonth);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(diffDays / reviewConfig.timeframes.daysInYear);
  return years === 1 ? "1 year ago" : `${years} years ago`;
});

// Virtual for star display
reviewSchema.virtual("starDisplay").get(function () {
  const fullStars = "★".repeat(this.rating);
  const emptyStars = "☆".repeat(reviewConfig.rating.defaultStars - this.rating);
  return fullStars + emptyStars;
});

// Virtual for has response
reviewSchema.virtual("hasResponse").get(function () {
  return !!(this.response && this.response.comment);
});

// Virtual for is reported
reviewSchema.virtual("isReported").get(function () {
  return this.reported && this.reportCount > 0;
});

// Virtual for review status
reviewSchema.virtual("status").get(function () {
  if (this.reported) return 'reported';
  if (!this.isApproved) return 'pending';
  if (this.isFeatured) return 'featured';
  return 'approved';
});

// Compound indexes for better performance
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });
reviewSchema.index({ verifiedPurchase: 1 });
reviewSchema.index({ helpfulVotes: -1 });
reviewSchema.index({ reported: 1 });
reviewSchema.index({ isFeatured: 1, isApproved: 1 });

// Ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Pre-save middleware
reviewSchema.pre("save", async function (next) {
  try {
    validateConfig();
    
    // Validate arrays length
    if (this.images && this.images.length > reviewConfig.limits.maxImages) {
      throw new Error(`Cannot have more than ${reviewConfig.limits.maxImages} images`);
    }
    
    if (this.pros && this.pros.length > reviewConfig.limits.maxProsCons) {
      throw new Error(`Cannot have more than ${reviewConfig.limits.maxProsCons} pros`);
    }
    
    if (this.cons && this.cons.length > reviewConfig.limits.maxProsCons) {
      throw new Error(`Cannot have more than ${reviewConfig.limits.maxProsCons} cons`);
    }
    
    // Check if this is a new review or rating has changed
    if (this.isNew || this.isModified("rating")) {
      // Update product rating
      const Product = mongoose.model("Product");
      const product = await Product.findById(this.product);
      if (product) {
        // Use the calculateAverageRating method from Product model
        product.calculateAverageRating();
        await product.save();
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Post-remove middleware
reviewSchema.post("remove", async function () {
  try {
    // Update product rating after review deletion
    const Product = mongoose.model("Product");
    const product = await Product.findById(this.product);
    if (product) {
      // Use the calculateAverageRating method from Product model
      product.calculateAverageRating();
      await product.save();
    }
  } catch (error) {
    console.error('Error updating product rating after review deletion:', error);
  }
});

// Method to vote on review helpfulness
reviewSchema.methods.voteHelpful = async function (userId, isHelpful) {
  try {
    // Check if user already voted
    const existingVote = this.votedBy.find((vote) => vote.user.toString() === userId.toString());

    if (existingVote) {
      // Update existing vote
      if (existingVote.helpful !== isHelpful) {
        if (existingVote.helpful) {
          this.helpfulVotes -= 1;
        } else {
          this.helpfulVotes += 1;
        }
        existingVote.helpful = isHelpful;
        existingVote.votedAt = new Date();
      }
    } else {
      // Add new vote
      this.votedBy.push({
        user: userId,
        helpful: isHelpful,
        votedAt: new Date(),
      });

      this.totalVotes += 1;
      if (isHelpful) {
        this.helpfulVotes += 1;
      }
    }

    return await this.save();
  } catch (error) {
    throw new Error(`Error voting on review: ${error.message}`);
  }
};

// Method to add response
reviewSchema.methods.addResponse = async function (comment, respondedBy) {
  try {
    this.response = {
      comment: sanitizeInput(comment),
      respondedBy,
      respondedAt: new Date(),
    };

    return await this.save();
  } catch (error) {
    throw new Error(`Error adding response: ${error.message}`);
  }
};

// Method to approve review
reviewSchema.methods.approve = async function () {
  try {
    this.isApproved = true;
    return await this.save();
  } catch (error) {
    throw new Error(`Error approving review: ${error.message}`);
  }
};

// Method to reject review
reviewSchema.methods.reject = async function (reason = "") {
  try {
    this.isApproved = false;
    this.moderationNotes = sanitizeInput(reason);
    return await this.save();
  } catch (error) {
    throw new Error(`Error rejecting review: ${error.message}`);
  }
};

// Method to feature review
reviewSchema.methods.feature = async function () {
  try {
    this.isFeatured = true;
    return await this.save();
  } catch (error) {
    throw new Error(`Error featuring review: ${error.message}`);
  }
};

// Method to unfeature review
reviewSchema.methods.unfeature = async function () {
  try {
    this.isFeatured = false;
    return await this.save();
  } catch (error) {
    throw new Error(`Error unfeaturing review: ${error.message}`);
  }
};

// Method to report review
reviewSchema.methods.report = async function (reason = "") {
  try {
    this.reported = true;
    this.reportReason = sanitizeInput(reason);
    this.reportCount += 1;
    return await this.save();
  } catch (error) {
    throw new Error(`Error reporting review: ${error.message}`);
  }
};

// Method to resolve report
reviewSchema.methods.resolveReport = async function () {
  try {
    this.reported = false;
    this.reportReason = "";
    return await this.save();
  } catch (error) {
    throw new Error(`Error resolving report: ${error.message}`);
  }
};

// Static method to get reviews for product
reviewSchema.statics.getProductReviews = function (productId, options = {}) {
  try {
    const query = { product: productId, isApproved: true };

    if (options.rating) {
      query.rating = options.rating;
    }

    if (options.verifiedOnly) {
      query.verifiedPurchase = true;
    }

    if (options.excludeReported) {
      query.reported = { $ne: true };
    }

    let sort = { createdAt: -1 };
    if (options.sortBy === "helpful") {
      sort = { helpfulVotes: -1, createdAt: -1 };
    } else if (options.sortBy === "rating-high") {
      sort = { rating: -1, createdAt: -1 };
    } else if (options.sortBy === "rating-low") {
      sort = { rating: 1, createdAt: -1 };
    }

    return this.find(query)
      .populate("user", "name avatar")
      .populate("response.respondedBy", "name role")
      .sort(sort)
      .limit(options.limit || 10)
      .skip(options.skip || 0);
  } catch (error) {
    throw new Error(`Error fetching product reviews: ${error.message}`);
  }
};

// Static method to get review statistics for product
reviewSchema.statics.getProductReviewStats = async function (productId) {
  try {
         const stats = await this.aggregate([
       { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const totalReviews = await this.countDocuments({
      product: productId,
      isApproved: true,
    });

    const ratingDistribution = {};
    
    // Initialize all possible ratings
    for (let i = reviewConfig.rating.min; i <= reviewConfig.rating.max; i++) {
      ratingDistribution[i] = 0;
    }

    stats.forEach((stat) => {
      ratingDistribution[stat._id] = stat.count;
    });

    // Calculate percentages
    Object.keys(ratingDistribution).forEach((rating) => {
      ratingDistribution[rating] = {
        count: ratingDistribution[rating],
        percentage: totalReviews > 0 ? Math.round((ratingDistribution[rating] / totalReviews) * 100) : 0,
      };
    });

    return {
      totalReviews,
      ratingDistribution,
    };
  } catch (error) {
    throw new Error(`Error fetching review stats: ${error.message}`);
  }
};

// Static method to get featured reviews
reviewSchema.statics.getFeaturedReviews = function (limit = 5) {
  try {
    return this.find({ isFeatured: true, isApproved: true })
      .populate("user", "name avatar")
      .populate("product", "name images")
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Error fetching featured reviews: ${error.message}`);
  }
};

// Static method to get reviews pending approval
reviewSchema.statics.getPendingReviews = function () {
  try {
    return this.find({ isApproved: false })
      .populate("user", "name email")
      .populate("product", "name")
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Error fetching pending reviews: ${error.message}`);
  }
};

// Static method to get reported reviews
reviewSchema.statics.getReportedReviews = function () {
  try {
    return this.find({ reported: true })
      .populate("user", "name email")
      .populate("product", "name")
      .sort({ reportCount: -1, createdAt: -1 });
  } catch (error) {
    throw new Error(`Error fetching reported reviews: ${error.message}`);
  }
};

// Static method to get user reviews
reviewSchema.statics.getUserReviews = function (userId, options = {}) {
  try {
    const query = { user: userId };

    if (options.productId) {
      query.product = options.productId;
    }

    if (options.approvedOnly) {
      query.isApproved = true;
    }

    return this.find(query)
      .populate("product", "name images")
      .sort({ createdAt: -1 })
      .limit(options.limit || 10)
      .skip(options.skip || 0);
  } catch (error) {
    throw new Error(`Error fetching user reviews: ${error.message}`);
  }
};

// Static method to get review analytics
reviewSchema.statics.getReviewAnalytics = async function (options = {}) {
  try {
    const { startDate, endDate, productId } = options;
    
    const matchStage = { isApproved: true };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
         if (productId) {
       matchStage.product = new mongoose.Types.ObjectId(productId);
     }

    const analytics = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          totalVotes: { $sum: "$totalVotes" },
          totalHelpfulVotes: { $sum: "$helpfulVotes" },
          verifiedReviews: { $sum: { $cond: ["$verifiedPurchase", 1, 0] } },
          featuredReviews: { $sum: { $cond: ["$isFeatured", 1, 0] } }
        }
      }
    ]);

    return analytics[0] || {
      totalReviews: 0,
      avgRating: 0,
      totalVotes: 0,
      totalHelpfulVotes: 0,
      verifiedReviews: 0,
      featuredReviews: 0
    };
  } catch (error) {
    throw new Error(`Error fetching review analytics: ${error.message}`);
  }
};

/**
 * Get review configuration (admin function)
 */
reviewSchema.statics.getConfig = () => {
  return {
    ...reviewConfig,
    // Don't expose sensitive config
    limits: {
      titleMinLength: reviewConfig.limits.titleMinLength,
      titleMaxLength: reviewConfig.limits.titleMaxLength,
      commentMinLength: reviewConfig.limits.commentMinLength,
      commentMaxLength: reviewConfig.limits.commentMaxLength,
      prosConsMaxLength: reviewConfig.limits.prosConsMaxLength,
      responseMaxLength: reviewConfig.limits.responseMaxLength,
      maxImages: reviewConfig.limits.maxImages,
      maxProsCons: reviewConfig.limits.maxProsCons
    }
  };
};

/**
 * Update review configuration (admin function)
 */
reviewSchema.statics.updateConfig = (newConfig) => {
  // Only allow updating certain fields
  const allowedUpdates = ['limits', 'defaults', 'validation'];
  
  allowedUpdates.forEach(key => {
    if (newConfig[key]) {
      reviewConfig[key] = { ...reviewConfig[key], ...newConfig[key] };
    }
  });
};

module.exports = mongoose.model("Review", reviewSchema);
