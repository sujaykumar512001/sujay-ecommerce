const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

// Load environment variables
dotenv.config();

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
    mongoUrl: process.env.NODE_ENV === 'production' 
      ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
      : (process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce"),
    touchAfter: 0
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// MongoDB connection
const getMongoUri = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;
  }
  return process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce";
};

const mongoUri = getMongoUri();

console.log('=== MongoDB Connection Debug ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI exists:', !!mongoUri);
console.log('MONGODB_URI_PROD exists:', !!process.env.MONGODB_URI_PROD);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('URI length:', mongoUri ? mongoUri.length : 0);
console.log('================================');

if (!mongoUri) {
  console.error('❌ No MongoDB URI found! Please set MONGODB_URI_PROD or MONGODB_URI environment variable.');
} else {
  console.log('🔗 Connecting to MongoDB...');
  
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Full error:', err);
  });
}

// Health check route
app.get("/health", (req, res) => {
  const mongoUri = getMongoUri();
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
      uriExists: !!mongoUri,
      uriLength: mongoUri ? mongoUri.length : 0
    },
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_PROD: !!process.env.MONGODB_URI_PROD,
      MONGODB_URI: !!process.env.MONGODB_URI,
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
  console.log(`Server running on port ${port}`);
});

module.exports = app; 