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
// MongoDB connection - Handle missing module gracefully
let connectToDatabase;
try {
  connectToDatabase = require('./config/db');
} catch (error) {
  console.warn("⚠️ config/db module not found, using fallback");
  connectToDatabase = async () => {
    console.log("⚠️ MongoDB connection not available - config/db module missing");
    return null;
  };
}

// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();

// EJS view engine setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Trust proxy for production
app.set("trust proxy", 1);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware - Simplified for serverless
if (process.env.NODE_ENV !== 'production') {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
} else {
  console.log("⚠️ Helmet disabled for serverless environment");
}

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting - Disabled for serverless
if (process.env.NODE_ENV !== 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);
} else {
  console.log("⚠️ Rate limiting disabled for serverless environment");
}

// Data sanitization - Simplified for serverless
if (process.env.NODE_ENV !== 'production') {
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp());
  app.use(compression());
} else {
  // Minimal middleware for serverless
  app.use(compression());
  console.log("⚠️ Data sanitization disabled for serverless environment");
}

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
const mongoUri = process.env.NODE_ENV === 'production' 
  ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
  : process.env.MONGODB_URI;

console.log("🔗 MongoDB URI exists:", !!mongoUri);
console.log("🔗 MongoDB URI length:", mongoUri ? mongoUri.length : 0);
console.log("🔗 Using URI for:", process.env.NODE_ENV === 'production' ? 'production' : 'development');

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
  
  const mongoUri = process.env.NODE_ENV === 'production' 
    ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
    : process.env.MONGODB_URI;
  
  res.json({
    message: 'Environment Variables Debug',
    environment: process.env.NODE_ENV || 'development',
    totalEnvVars: Object.keys(process.env).length,
    relevantEnvVars: envVars,
    mongoUri: mongoUri ? `[SET - ${mongoUri.length} chars]` : '[NOT SET]',
    mongoUriType: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// MongoDB status route for debugging
app.get("/mongo-status", async (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const mongoUri = process.env.NODE_ENV === 'production' 
    ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
    : process.env.MONGODB_URI;
  
  try {
    // Try to connect if not already connected
    if (mongoUri && mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    
    res.json({
      mongoState: states[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      uriExists: !!mongoUri,
      uriLength: mongoUri ? mongoUri.length : 0,
      uriStart: mongoUri ? mongoUri.substring(0, 30) + '...' : 'NOT SET',
      connectionAttempted: true,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({
      mongoState: states[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      uriExists: !!mongoUri,
      uriLength: mongoUri ? mongoUri.length : 0,
      uriStart: mongoUri ? mongoUri.substring(0, 30) + '...' : 'NOT SET',
      connectionAttempted: true,
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Health check route - Non-blocking
app.get("/health", (req, res) => {
  const mongoUri = process.env.NODE_ENV === 'production' 
    ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
    : process.env.MONGODB_URI;
    
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: {
      status: 'deferred',
      readyState: mongoose.connection.readyState,
      uriExists: !!mongoUri,
      uriLength: mongoUri ? mongoUri.length : 0
    },
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: !!mongoUri,
      MONGODB_URI_PROD: !!process.env.MONGODB_URI_PROD,
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      JWT_SECRET: !!process.env.JWT_SECRET
    },
    debug: {
      totalEnvVars: Object.keys(process.env).length,
      hasMongoUri: !!mongoUri
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
  const port = process.env.PORT || 5000;
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