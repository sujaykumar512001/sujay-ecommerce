const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const methodOverride = require('method-override');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const expressLayouts = require('express-ejs-layouts');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Trust proxy for production
app.set("trust proxy", 1);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || process.env.CORS_ORIGIN || "http://localhost:3000",
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
    domain: process.env.SESSION_DOMAIN || undefined,
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Method override
app.use(methodOverride('_method'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB connection
const mongoUri = process.env.NODE_ENV === 'production' 
  ? (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI)
  : (process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce");

console.log('Connecting to MongoDB...');
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI exists:', !!mongoUri);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_PROD: !!process.env.MONGODB_URI_PROD,
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET
    }
  });
});

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'E-commerce API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
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

// Export for Vercel
module.exports = app; 