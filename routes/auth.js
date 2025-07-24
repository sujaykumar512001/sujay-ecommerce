const express = require("express")
const bcrypt = require("bcryptjs")
const passport = require("passport")
const User = require("../models/User")
const { generateToken } = require("../utils/generateToken")
const { sendEmail, emailTemplates } = require("../utils/sendEmail")
const CONSTANTS = require("../config/constants")
const router = express.Router()

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: CONSTANTS.ERROR_MESSAGES.INVALID_INPUT })
    }

    if (password.length < CONSTANTS.PASSWORD_MIN_LENGTH) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: `Password must be at least ${CONSTANTS.PASSWORD_MIN_LENGTH} characters` })
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(CONSTANTS.STATUS_CODES.CONFLICT).json({ message: "User already exists with this email" })
    }

    // Generate unique username
    let username = email.split('@')[0];
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${email.split('@')[0]}${counter}`;
      counter++;
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      email: email.toLowerCase(),
      password,
    })

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: CONSTANTS.EMAIL_SUBJECTS.WELCOME,
        html: emailTemplates.welcome(user.firstName),
      })
    } catch (emailError) {
      console.error("Welcome email failed:", emailError)
    }

    // Generate token
    const token = generateToken(user._id)

    // Set user in session for web interface
    req.session.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      username: user.username
    }

    // Force session save
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
        return res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SESSION_SAVE_FAILED })
      }

    res.status(CONSTANTS.STATUS_CODES.CREATED).json({
      success: true,
      message: CONSTANTS.SUCCESS_MESSAGES.USER_REGISTERED,
      data: {
        user: {
          id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token,
      },
      })
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR })
  }
})

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: CONSTANTS.ERROR_MESSAGES.INVALID_INPUT })
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password")
    if (!user) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({ message: "Invalid credentials" })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({ message: "Account is deactivated" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({ message: "Invalid credentials" })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    // Set user in session for web interface
    req.session.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      username: user.username
    }

    // Force session save and redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
        return res.status(500).json({ message: "Session save failed" })
      }
      
      // Check if this is an AJAX request or form submission
      const isAjax = req.headers['content-type'] === 'application/json' || 
                    req.headers['x-requested-with'] === 'XMLHttpRequest'
      
      if (isAjax) {
        // AJAX request - return JSON
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token,
      },
        })
      } else {
        // Form submission - redirect to home
        res.redirect('/?message=login_success')
      }
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", require("../middleware/auth").protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist")

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          address: user.address,
          wishlist: user.wishlist,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  })
})

// Web logout route for session-based logout
router.get("/web/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('/?error=Logout failed');
    }
    res.redirect('/?success=Logged out successfully');
  });
});

// Session-based login for web interface
router.post("/web/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      req.flash("error", "Something went wrong")
      return res.redirect("/login")
    }
    if (!user) {
      req.flash("error", info.message || "Invalid credentials")
      return res.redirect("/login")
    }
    req.logIn(user, (err) => {
      if (err) {
        req.flash("error", "Login failed")
        return res.redirect("/login")
      }
      req.flash("success", `Welcome back, ${user.firstName || user.username}!`)
      const redirectUrl = req.session.returnTo || "/"
      delete req.session.returnTo
      res.redirect(redirectUrl)
    })
  })(req, res, next)
})

// Session-based register for web interface
router.post("/web/register", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validation
    if (!name || !email || !password) {
      req.flash("error", "Please provide all required fields")
      return res.redirect("/register")
    }

    if (password.length < 6) {
      req.flash("error", "Password must be at least 6 characters")
      return res.redirect("/register")
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      req.flash("error", "User already exists with this email")
      return res.redirect("/register")
    }

    // Split name into firstName and lastName
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName; // Use firstName as lastName if only one name provided

    // Generate unique username
    let username = email.split('@')[0];
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${email.split('@')[0]}${counter}`;
      counter++;
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      email: email.toLowerCase(),
      password,
    })

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: CONSTANTS.EMAIL_SUBJECTS.WELCOME,
        html: emailTemplates.welcome(user.firstName),
      })
    } catch (emailError) {
      console.error("Welcome email failed:", emailError)
    }

    req.flash("success", "Registration successful! Please log in.")
    res.redirect("/login")
  } catch (error) {
    console.error("Registration error:", error)
    req.flash("error", "Registration failed. Please try again.")
    res.redirect("/register")
  }
})

// Admin-specific login route for session-based authentication
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide email and password" 
      })
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password")
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: "Account is deactivated" 
      })
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin privileges required." 
      })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Create session
    req.logIn(user, (err) => {
      if (err) {
        console.error("Session creation error:", err)
        return res.status(500).json({ 
          success: false, 
          message: "Login failed" 
        })
      }

      // Generate token for API calls
      const token = generateToken(user._id)

      res.json({
        success: true,
        message: "Admin login successful",
        redirectUrl: "/admin/dashboard",
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          },
          token,
        },
      })
    })
  } catch (error) {
    console.error("Admin login error:", error)
    res.status(500).json({ 
      success: false, 
      message: "Server error during login" 
    })
  }
})

// Admin logout route
router.post("/admin/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err)
      return res.status(500).json({ 
        success: false, 
        message: "Logout failed" 
      })
    }
    
    res.json({
      success: true,
      message: "Admin logged out successfully",
    })
  })
})

module.exports = router
