const express = require("express")
const User = require("../models/User")
const Order = require("../models/Order")
const { protect } = require("../middleware/auth")
const CONSTANTS = require("../config/constants")
const disableLayout = require("../middleware/noLayout")
const router = express.Router()

// @desc    Show login page - REDIRECT TO CLEAN VERSION
// @route   GET /users/login
// @access  Public
router.get("/login", (req, res) => {
  res.redirect("/clean/login");
})

// @desc    Show register page - REDIRECT TO CLEAN VERSION
// @route   GET /users/register
// @access  Public
router.get("/register", (req, res) => {
  res.redirect("/clean/register");
})

// @desc    Show user profile
// @route   GET /users/profile
// @access  Private
router.get("/profile", async (req, res) => {
  try {
    const user = req.session.user || req.user
    if (!user) {
      return res.redirect(`/users/login?returnUrl=${encodeURIComponent('/users/profile')}`)
    }

    const userData = await User.findById(user._id)
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(CONSTANTS.USER_RECENT_ORDERS_LIMIT)

    res.render("users/profile", {
      title: "My Profile",
      user: userData,
      orders,
    })
  } catch (error) {
    console.error("Error loading profile:", error)
    req.flash("error", CONSTANTS.ERROR_MESSAGES.PROFILE_LOAD_ERROR)
    res.redirect("/")
  }
})

// @desc    Update user profile
// @route   POST /users/profile
// @access  Private
router.post("/profile", protect, async (req, res) => {
  try {
    const { name, phone, street, city, state, zipCode, country } = req.body

    // Validate required fields
    if (!name || name.trim().length < CONSTANTS.USER_CONFIG.MIN_NAME_LENGTH) {
      req.flash("error", `Name must be at least ${CONSTANTS.USER_CONFIG.MIN_NAME_LENGTH} characters`)
      return res.redirect("/users/profile")
    }

    // Validate phone number if provided
    if (phone && phone.length > CONSTANTS.USER_CONFIG.MAX_PHONE_LENGTH) {
      req.flash("error", `Phone number must be ${CONSTANTS.USER_CONFIG.MAX_PHONE_LENGTH} characters or less`)
      return res.redirect("/users/profile")
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      req.flash("error", CONSTANTS.ERROR_MESSAGES.USER_NOT_FOUND)
      return res.redirect("/")
    }

    // Update user fields with sanitization
    user.name = name.trim()
    user.phone = phone ? phone.trim() : ""
    user.address = {
      street: street ? street.trim() : "",
      city: city ? city.trim() : "",
      state: state ? state.trim() : "",
      zipCode: zipCode ? zipCode.trim() : "",
      country: country ? country.trim() : CONSTANTS.USER_CONFIG.DEFAULT_COUNTRY,
    }

    await user.save()

    req.flash("success", CONSTANTS.SUCCESS_MESSAGES.PROFILE_UPDATED)
    res.redirect("/users/profile")
  } catch (error) {
    console.error("Error updating profile:", error)
    req.flash("error", CONSTANTS.ERROR_MESSAGES.PROFILE_UPDATE_ERROR)
    res.redirect("/users/profile")
  }
})

// @desc    Show user orders
// @route   GET /users/orders
// @access  Private
router.get("/orders", async (req, res) => {
  try {
    const user = req.session.user || req.user
    if (!user) {
      return res.redirect(`/users/login?returnUrl=${encodeURIComponent('/users/orders')}`)
    }
    
    const { page = 1, status } = req.query
    const limit = CONSTANTS.USER_ORDERS_PAGE_SIZE
    const skip = (page - 1) * limit

    // Validate page number
    const pageNum = Math.max(1, parseInt(page) || 1)

    const query = { user: user._id }
    if (status && status !== "all" && CONSTANTS.ORDER_STATUS[status.toUpperCase()]) {
      query.status = status
    }

    const orders = await Order.find(query)
      .populate("orderItems.product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / limit)

    res.render("users/orders", {
      title: "My Orders",
      user: user,
      orders: orders || [],
      currentPage: pageNum,
      totalPages: Math.max(1, totalPages),
      selectedStatus: status || "all",
    })
  } catch (error) {
    console.error("Error loading orders:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).render("error", {
      title: "Error",
      message: CONSTANTS.ERROR_MESSAGES.ORDERS_LOAD_ERROR,
      error: process.env.NODE_ENV === 'development' ? error : {}
    })
  }
})

// @desc    Show single order
// @route   GET /users/orders/:id
// @access  Private
router.get("/orders/:id", protect, async (req, res) => {
  try {
    const { id } = req.params

    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      req.flash("error", CONSTANTS.ERROR_MESSAGES.INVALID_ORDER_ID)
      return res.redirect("/users/orders")
    }

    const order = await Order.findById(id).populate("orderItems.product", "name images")

    if (!order) {
      req.flash("error", CONSTANTS.ERROR_MESSAGES.ORDER_NOT_FOUND)
      return res.redirect("/users/orders")
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      req.flash("error", CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED_ORDER_ACCESS)
      return res.redirect("/users/orders")
    }

    res.render("users/order-details", {
      title: `Order ${order.orderNumber}`,
      order,
    })
  } catch (error) {
    console.error("Error loading order:", error)
    req.flash("error", CONSTANTS.ERROR_MESSAGES.ORDER_LOAD_ERROR)
    res.redirect("/users/orders")
  }
})

module.exports = router
