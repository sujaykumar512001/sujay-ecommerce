const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const connectToDatabase = require('./config/db');

// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();

// Trust proxy for production
app.set("trust proxy", 1);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting - Simplified for serverless
if (process.env.NODE_ENV !== 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);
}

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Compression
app.use(compression());

// Session configuration - Disabled for serverless
if (process.env.NODE_ENV !== 'production') {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  }));
} else {
  console.log("⚠️ Sessions disabled for serverless environment");
}

// MongoDB connection - Completely non-blocking for serverless
console.log("🔗 MongoDB URI exists:", !!process.env.MONGODB_URI);
console.log("🔗 MongoDB URI length:", process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);

// Don't connect at startup - only connect when explicitly requested
console.log("⚠️ MongoDB connection deferred - will connect on-demand only");

// Debug route to check environment variables
app.get("/debug", (req, res) => {
  const envVars = {};
  Object.keys(process.env).forEach(key => {
    if (key.includes('MONGODB') || key.includes('CLOUDINARY') || key.includes('SESSION') || key.includes('JWT')) {
      envVars[key] = process.env[key] ? `[SET - ${process.env[key].length} chars]` : '[NOT SET]';
    }
  });
  
  res.json({
    message: 'Environment Variables Debug',
    environment: process.env.NODE_ENV || 'development',
    totalEnvVars: Object.keys(process.env).length,
    relevantEnvVars: envVars,
    mongoUri: process.env.MONGODB_URI ? `[SET - ${process.env.MONGODB_URI.length} chars]` : '[NOT SET]',
    timestamp: new Date().toISOString()
  });
});

// MongoDB status route for debugging
app.get("/mongo-status", async (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  
  try {
    // Try to connect if not already connected
    if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    
    res.json({
      mongoState: states[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      uriExists: !!process.env.MONGODB_URI,
      uriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
      uriStart: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'NOT SET',
      connectionAttempted: true
    });
  } catch (error) {
    res.json({
      mongoState: states[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      uriExists: !!process.env.MONGODB_URI,
      uriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
      uriStart: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'NOT SET',
      connectionAttempted: true,
      error: error.message
    });
  }
});

// Health check route - Non-blocking
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: {
      status: 'deferred',
      readyState: mongoose.connection.readyState,
      uriExists: !!process.env.MONGODB_URI,
      uriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0
    },
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: !!process.env.MONGODB_URI,
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      JWT_SECRET: !!process.env.JWT_SECRET
    },
    debug: {
      totalEnvVars: Object.keys(process.env).length,
      hasMongoUri: !!process.env.MONGODB_URI
    }
  });
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: 'deferred' // Don't check connection status on main route
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test successful!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Route not found',
    path: req.path
  });
});

// Serverless-compatible startup
if (process.env.NODE_ENV !== 'production') {
  // Only start server in development
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'Not Set'}`);
  });
} else {
  console.log("🚀 Serverless environment - app ready for function calls");
}

module.exports = app; 