const express = require("express")
const User = require("../models/User")
const Product = require("../models/Product")
const Order = require("../models/Order")
const Review = require("../models/Review")
const { protect, requireAdmin } = require("../middleware/auth")
const { upload, isCloudinaryConfigured } = require("../config/cloudinary")
const CONSTANTS = require("../config/constants")
const router = express.Router()

// ==================== DASHBOARD & STATS ====================

// @desc    Get admin dashboard
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
router.get("/dashboard", protect, requireAdmin, async (req, res) => {
  try {
    // Redirect to stats endpoint for dashboard data
    res.redirect("/api/admin/stats")
  } catch (error) {
    console.error("Dashboard error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
router.get("/stats", protect, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, activeProducts] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Product.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
    ])

    const revenueData = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          averageOrderValue: { $avg: "$totalPrice" },
        },
      },
    ])

    const totalRevenue = revenueData[0]?.totalRevenue || 0
    const averageOrderValue = revenueData[0]?.averageOrderValue || 0

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          status: { $nin: ["cancelled"] },
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ])

    const topProducts = await Product.find({ isActive: true })
      .sort({ soldCount: -1 })
      .limit(CONSTANTS.ADMIN_PAGE_SIZE / 2) // Top 5 products
      .select("name soldCount price images")

    const recentOrders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(CONSTANTS.ADMIN_PAGE_SIZE) // Recent 10 orders
      .select("orderNumber user totalPrice status createdAt")

    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30) // TODO: Use CONSTANTS.ANALYTICS_PERIODS.MONTH

    const newUsersCount = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      role: "user",
    })

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProducts,
          activeProducts,
          totalOrders,
          totalRevenue,
          averageOrderValue,
          newUsersCount,
        },
        charts: {
          monthlyRevenue,
          orderStatusStats,
        },
        topProducts,
        recentOrders,
      },
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// ==================== USER MANAGEMENT ====================

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private (Admin)
router.get("/users", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.ADMIN_PAGE_SIZE, search, role, status } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ]
    }
    if (role && role !== "all") {
      query.role = role
    }
    if (status && status !== "all") {
      query.isActive = status === "active"
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const totalUsers = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
        },
      },
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get single user (admin)
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
router.get("/users/:id", protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("orders")
      .populate("reviews")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Update user (admin)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
router.put("/users/:id", protect, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, role, isActive, phone, address } = req.body

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update fields
    if (firstName) user.firstName = firstName
    if (lastName) user.lastName = lastName
    if (email) user.email = email.toLowerCase()
    if (role) user.role = role
    if (typeof isActive === "boolean") user.isActive = isActive
    if (phone) user.phone = phone
    if (address) user.address = address

    await user.save()

    res.json({
      success: true,
      message: "User updated successfully",
      data: { user },
    })
  } catch (error) {
    console.error("Update user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
router.delete("/users/:id", protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if user has orders
    const userOrders = await Order.find({ user: req.params.id })
    if (userOrders.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete user with existing orders. Deactivate instead." 
      })
    }

    await User.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Bulk update users
// @route   PUT /api/admin/users/bulk-update
// @access  Private (Admin)
router.put("/users/bulk-update", protect, requireAdmin, async (req, res) => {
  try {
    const { userIds, updates } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Please provide user IDs" })
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updates }
    )

    res.json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      data: { modifiedCount: result.modifiedCount },
    })
  } catch (error) {
    console.error("Bulk update users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ==================== PRODUCT MANAGEMENT ====================

// @desc    Get all products (admin)
// @route   GET /api/admin/products
// @access  Private (Admin)
router.get("/products", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.ADMIN_PAGE_SIZE, search, category, status, stock } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ]
    }
    if (category && category !== "all") {
      query.category = category
    }
    if (status && status !== "all") {
      query.isActive = status === "active"
    }
    if (stock) {
      switch (stock) {
        case "in_stock":
          query.stock = { $gt: CONSTANTS.LOW_STOCK_THRESHOLD }
          break
        case "low_stock":
          query.stock = { $gt: CONSTANTS.OUT_OF_STOCK_THRESHOLD, $lte: CONSTANTS.LOW_STOCK_THRESHOLD }
          break
        case "out_of_stock":
          query.stock = { $lte: CONSTANTS.OUT_OF_STOCK_THRESHOLD }
          break
      }
    }

    const products = await Product.find(query)
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const totalProducts = await Product.countDocuments(query)
    const categories = await Product.distinct("category")

    res.json({
      success: true,
      data: {
        products,
        categories,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
        },
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get single product (admin)
// @route   GET /api/admin/products/:id
// @access  Private (Admin)
router.get("/products/:id", protect, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("createdBy", "firstName lastName")
      .populate("reviews")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json({
      success: true,
      data: { product },
    })
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Create product (admin)
// @route   POST /api/admin/products
// @access  Private (Admin)
router.post("/products", protect, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      sku,
      brand,
      weight,
      dimensions,
      tags,
      isActive = true,
    } = req.body

    // Validation
    if (!name || !description || !price || !category || stock === undefined) {
      return res.status(400).json({ 
        message: "Please provide name, description, price, category, and stock" 
      })
    }

    // Ensure stock and price are valid numbers
    const stockNumber = parseInt(stock) || 0;
    const priceNumber = parseFloat(price) || 0;

    if (stockNumber < 0) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ 
        message: "Stock cannot be negative" 
      })
    }

    if (priceNumber < 0) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ 
        message: "Price cannot be negative" 
      })
    }

    // Generate SKU if not provided
    let productSku = sku
    if (!productSku) {
      const timestamp = Date.now().toString().slice(-6)
      const categoryCode = category.substring(0, 3).toUpperCase()
      productSku = `${categoryCode}${timestamp}`
    }

    // Process uploaded images
    let images = []
    if (req.files && req.files.length > 0) {
      images = req.files.map((file, index) => {
        if (isCloudinaryConfigured) {
          // Cloudinary storage
          return {
            url: file.path,
            public_id: file.filename,
            alt: `${name} - Image ${index + 1}`,
            isPrimary: index === 0 // First image is primary
          }
        } else {
          // Local storage
          return {
            url: `/uploads/products/${file.filename}`,
            public_id: file.filename,
            alt: `${name} - Image ${index + 1}`,
            isPrimary: index === 0 // First image is primary
          }
        }
      })
    }

    const product = await Product.create({
      name,
      description,
      price: priceNumber,
      category,
      stock: stockNumber,
      images,
      sku: productSku,
      brand,
      weight,
      dimensions,
      tags: tags || [],
      isActive,
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { product },
    })
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Update product (admin)
// @route   PUT /api/admin/products/:id
// @access  Private (Admin)
router.put("/products/:id", protect, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      sku,
      brand,
      weight,
      dimensions,
      tags,
      isActive,
    } = req.body

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Update fields
    if (name) product.name = name
    if (description) product.description = description
    if (price !== undefined) product.price = parseFloat(price) || 0; // Ensure price is a number
    if (category) product.category = category
    if (stock !== undefined) product.stock = parseInt(stock) || 0; // Ensure stock is a number
    if (sku) product.sku = sku
    if (brand) product.brand = brand
    if (weight) product.weight = weight
    if (dimensions) product.dimensions = dimensions
    if (tags) product.tags = tags
    if (typeof isActive === "boolean") product.isActive = isActive

    // Process uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => {
        if (isCloudinaryConfigured) {
          // Cloudinary storage
          return {
            url: file.path,
            public_id: file.filename,
            alt: `${product.name} - Image ${index + 1}`,
            isPrimary: index === 0
          }
        } else {
          // Local storage
          return {
            url: `/uploads/products/${file.filename}`,
            public_id: file.filename,
            alt: `${product.name} - Image ${index + 1}`,
            isPrimary: index === 0
          }
        }
      })
      
      // Add new images to existing ones
      product.images = [...product.images, ...newImages]
    }

    await product.save()

    res.json({
      success: true,
      message: "Product updated successfully",
      data: { product },
    })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Delete product (admin)
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
router.delete("/products/:id", protect, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Check if product has orders
    const productOrders = await Order.find({
      "orderItems.product": req.params.id,
    })
    if (productOrders.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete product with existing orders. Deactivate instead." 
      })
    }

    await Product.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Bulk update product status
// @route   PUT /api/admin/products/bulk-status
// @access  Private (Admin)
router.put("/products/bulk-status", protect, requireAdmin, async (req, res) => {
  try {
    const { productIds, isActive } = req.body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "Please provide product IDs" })
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { isActive }
    )

    res.json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`,
      data: { modifiedCount: result.modifiedCount },
    })
  } catch (error) {
    console.error("Bulk update products error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ==================== ORDER MANAGEMENT ====================

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private (Admin)
router.get("/orders", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.ADMIN_PAGE_SIZE, status, search, dateFrom, dateTo } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (status && status !== "all") {
      query.status = status
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "user.firstName": { $regex: search, $options: "i" } },
        { "user.lastName": { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
      ]
    }
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) query.createdAt.$lte = new Date(dateTo)
    }

    const orders = await Order.find(query)
      .populate("user", "firstName lastName email")
      .populate("orderItems.product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const totalOrders = await Order.countDocuments(query)

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
        },
      },
    })
  } catch (error) {
    console.error("Get orders error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get single order (admin)
// @route   GET /api/admin/orders/:id
// @access  Private (Admin)
router.get("/orders/:id", protect, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "firstName lastName email phone address")
      .populate("orderItems.product", "name images sku")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json({
      success: true,
      data: { order },
    })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Update order status (admin)
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin)
router.put("/orders/:id/status", protect, requireAdmin, async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body

    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update status
    order.status = status
    if (trackingNumber) order.trackingNumber = trackingNumber
    if (notes) order.adminNotes = notes

    // Update delivery status based on order status
    if (status === "delivered") {
      order.isDelivered = true
      order.deliveredAt = new Date()
    } else if (status === "shipped") {
      order.isShipped = true
      order.shippedAt = new Date()
    }

    await order.save()

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: { order },
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Cancel order (admin)
// @route   PUT /api/admin/orders/:id/cancel
// @access  Private (Admin)
router.put("/orders/:id/cancel", protect, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body

    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" })
    }

    order.status = "cancelled"
    order.cancelledAt = new Date()
    order.cancelReason = reason

    await order.save()

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: { order },
    })
  } catch (error) {
    console.error("Cancel order error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ==================== REVIEW MANAGEMENT ====================

// @desc    Get all reviews (admin)
// @route   GET /api/admin/reviews
// @access  Private (Admin)
router.get("/reviews", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.REVIEWS_PAGE_SIZE, rating, status } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (rating && rating !== "all") {
      query.rating = Number(rating)
    }
    if (status && status !== "all") {
      query.isApproved = status === "approved"
    }

    const reviews = await Review.find(query)
      .populate("user", "firstName lastName")
      .populate("product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const totalReviews = await Review.countDocuments(query)

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
        },
      },
    })
  } catch (error) {
    console.error("Get reviews error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Approve/Reject review (admin)
// @route   PUT /api/admin/reviews/:id/approve
// @access  Private (Admin)
router.put("/reviews/:id/approve", protect, requireAdmin, async (req, res) => {
  try {
    const { isApproved, adminNotes } = req.body

    const review = await Review.findById(req.params.id)
    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    review.isApproved = isApproved
    if (adminNotes) review.adminNotes = adminNotes
    review.modifiedBy = req.user._id
    review.modifiedAt = new Date()

    await review.save()

    res.json({
      success: true,
      message: `Review ${isApproved ? "approved" : "rejected"} successfully`,
      data: { review },
    })
  } catch (error) {
    console.error("Approve review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Delete review (admin)
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin)
router.delete("/reviews/:id", protect, requireAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    await Review.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ==================== ANALYTICS & REPORTS ====================

// @desc    Get sales analytics
// @route   GET /api/admin/analytics/sales
// @access  Private (Admin)
router.get("/analytics/sales", protect, requireAdmin, async (req, res) => {
  try {
    const { period = "month" } = req.query

    let dateRange = {}
    let groupBy = {}

    switch (period) {
      case "week":
        dateRange = {
          $gte: new Date(Date.now() - CONSTANTS.ANALYTICS_PERIODS.WEEK),
        }
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        }
        break
      case "month":
        dateRange = {
          $gte: new Date(Date.now() - CONSTANTS.ANALYTICS_PERIODS.MONTH),
        }
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        }
        break
      case "year":
        dateRange = {
          $gte: new Date(Date.now() - CONSTANTS.ANALYTICS_PERIODS.YEAR),
        }
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        }
        break
      default:
        dateRange = {
          $gte: new Date(Date.now() - CONSTANTS.ANALYTICS_PERIODS.MONTH),
        }
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        }
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          status: { $nin: ["cancelled"] },
          createdAt: dateRange,
        },
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
          averageOrderValue: { $avg: "$totalPrice" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ])

    const categoryPerformance = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          status: { $nin: ["cancelled"] },
          createdAt: dateRange,
        },
      },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          quantity: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ])

    res.json({
      success: true,
      data: {
        salesData,
        categoryPerformance,
        period,
      },
    })
  } catch (error) {
    console.error("Get sales analytics error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get inventory alerts
// @route   GET /api/admin/inventory/alerts
// @access  Private (Admin)
router.get("/inventory/alerts", protect, requireAdmin, async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      isActive: true,
      stock: { $lte: CONSTANTS.LOW_STOCK_THRESHOLD, $gt: CONSTANTS.OUT_OF_STOCK_THRESHOLD },
    })
      .select("name stock category price")
      .sort({ stock: 1 })

    const outOfStockProducts = await Product.find({
      isActive: true,
      stock: CONSTANTS.OUT_OF_STOCK_THRESHOLD,
    })
      .select("name category price")
      .sort({ name: 1 })

    const noImageProducts = await Product.find({
      isActive: true,
      $or: [{ images: { $size: 0 } }, { images: { $exists: false } }],
    })
      .select("name category")
      .sort({ name: 1 })

    res.json({
      success: true,
      data: {
        lowStockProducts,
        outOfStockProducts,
        noImageProducts,
        alerts: {
          lowStock: lowStockProducts.length,
          outOfStock: outOfStockProducts.length,
          noImages: noImageProducts.length,
        },
      },
    })
  } catch (error) {
    console.error("Get inventory alerts error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ==================== EXPORT & UTILITIES ====================

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private (Admin)
router.get("/export/:type", protect, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params
    const { startDate, endDate } = req.query

    let data = []
    let filename = ""

    const dateFilter = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    switch (type) {
      case "orders":
        data = await Order.find(dateFilter)
          .populate("user", "firstName lastName email")
          .populate("orderItems.product", "name")
          .select("orderNumber user totalPrice status isPaid isDelivered createdAt")
          .sort({ createdAt: -1 })
        filename = "orders-export.json"
        break

      case "products":
        data = await Product.find(dateFilter)
          .select("name category price stock soldCount rating isActive createdAt")
          .sort({ createdAt: -1 })
        filename = "products-export.json"
        break

      case "users":
        data = await User.find({ ...dateFilter, role: "user" })
          .select("firstName lastName email role isActive emailVerified createdAt lastLogin")
          .sort({ createdAt: -1 })
        filename = "users-export.json"
        break

      case "reviews":
        data = await Review.find(dateFilter)
          .populate("user", "firstName lastName")
          .populate("product", "name")
          .select("rating comment isApproved createdAt")
          .sort({ createdAt: -1 })
        filename = "reviews-export.json"
        break

      default:
        return res.status(400).json({ message: "Invalid export type" })
    }

    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)
    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      type,
      count: data.length,
      data,
    })
  } catch (error) {
    console.error("Export data error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get system health
// @route   GET /api/admin/health
// @access  Private (Admin)
router.get("/health", protect, requireAdmin, async (req, res) => {
  try {
    const mongoose = require("mongoose")
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    
    const stats = {
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    }

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error("Health check error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
