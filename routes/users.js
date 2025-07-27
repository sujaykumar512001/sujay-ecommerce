const express = require("express")
const User = require("../models/User")
const Order = require("../models/Order")
const { protect, requireAdmin } = require("../middleware/auth")
const multer = require("multer")
const { storage } = require("../config/cloudinary")
const CONSTANTS = require("../config/constants")
const router = express.Router()

// Configure multer for avatar uploads
const upload = multer({ storage })

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    res.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put("/profile", protect, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const { name, phone, address } = req.body

    // Update fields
    if (name) user.name = name
    if (phone !== undefined) user.phone = phone

    // Update address
    if (address) {
      const addressData = typeof address === "string" ? JSON.parse(address) : address
      user.address = { ...user.address, ...addressData }
    }

    // Update avatar if uploaded
    if (req.file) {
      user.avatar = req.file.path
    }

    await user.save()

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
router.put("/password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password" })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" })
    }

    const user = await User.findById(req.user._id).select("+password")

    // Check current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get user orders
// @route   GET /api/users/orders
// @access  Private
router.get("/orders", protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const query = { user: req.user._id }
    if (status && status !== "all") {
      query.status = status
    }

    const skip = (page - 1) * limit
    const orders = await Order.find(query)
      .populate("orderItems.product", "name images")
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
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query

    // Build query
    const query = {}

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    if (role && role !== "all") {
      query.role = role
    }

    if (status === "active") {
      query.isActive = true
    } else if (status === "inactive") {
      query.isActive = false
    }

    const skip = (page - 1) * limit
    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))

    const totalUsers = await User.countDocuments(query)
    const totalPages = Math.ceil(totalUsers / limit)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Update user status (Admin only)
// @route   PUT /api/users/:id/status
// @access  Private (Admin)
router.put("/:id/status", protect, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.isActive = isActive
    await user.save()

    res.json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: { user },
    })
  } catch (error) {
    console.error("Update user status error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Don't allow deleting admin users
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot delete admin users" })
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

module.exports = router
