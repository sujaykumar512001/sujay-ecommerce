const express = require("express")
const bcrypt = require("bcryptjs")
const passport = require("passport")
const User = require("../models/User")
const { generateToken } = require("../utils/generateToken")
const { sendEmail, emailTemplates } = require("../utils/sendEmail")
const CONSTANTS = require("../config/constants")
const router = express.Router()
const jwt = require("jsonwebtoken")

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
      fullName: `${user.firstName} ${user.lastName}`,
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
            fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        },
        token,
      },
      })
    })
  } catch (error) {
    console.error("Registration error:", error)
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(CONSTANTS.STATUS_CODES.CONFLICT).json({ 
        message: "User already exists with this email" 
      });
    }
    
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
      fullName: `${user.firstName} ${user.lastName}`,
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
              fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        },
        token,
      },
        })
      } else {
        // Form submission - redirect to user profile
        res.redirect('/users/profile?message=login_success')
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
    const user = await User.findById(req.user._id)

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
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      res.json({
        success: true,
        message: "Logged out successfully",
      })
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Server error during logout" })
  }
})

// @desc    Logout user (GET method for compatibility)
// @route   GET /api/auth/logout
// @access  Private
router.get("/logout", (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      res.json({
        success: true,
        message: "Logged out successfully",
      })
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Server error during logout" })
  }
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
      // Redirect to user profile instead of home page
      const redirectUrl = req.session.returnTo || "/users/profile"
      delete req.session.returnTo
      res.redirect(redirectUrl)
    })
  })(req, res, next)
})

// Session-based register for web interface
router.post("/web/register", async (req, res) => {
  try {
    console.log("Full request body:", req.body)
    console.log("Request headers:", req.headers['content-type'])
    console.log("Request method:", req.method)
    
    const { firstName, lastName, email, password } = req.body
    
    console.log("Registration attempt:", { firstName, lastName, email, password: password ? "***" : "missing" })

    // Validation
    if (!firstName || !lastName || !email || !password) {
      console.log("Validation failed: missing fields")
      console.log("FirstName:", firstName, "LastName:", lastName, "Email:", email, "Password:", password ? "present" : "missing")
      req.flash("error", "Please provide all required fields")
      return res.redirect("/clean/register")
    }

    if (password.length < 6) {
      console.log("Validation failed: password too short")
      req.flash("error", "Password must be at least 6 characters")
      return res.redirect("/clean/register")
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      console.log("User already exists:", email)
      req.flash("error", "User already exists with this email")
      return res.redirect("/clean/register")
    }

    console.log("Creating new user...")

    // Generate unique username
    let username = email.split('@')[0];
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${email.split('@')[0]}${counter}`;
      counter++;
    }

    // Create user
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username,
      email: email.toLowerCase(),
      password,
    })

    console.log("User created successfully:", user._id)

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

    // Auto-login after registration
    req.logIn(user, (err) => {
      if (err) {
        console.log("Auto-login failed:", err.message)
        req.flash("error", "Registration successful but auto-login failed. Please log in manually.")
        return res.redirect("/clean/login")
      }
      console.log("Auto-login successful, redirecting to home page")
      req.flash("success", `Welcome to Yadav Collection, ${user.firstName}!`)
      res.redirect("/")
    })
  } catch (error) {
    console.error("Registration error:", error)
    req.flash("error", "Registration failed. Please try again.")
    res.redirect("/clean/register")
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

// Session check endpoint for keep-alive
router.get("/session-check", (req, res) => {
  if (req.isAuthenticated() || (req.session && req.session.user)) {
    // Refresh session
    if (req.session) {
      req.session.touch();
      req.session.save((err) => {
        if (err) {
          console.error('Session save error in session-check:', err);
        }
      });
    }
    res.json({ 
      success: true, 
      authenticated: true,
      user: req.user || req.session.user,
      sessionId: req.sessionID,
      expires: req.session ? req.session.cookie.expires : null
    });
  } else {
    res.status(401).json({ 
      success: false, 
      authenticated: false,
      message: 'Session expired' 
    });
  }
});

// Session health check endpoint
router.get("/session-health", (req, res) => {
  const sessionInfo = {
    hasSession: !!req.session,
    sessionId: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!(req.user || (req.session && req.session.user)),
    user: req.user || req.session?.user,
    cookieExpires: req.session ? req.session.cookie.expires : null,
    cookieMaxAge: req.session ? req.session.cookie.maxAge : null,
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    session: sessionInfo
  });
});

// Session recovery endpoint
router.post("/session-recover", async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required for session recovery' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // If token is provided, verify it
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.userId !== user._id.toString()) {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
          });
        }
      } catch (error) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
    }
    
    // Restore session
    req.session.user = user;
    req.session.save((err) => {
      if (err) {
        console.error('Session recovery save error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to restore session' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Session restored successfully',
        user: user
      });
    });
    
  } catch (error) {
    console.error('Session recovery error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Session recovery failed' 
    });
  }
});

module.exports = router