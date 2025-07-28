const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Compression
app.use(compression());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: true,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce",
    touchAfter: 0
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// MongoDB connection - Serverless-friendly approach
const uri = process.env.MONGODB_URI;

console.log('=== MongoDB Connection Debug ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!uri);
console.log('URI length:', uri ? uri.length : 0);
if (uri) {
  console.log('URI starts with:', uri.substring(0, 20) + '...');
  console.log('URI contains cluster:', uri.includes('cluster0.lviucyb.mongodb.net'));
}
console.log('================================');

// For serverless environments, we'll connect on-demand instead of at startup
console.log('⚠️ Serverless environment detected - MongoDB will connect on-demand');
console.log('📝 Connection will be established when needed for database operations');

// Create a connection function for on-demand use
const connectToMongoDB = async () => {
  if (!uri) {
    throw new Error('No MongoDB URI found! Please set MONGODB_URI environment variable.');
  }
  
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected');
    return;
  }
  
  console.log('🔗 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 5,
      connectTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

// Make the connection function available globally
global.connectToMongoDB = connectToMongoDB;

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

// Health check route
app.get("/health", async (req, res) => {
  try {
    // Try to connect to MongoDB if not already connected
    if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1) {
      await connectToMongoDB();
    }
    
    res.json({
      status: "ok",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      mongodb: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
  } catch (error) {
    res.json({
      status: "ok",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      mongodb: {
        status: 'error',
        readyState: mongoose.connection.readyState,
        error: error.message,
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
  }
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'Not Set'}`);
});

module.exports = app; 