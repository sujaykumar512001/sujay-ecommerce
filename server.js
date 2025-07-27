const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const expressLayouts = require('express-ejs-layouts');
const ImageOptimizationService = require('./services/ImageOptimizationService');
const imageOptimizer = new ImageOptimizationService();
const logger = require('./utils/logger');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

// Enhanced Global Error Handlers
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
  // Log to security monitoring system in production
  if (process.env.NODE_ENV === 'production') {
    logger.security.error('SECURITY ALERT: Unhandled Promise Rejection detected', { error: err.message });
  }
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  // Log to security monitoring system in production
  if (process.env.NODE_ENV === 'production') {
    logger.security.error('SECURITY ALERT: Uncaught Exception detected', { error: err.message });
  }
  process.exit(1);
});

// Security monitoring middleware
const securityMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious requests
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /javascript:/i, // JavaScript injection
    /union\s+select/i, // SQL injection
    /eval\s*\(/i, // Code injection
    /document\.cookie/i, // Cookie theft attempts
  ];
  
  const requestString = JSON.stringify({
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
  
  if (isSuspicious) {
    logger.security.error('SECURITY ALERT: Suspicious request detected', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }
  
  // Monitor response time for potential DoS
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    if (responseTime > 5000) { // 5 seconds
      logger.performance.warn('Slow response detected', {
        url: req.url,
        method: req.method,
        responseTime,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

// Initialize Express app
const app = express();

// Trust proxy for production
app.set("trust proxy", 1);

// Admin login route - standalone (no layout) - MUST BE BEFORE express-ejs-layouts
app.get("/admin/login", (req, res) => {
    // Send the admin login page content directly without any layout
    const adminLoginContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Yadav Collection</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-logo {
            font-size: 3rem;
            color: #667eea;
            margin-bottom: 1rem;
        }
        .login-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 0.5rem;
        }
        .login-subtitle {
            color: #666;
            font-size: 0.9rem;
        }
        .form-control {
            border-radius: 10px;
            border: 2px solid #e1e5e9;
            padding: 0.75rem 1rem;
            transition: all 0.3s ease;
        }
        .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .btn-login {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 10px;
            padding: 0.75rem 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .error-message {
            background: #fee;
            color: #c33;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid #fcc;
        }
        .success-message {
            background: #efe;
            color: #3c3;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid #cfc;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <div class="login-logo">
                <i class="fas fa-store"></i>
            </div>
            <h1 class="login-title">Admin Login</h1>
            <p class="login-subtitle">Sign in to access the admin panel</p>
        </div>
        
        ${req.query.error ? `<div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            ${req.query.error}
        </div>` : ''}
        
        <form id="adminLoginForm">
            <div class="mb-3">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" class="form-control" id="email" name="email" required>
            </div>
            
            <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn btn-login text-white w-100">
                <i class="fas fa-sign-in-alt me-2"></i>Sign In
            </button>
        </form>
        
        <div class="text-center mt-3">
            <a href="/" class="text-muted text-decoration-none">
                <i class="fas fa-arrow-left me-1"></i>Back to Store
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const adminLoginForm = document.getElementById('adminLoginForm');
            
            if (adminLoginForm) {
                adminLoginForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    // Show loading state
                    const submitButton = adminLoginForm.querySelector('button[type="submit"]');
                    const originalText = submitButton.innerHTML;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
                    submitButton.disabled = true;
                    
                    try {
                        const response = await fetch('/api/auth/admin/login', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ email, password })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok && data.success) {
                            // Check if user is admin
                            if (data.data && data.data.user && data.data.user.role === 'admin') {
                                // Store token
                                if (data.data.token) {
                                    localStorage.setItem('adminToken', data.data.token);
                                }
                                
                                // Redirect to admin dashboard
                                window.location.href = '/admin';
                            } else {
                                showError('Access denied. Admin privileges required.');
                            }
                        } else {
                            showError(data.message || 'Login failed. Please check your credentials.');
                        }
                    } catch (error) {
                        console.error('Login error:', error);
                        showError('An error occurred during login. Please try again.');
                    } finally {
                        // Reset button state
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                    }
                });
            }
            
            function showError(message) {
                // Remove existing error messages
                const existingError = document.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }
                
                // Create new error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = \`<i class="fas fa-exclamation-triangle"></i> \${message}\`;
                
                // Insert before the form
                const form = document.getElementById('adminLoginForm');
                form.parentNode.insertBefore(errorDiv, form);
                
                // Scroll to error
                errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    </script>
</body>
</html>`;
    
    res.send(adminLoginContent);
});

// Enable compression for all responses
app.use(compression({
  level: 6, // Compression level (0-9, higher = better compression but slower)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other responses
    return compression.filter(req, res);
  }
}));

// Set up view engine with layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Ensure layout is applied to all pages by default
app.use((req, res, next) => {
  // Set default layout for all pages
  res.locals.layout = 'layout';
  next();
});

// Custom layout resolver for admin pages
app.use((req, res, next) => {
  // Check if the request is for admin pages
  if (req.path.startsWith('/admin') && req.path !== '/admin/login') {
    res.locals.layout = 'admin/layout';
    // Force admin layout and prevent client content
    res.locals.isAdminPage = true;
    res.locals.hideClientContent = true;
  }
  next();
});

// Enhanced Security Configuration
const securityConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://code.jquery.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      workerSrc: ["'self'", "blob:"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Permissions Policy
  permissionsPolicy: {
    features: {
      geolocation: ["'self'"],
      microphone: ["'none'"],
      camera: ["'none'"],
      payment: ["'self'"],
      usb: ["'none'"],
      magnetometer: ["'none'"],
      gyroscope: ["'none'"],
      accelerometer: ["'none'"]
    }
  },
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },
  // Origin Agent Cluster
  originAgentCluster: true,
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },
  // Expect-CT
  expectCt: { enforce: true, maxAge: 30 },
  // Frameguard
  frameguard: { action: 'deny' },
  // Hide Powered-By
  hidePoweredBy: true,
  // HSTS
  hsts: { 
    maxAge: 31536000, 
    includeSubDomains: true, 
    preload: true 
  },
  // IE No Open
  ieNoOpen: true,
  // NoSniff
  noSniff: true,
  // XSS Protection
  xssFilter: true
};

// Disable CSP in development for easier debugging
if (process.env.NODE_ENV === 'development') {
  securityConfig.contentSecurityPolicy = false;
}

app.use(helmet(securityConfig));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(securityMonitor); // Add security monitoring

// HTTP request logging with Morgan
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.api.info(message.trim());
    }
  }
}));

// Performance monitoring
const { performanceMonitor } = require('./middleware/performanceMonitor');
app.use(performanceMonitor);

// Enhanced Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Much higher limit for testing
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many authentication attempts, please try again later.",
      retryAfter: Math.ceil(15 * 60 / 1000)
    });
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    error: "Too many file uploads, please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/upload/", uploadLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(methodOverride("_method"));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

// Enhanced Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production environment');
    }
    return 'dev-session-secret-change-in-production';
  })(),
  resave: true, // Changed to true to prevent session loss
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce",
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
    autoRemove: 'native',
    touchAfter: 0, // Update session on every request to prevent premature expiration
    crypto: {
      secret: process.env.SESSION_CRYPTO_SECRET || 'dev-crypto-secret-change-in-production'
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    domain: process.env.SESSION_DOMAIN || undefined,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  name: 'ecommerce.sid',
  rolling: true, // Extend session on each request
  unset: 'destroy' // Remove session from store when unset
}));

// Session debugging middleware
app.use((req, res, next) => {
  const originalEnd = res.end;
  res.end = function() {
    // Ensure session is saved before response ends
    if (req.session && req.session.user) {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
        originalEnd.apply(res, arguments);
      });
    } else {
      originalEnd.apply(res, arguments);
    }
  };
  next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// Flash messages
app.use(flash());

// Global variables for templates
app.use(async (req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.formatPrice = (price) => Number(price).toFixed(2);
  res.locals.formatDate = (date) => new Date(date).toLocaleDateString();
  
  // Ensure user data is available on all pages
  let user = null;
  if (req.user) {
    user = req.user;
  } else if (req.session && req.session.user) {
    user = req.session.user;
  }
  
  res.locals.user = user;
  res.locals.isLoggedIn = !!user;
  
  // Enhanced session refresh to prevent automatic logout
  if (req.session && req.session.user) {
    // Touch session to extend its lifetime
    req.session.touch();
    
    // Ensure session is saved
    req.session.save((err) => {
      if (err) {
        console.error('Session save error in middleware:', err);
      }
    });
    
    // Regenerate session ID periodically for security (every 30 minutes)
    const now = Date.now();
    if (!req.session.lastRegeneration || (now - req.session.lastRegeneration) > 30 * 60 * 1000) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
        } else {
          req.session.lastRegeneration = now;
          req.session.user = user;
          req.session.save();
        }
      });
    }
  }
  
  // Add image optimization service to templates
  res.locals.imageOptimizer = imageOptimizer;
  
  // Ensure admin page variables are always defined
  res.locals.isAdminPage = req.path.startsWith('/admin') && req.path !== '/admin/login';
  res.locals.hideClientContent = req.path.startsWith('/admin') && req.path !== '/admin/login';
  
  next();
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
const mongoUri = process.env.NODE_ENV === 'production' 
  ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
  : (process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce");

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.db.info("MongoDB connected successfully", { 
  environment: process.env.NODE_ENV,
  database: mongoose.connection.db.databaseName 
}))
.catch(err => {
  logger.db.error("MongoDB connection error", { error: err.message });
  logger.db.warn("Continuing without MongoDB");
});

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const reviewRoutes = require("./routes/reviews");

// Middleware to prevent admin access to client shopping pages
const preventAdminShopping = (req, res, next) => {
  // Check if user is admin and trying to access client shopping pages
  if (req.user && req.user.role === 'admin') {
    const clientShoppingPaths = [
      '/client/shop',
      '/client/cart', 
      '/client/new-arrivals',
      '/client/best-sellers',
      '/client/deals',
      '/client/category',
      '/client/search',
      '/client/product'
    ];
    
    const isClientShoppingPath = clientShoppingPaths.some(path => 
      req.path.startsWith(path)
    );
    
    if (isClientShoppingPath) {
      return res.redirect('/admin?message=Admin users cannot access client shopping pages');
    }
  }
  next();
};

// Apply middleware to client routes
app.use('/client', preventAdminShopping);

// Redirect routes (must come before other route mounting)
app.get("/products", (req, res) => {
  res.redirect("/client/shop");
});

app.get("/shop", (req, res) => {
  res.redirect("/client/shop");
});

app.get("/cart", (req, res) => {
  res.redirect("/client/cart");
});

// Additional redirects for common variations
app.get("/client/shop-simple", (req, res) => {
  res.redirect("/client/shop");
});

app.get("/client/cart-simple", (req, res) => {
  res.redirect("/client/cart");
});

// Route setup
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

// Additional routes
app.use("/api/cart", require("./routes/cart"));

// Admin logout route
app.get("/admin/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        success: false,
        message: "Logout failed"
      });
    }
    
    // Clear session
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destroy error:', sessionErr);
        return res.status(500).json({
          success: false,
          message: "Logout failed"
        });
      }
      
      res.json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });
});

// Home route
app.get("/", async (req, res) => {
  try {
    // Force layout to work
    res.locals.layout = 'layout';
    res.locals.user = req.user || req.session.user;
    res.locals.isLoggedIn = !!(req.user || req.session.user);

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      logger.db.warn("MongoDB not connected, rendering without products");
      return res.render("index", { 
        title: "Home",
        featuredProducts: [],
        products: [],
        message: req.query.message || null
      });
    }

    const Product = require("./models/Product");
    const featuredProducts = await Product.find({ featured: true }).limit(6);
    
    logger.info(`Found ${featuredProducts.length} featured products`);
    
    res.render("index", { 
      title: "Home",
      featuredProducts: featuredProducts,
      products: featuredProducts, // Keep for backward compatibility
      message: req.query.message || null
    });
  } catch (error) {
    logger.error("Home page error", { error: error.message, stack: error.stack });
    res.render("index", { 
      title: "Home",
      featuredProducts: [],
      products: [], // Keep for backward compatibility
      message: req.query.message || null
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  res.status(200).json(health);
});

// About page route
app.get("/about", (req, res) => {
  res.render("about", { 
    title: "About Us"
  });
});

// Session check route for debugging
app.get("/check-session", (req, res) => {
  res.json({
    session: req.session,
    user: req.user,
    sessionUser: req.session.user,
    isLoggedIn: !!(req.user || req.session.user),
    sessionId: req.sessionID,
    sessionCookie: req.session.cookie
  });
});

// Session cleanup route for debugging
app.get("/clear-session", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ success: false, error: err.message });
    }
    res.json({ success: true, message: "Session cleared" });
  });
});

// Clear rate limiting for debugging
app.get("/clear-rate-limit", (req, res) => {
  try {
    const { auth } = require('./middleware/auth');
    auth.clearAllFailedAttempts();
    res.json({ success: true, message: "Rate limiting cleared" });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// WebSocket endpoint (placeholder for now)
app.get("/ws", (req, res) => {
  res.status(501).json({ 
    message: "WebSocket endpoint not implemented yet",
    status: "not_implemented"
  });
});

// Handle WebSocket upgrade requests
app.get("/ws/*", (req, res) => {
  res.status(501).json({ 
    message: "WebSocket endpoint not implemented yet",
    status: "not_implemented"
  });
});

// Handle missing static files gracefully
app.get("/icons/icon-144x144.png", (req, res) => {
  res.status(404).json({ message: "Icon not found" });
});

app.get("/favicon.ico", (req, res) => {
  res.status(404).json({ message: "Favicon not found" });
});

// Client routes
app.use("/client", require("./routes/client"));

// User view routes - mount at /users instead of /userViews
app.use("/users", require("./routes/userViews"));
app.use("/auth", require("./routes/auth-standalone"));
app.use("/clean", require("./routes/clean-auth"));

// 404 and fallback route protection
app.use((req, res, next) => {
  // Log 404 attempts for security monitoring
  logger.security.warn('404 Not Found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer
  });
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /javascript:/i, // JavaScript injection
    /union\s+select/i, // SQL injection
    /eval\s*\(/i, // Code injection
    /document\.cookie/i, // Cookie theft attempts
    /\.env/i, // Environment file access
    /\.git/i, // Git directory access
    /\.sql/i, // SQL file access
    /\.php/i, // PHP file access
    /\.asp/i, // ASP file access
    /\.jsp/i, // JSP file access
    /\.exe/i, // Executable file access
    /\.bat/i, // Batch file access
    /\.sh/i, // Shell script access
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(req.url));
  
  if (isSuspicious) {
    logger.security.error('Suspicious 404 request detected', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(404).render("error", { 
      title: "404 - Page Not Found",
      message: "The page you're looking for doesn't exist.",
      user: req.user || req.session.user
    });
  }
  
  next();
});

// Error handling
app.use((req, res) => {
  res.status(404).render("error", { 
    title: "404 - Page Not Found",
    message: "The page you're looking for doesn't exist.",
    user: req.user || req.session.user
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).render("error", { 
    title: "500 - Server Error",
    message: "Something went wrong on our end.",
    user: req.user || req.session.user
  });
});

// Simple server startup with port management
const findAvailablePort = (startPort) => {
  return new Promise((resolve) => {
    const net = require('net');
    const testPort = (port) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(port);
      });
      server.on('error', () => {
        if (port < startPort + 20) {
          testPort(port + 1);
        } else {
          resolve(9000); // Fallback
        }
      });
    };
    testPort(startPort);
  });
};

const startServer = async () => {
  try {
    // Use Vercel's PORT or find available port for local development
    const port = process.env.PORT || await findAvailablePort(9000);
    logger.info(`Attempting to start server on port: ${port}`);
    
    // Start server
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Local URL: http://localhost:${port}`);
      }
      logger.info(`CSP: ${process.env.NODE_ENV === 'development' ? 'Disabled (Development)' : 'Enabled (Production)'}`);
      logger.info(`Ready for ${process.env.NODE_ENV || 'development'}!`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
        logger.warn(`Port ${port} is busy, trying next port...`);
        // Try next port only in development
        const nextPort = port + 1;
        if (nextPort <= 9010) {
          setTimeout(() => {
            app.listen(nextPort, () => {
              logger.info(`Server running on port ${nextPort}`);
              logger.info(`Local URL: http://localhost:${nextPort}`);
            });
            }, 1000);
        } else {
          logger.error('No available ports found');
          process.exit(1);
        }
      } else {
        logger.error('Server error', { error: err.message, code: err.code });
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Start the server
startServer(); 