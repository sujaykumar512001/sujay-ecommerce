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

// Load environment variables
dotenv.config();

// Global error handlers
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Initialize Express app
const app = express();

// Trust proxy for production
app.set("trust proxy", 1);

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware with CSP disabled in development
const cspConfig = process.env.NODE_ENV === 'development' ? {
  contentSecurityPolicy: false
} : {
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
      upgradeInsecureRequests: []
    }
  }
};

app.use(helmet(cspConfig));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(methodOverride("_method"));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce",
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// Flash messages
app.use(flash());

// Route checker middleware (development only)
if (process.env.NODE_ENV === 'development') {
  try {
    const { routeChecker, checkTemplates } = require('./route-checker');
    app.use(routeChecker);
    
    // Check templates on startup
    console.log('🔍 Checking available templates...');
    checkTemplates();
  } catch (error) {
    console.log('⚠️ Route checker not available:', error.message);
  }
}

// Global variables for templates
app.use(async (req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.formatPrice = (price) => Number(price).toFixed(2);
  res.locals.formatDate = (date) => new Date(date).toLocaleDateString();
  
  // Ensure user data is available on all pages
  let user = null;
  if (req.session && req.session.user) {
    user = req.session.user;
  } else if (req.user) {
    user = req.user;
  }
  
  res.locals.user = user;
  res.locals.isLoggedIn = !!user;
  
  next();
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err);
  console.log("⚠️ Continuing without MongoDB...");
});

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const reviewRoutes = require("./routes/reviews");

// Route setup
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);
app.use("/reviews", reviewRoutes);

// Additional routes
app.use("/cart", require("./routes/cart"));
app.use("/api/cart", require("./routes/cart"));
app.use("/userViews", require("./routes/userViews"));

// Admin routes - API routes
app.use("/api/admin", require("./routes/admin")); // API routes

// Admin login route
app.get("/admin/login", (req, res) => {
  res.render("admin/login", {
    title: "Admin Login",
    user: null,
    error: req.query.error || null
  });
});

// Admin logout route
app.get("/admin/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/admin/login");
  });
});

// Home route
app.get("/", async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log("MongoDB not connected, rendering without products");
      return res.render("index", { 
        title: "Home",
        featuredProducts: [],
        products: [],
        user: req.user || req.session.user
      });
    }

    const Product = require("./models/Product");
    const featuredProducts = await Product.find({ featured: true }).limit(6);
    
    console.log(`Found ${featuredProducts.length} featured products`);
    
    res.render("index", { 
      title: "Home",
      featuredProducts: featuredProducts,
      products: featuredProducts, // Keep for backward compatibility
      user: req.user || req.session.user
    });
  } catch (error) {
    console.error("Home page error:", error);
    res.render("index", { 
      title: "Home",
      featuredProducts: [],
      products: [], // Keep for backward compatibility
      user: req.user || req.session.user
    });
  }
});

// Client routes
app.use("/client", require("./routes/client"));

// Error handling
app.use((req, res) => {
  res.status(404).render("error", { 
    title: "404 - Page Not Found",
    message: "The page you're looking for doesn't exist." 
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", { 
    title: "500 - Server Error",
    message: "Something went wrong on our end." 
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
    // Find available port
    const port = await findAvailablePort(9000);
    console.log(`🔧 Attempting to start server on port: ${port}`);
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Local URL: http://localhost:${port}`);
      console.log(`🔒 CSP: ${process.env.NODE_ENV === 'development' ? 'Disabled (Development)' : 'Enabled (Production)'}`);
      console.log(`🛠️  Ready for development!`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is busy, trying next port...`);
        // Try next port
        const nextPort = port + 1;
        if (nextPort <= 9010) {
          setTimeout(() => {
            app.listen(nextPort, () => {
              console.log(`🚀 Server running on port ${nextPort}`);
              console.log(`🌐 Local URL: http://localhost:${nextPort}`);
            });
          }, 1000);
        } else {
          console.error('❌ No available ports found');
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer(); 