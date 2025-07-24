const express = require("express")
const multer = require("multer")
const Product = require("../models/Product")
const { protect, requireAdmin, moderator, optionalAuth } = require("../middleware/auth")
const { productStorage } = require("../config/cloudinary")
const CONSTANTS = require("../config/constants")

const router = express.Router()

// Configure multer for image uploads
const upload = multer({ storage: productStorage })

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = CONSTANTS.PRODUCTS_PAGE_SIZE,
      category,
      search,
      minPrice,
      maxPrice,
      rating,
      sort = "createdAt",
      featured,
      inStock,
    } = req.query

    // Build filter object
    const filter = { isActive: true }

    if (category && category !== "all") {
      filter.category = category
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ]
    }

    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }

    if (rating) {
      filter.averageRating = { $gte: Number(rating) }
    }

    if (featured === "true") {
      filter.featured = true
    }

    if (inStock === "true") {
      filter.stock = { $gt: CONSTANTS.OUT_OF_STOCK_THRESHOLD }
    }

    // Build sort object
    let sortObj = {}
    switch (sort) {
      case "price-low":
        sortObj = { price: 1 }
        break
      case "price-high":
        sortObj = { price: -1 }
        break
      case "rating":
        sortObj = { averageRating: -1 }
        break
      case "popular":
        sortObj = { totalSales: -1 }
        break
      case "name":
        sortObj = { name: 1 }
        break
      default:
        sortObj = { createdAt: -1 }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .populate("createdBy", "firstName lastName")
        .lean(),
      Product.countDocuments(filter),
    ])

    const totalPages = Math.ceil(totalCount / Number(limit))

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalCount,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR,
    })
  }
})

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const { limit = CONSTANTS.PRODUCTS_PAGE_SIZE / 2 } = req.query

    const products = await Product.find({
      featured: true,
      isActive: true,
      stock: { $gt: CONSTANTS.OUT_OF_STOCK_THRESHOLD },
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("createdBy", "firstName lastName")
      .lean()

    res.json({
      success: true,
      data: products
    })
  } catch (error) {
    console.error("Get featured products error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR,
    })
  }
})

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
router.get("/meta/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { isActive: true })
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Product.countDocuments({ category, isActive: true })
        return { name: category, count }
      }),
    )

    res.json({
      success: true,
      data: { categories: categoriesWithCount },
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("reviews.user", "name avatar")

    if (!product || !product.isActive) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND })
    }

    // Increment view count
    product.viewCount += 1
    await product.save()

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(4)
      .select("name price images rating")

    res.json({
      success: true,
      data: {
        product,
        relatedProducts,
      },
    })
  } catch (error) {
    console.error("Get product error:", error)
    if (error.name === "CastError") {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND })
    }
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin/Moderator)
router.post("/", protect, moderator, upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      description,
      shortDescription,
      price,
      salePrice,
      sku,
      category,
      subcategory,
      brand,
      tags,
      specifications,
      stock,
      lowStockThreshold,
      weight,
      dimensions,
      condition,
      featured,
      status,
    } = req.body

    // Validation
    if (!name || !description || !price || !category || !stock) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: CONSTANTS.ERROR_MESSAGES.INVALID_INPUT,
      })
    }

    // Check if SKU already exists
    if (sku) {
      const existingProduct = await Product.findOne({ sku: sku.toUpperCase() })
      if (existingProduct) {
        return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Product with this SKU already exists",
        })
      }
    }

    // Process uploaded images
    const images =
      req.files?.map((file, index) => ({
        url: file.path,
        public_id: file.filename,
        alt: `${name} image ${index + 1}`,
        isPrimary: index === 0,
      })) || []

    // Process tags (if string, convert to array)
    let processedTags = []
    if (tags) {
      processedTags = typeof tags === "string" ? tags.split(",").map((tag) => tag.trim()) : tags
    }

    // Process specifications (if string, parse JSON)
    let processedSpecs = []
    if (specifications) {
      processedSpecs = typeof specifications === "string" ? JSON.parse(specifications) : specifications
    }

    // Process dimensions (if string, parse JSON)
    let processedDimensions = {}
    if (dimensions) {
      processedDimensions = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      shortDescription,
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : undefined,
      sku: sku?.toUpperCase(),
      category,
      subcategory,
      brand,
      tags: processedTags,
      images,
      specifications: processedSpecs,
      stock: Number(stock),
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : CONSTANTS.LOW_STOCK_THRESHOLD,
      weight: weight ? Number(weight) : 0,
      dimensions: processedDimensions,
      condition: condition || "new",
      featured: featured === "true" || featured === true,
      status: status || "draft",
      createdBy: req.user._id,
    })

    await product.populate("createdBy", "firstName lastName")

    res.status(CONSTANTS.STATUS_CODES.CREATED).json({
      success: true,
      message: CONSTANTS.SUCCESS_MESSAGES.PRODUCT_CREATED,
      data: product,
    })
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while creating product",
    })
  }
})

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin/Moderator)
router.put("/:id", protect, moderator, upload.array("images", 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Process new images if uploaded
    let newImages = []
    if (req.files && req.files.length > 0) {
      newImages = req.files.map((file, index) => ({
        url: file.path,
        public_id: file.filename,
        alt: `${req.body.name || product.name} image ${index + 1}`,
        isPrimary: index === 0 && product.images.length === 0,
      }))
    }

    // Parse JSON fields
    const tags = req.body.tags ? JSON.parse(req.body.tags) : product.tags
    const specifications = req.body.specifications ? JSON.parse(req.body.specifications) : product.specifications
    const dimensions = req.body.dimensions ? JSON.parse(req.body.dimensions) : product.dimensions
    const weight = req.body.weight ? JSON.parse(req.body.weight) : product.weight

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        tags,
        specifications,
        dimensions,
        weight,
        images: newImages.length > 0 ? [...product.images, ...newImages] : product.images,
        updatedBy: req.user._id,
        price: req.body.price ? Number(req.body.price) : product.price,
        salePrice: req.body.salePrice ? Number(req.body.salePrice) : product.salePrice,
        stock: req.body.stock ? Number(req.body.stock) : product.stock,
        featured: req.body.featured !== undefined ? req.body.featured === "true" : product.featured,
      },
      { new: true, runValidators: true },
    ).populate("createdBy updatedBy", "firstName lastName")

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while updating product",
    })
  }
})

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Soft delete - just mark as inactive
    product.isActive = false
    await product.save()

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while deleting product",
    })
  }
})

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post("/:id/reviews", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find((review) => review.user.toString() === req.user._id.toString())

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" })
    }

    // Add review
    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment,
    }

    product.reviews.push(review)
    await product.save()

    // Populate the new review
    await product.populate("reviews.user", "name avatar")

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: { product },
    })
  } catch (error) {
    console.error("Add review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

