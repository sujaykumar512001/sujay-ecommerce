const express = require("express")
const Product = require("../models/Product")
const mongoose = require("mongoose")
const { protect, requireAdmin, moderator } = require("../middleware/auth")
const CONSTANTS = require("../config/constants")

const router = express.Router()

// @desc    Get all reviews (admin only)
// @route   GET /api/reviews
// @access  Private (Admin)
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.REVIEWS_PAGE_SIZE, productId, rating } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (productId) {
      query._id = productId
    }

    const products = await Product.find(query)
      .populate("reviews.user", "name email")
      .select("name reviews")
      .sort({ "reviews.createdAt": -1 })
      .skip(skip)
      .limit(Number(limit))

    // Flatten reviews from all products
    const allReviews = []
    products.forEach(product => {
      product.reviews.forEach(review => {
        if (!rating || review.rating === Number(rating)) {
          allReviews.push({
            ...review.toObject(),
            productName: product.name,
            productId: product._id
          })
        }
      })
    })

    const totalReviews = allReviews.length

    res.json({
      success: true,
      data: {
        reviews: allReviews,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
        },
      },
    })
  } catch (error) {
    console.error("Get all reviews error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
router.get("/product/:productId", async (req, res) => {
  try {
    const { page = 1, limit = CONSTANTS.REVIEWS_PAGE_SIZE, sort = "createdAt" } = req.query

    const product = await Product.findById(req.params.productId).populate("reviews.user", "name avatar")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Sort reviews
    const sortedReviews = [...product.reviews]
    switch (sort) {
      case "rating-high":
        sortedReviews.sort((a, b) => b.rating - a.rating)
        break
      case "rating-low":
        sortedReviews.sort((a, b) => a.rating - b.rating)
        break
      case "newest":
        sortedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case "oldest":
        sortedReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      default:
        sortedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    // Pagination
    const skip = (page - 1) * limit
    const paginatedReviews = sortedReviews.slice(skip, skip + Number(limit))
    const totalReviews = sortedReviews.length
    const totalPages = Math.ceil(totalReviews / limit)

    // Calculate rating distribution
    const ratingDistribution = {
      5: sortedReviews.filter((r) => r.rating === 5).length,
      4: sortedReviews.filter((r) => r.rating === 4).length,
      3: sortedReviews.filter((r) => r.rating === 3).length,
      2: sortedReviews.filter((r) => r.rating === 2).length,
      1: sortedReviews.filter((r) => r.rating === 1).length,
    }

    res.json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalReviews,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        summary: {
          averageRating: product.rating,
          totalReviews: product.numReviews,
          ratingDistribution,
        },
      },
    })
  } catch (error) {
    console.error("Get reviews error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Add a review
// @route   POST /api/reviews/product/:productId
// @access  Private
router.post("/product/:productId", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body

    if (!rating || !comment) {
      return res.status(400).json({ message: "Please provide rating and comment" })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    const product = await Product.findById(req.params.productId)

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

    // Get the newly added review
    const newReview = product.reviews[product.reviews.length - 1]

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: { review: newReview },
    })
  } catch (error) {
    console.error("Add review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Update a review
// @route   PUT /api/reviews/:reviewId
// @access  Private
router.put("/:reviewId", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body
    const { reviewId } = req.params

    if (!rating || !comment) {
      return res.status(400).json({ message: "Please provide rating and comment" })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    // Find product with the review
    const product = await Product.findOne({ "reviews._id": reviewId })

    if (!product) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Find the specific review
    const review = product.reviews.id(reviewId)

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Check if user owns this review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this review" })
    }

    // Update review
    review.rating = Number(rating)
    review.comment = comment

    await product.save()

    res.json({
      success: true,
      message: "Review updated successfully",
      data: { review },
    })
  } catch (error) {
    console.error("Update review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private
router.delete("/:reviewId", protect, async (req, res) => {
  try {
    const { reviewId } = req.params

    // Find product with the review
    const product = await Product.findOne({ "reviews._id": reviewId })

    if (!product) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Find the specific review
    const review = product.reviews.id(reviewId)

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Check if user owns this review or is admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this review" })
    }

    // Remove review
    product.reviews.pull(reviewId)
    await product.save()

    res.json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete review error:", error)
    res.status(500).json({ message: "Server error" })
  }
})



module.exports = router
