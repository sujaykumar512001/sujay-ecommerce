const express = require("express")
const Order = require("../models/Order")
const Product = require("../models/Product")
const User = require("../models/User")
const { protect, requireAdmin } = require("../middleware/auth")
const { sendEmail, emailTemplates } = require("../utils/sendEmail")
const CONSTANTS = require("../config/constants")
const router = express.Router()

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, paymentResult } = req.body

    if (!orderItems || orderItems.length === 0) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: "No order items provided" })
    }

    // Validate and get product details
    const validatedItems = []
    for (const item of orderItems) {
      const product = await Product.findById(item.product)
      if (!product) {
        return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: `Product not found: ${item.product}` })
      }

      if (product.stock < item.quantity) {
        return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: `Insufficient stock for ${product.name}` })
      }

      validatedItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || "",
        price: product.price,
        quantity: item.quantity,
      })
    }

    // Create order
    const order = new Order({
      user: req.user._id,
      orderItems: validatedItems,
      shippingAddress,
      paymentMethod,
      paymentResult,
    })

    // Calculate prices
    order.calculatePrices()

    // Save order
    const createdOrder = await order.save()

    // Update product stock and sold count
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: -item.quantity,
          soldCount: item.quantity,
        },
      })
    }

    // Send order confirmation email
    try {
      await sendEmail({
        email: req.user.email,
        subject: "Order Confirmation",
        html: emailTemplates.orderConfirmation(createdOrder),
      })
    } catch (emailError) {
      console.error("Order confirmation email failed:", emailError)
    }

    res.status(CONSTANTS.STATUS_CODES.CREATED).json({
      success: true,
      message: "Order created successfully",
      data: { order: createdOrder },
    })
  } catch (error) {
    console.error("Create order error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name images")

    if (!order) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND })
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(CONSTANTS.STATUS_CODES.FORBIDDEN).json({ message: CONSTANTS.ERROR_MESSAGES.FORBIDDEN })
    }

    res.json({
      success: true,
      data: { order },
    })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
router.put("/:id/pay", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND })
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(CONSTANTS.STATUS_CODES.FORBIDDEN).json({ message: CONSTANTS.ERROR_MESSAGES.FORBIDDEN })
    }

    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    }

    const updatedOrder = await order.save()

    res.json({
      success: true,
      message: "Order marked as paid",
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error("Update order payment error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Update order to delivered (Admin only)
// @route   PUT /api/orders/:id/deliver
// @access  Private (Admin)
router.put("/:id/deliver", protect, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    order.isDelivered = true
    order.deliveredAt = Date.now()
    order.status = "delivered"

    const updatedOrder = await order.save()

    res.json({
      success: true,
      message: "Order marked as delivered",
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error("Update order delivery error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
router.put("/:id/status", protect, requireAdmin, async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    order.status = status
    if (trackingNumber) order.trackingNumber = trackingNumber
    if (notes) order.notes = notes

    // Update delivery status based on order status
    if (status === "delivered") {
      order.isDelivered = true
      order.deliveredAt = Date.now()
    }

    const updatedOrder = await order.save()

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private (Admin)
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.ADMIN_PAGE_SIZE, status, search } = req.query

    // Build query
    const query = {}

    if (status && status !== "all") {
      query.status = status
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.firstName": { $regex: search, $options: "i" } },
        { "shippingAddress.lastName": { $regex: search, $options: "i" } },
        { "shippingAddress.email": { $regex: search, $options: "i" } },
      ]
    }

    const skip = (page - 1) * limit
    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("orderItems.product", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / limit)

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    })
  } catch (error) {
    console.error("Get orders error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND })
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(CONSTANTS.STATUS_CODES.FORBIDDEN).json({ message: CONSTANTS.ERROR_MESSAGES.FORBIDDEN })
    }

    // Check if order can be cancelled
    if (order.status === "delivered" || order.status === "cancelled") {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: "Order cannot be cancelled" })
    }

    // Restore product stock
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: item.quantity,
          soldCount: -item.quantity,
        },
      })
    }

    order.status = "cancelled"
    const updatedOrder = await order.save()

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error("Cancel order error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

module.exports = router
