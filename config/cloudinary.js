const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration constants - can be moved to environment variables
const CONFIG = {
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'ecommerce-products',
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  IMAGE_WIDTH: parseInt(process.env.IMAGE_WIDTH) || 800,
  IMAGE_HEIGHT: parseInt(process.env.IMAGE_HEIGHT) || 600,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'public/uploads/products',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
};

// Validate environment variables
const validateEnvironment = () => {
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing Cloudinary environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

// Check if Cloudinary credentials are configured
const isCloudinaryConfigured = validateEnvironment() && 
                              process.env.CLOUDINARY_CLOUD_NAME && 
                              process.env.CLOUDINARY_API_KEY && 
                              process.env.CLOUDINARY_API_SECRET;

let storage, upload;

// Secure filename generator
const generateSecureFilename = (originalname) => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalname).toLowerCase();
  const sanitizedName = path.basename(originalname, extension).replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sanitizedName}_${timestamp}_${randomBytes}${extension}`;
};

// Create upload directory safely
const createUploadDirectory = (uploadPath) => {
  try {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`✅ Created upload directory: ${uploadPath}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Failed to create upload directory: ${error.message}`);
    return false;
  }
};

if (isCloudinaryConfigured) {
  try {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Configure Cloudinary storage for multer
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: CONFIG.CLOUDINARY_FOLDER,
        allowed_formats: CONFIG.ALLOWED_FORMATS,
        transformation: [
          { width: CONFIG.IMAGE_WIDTH, height: CONFIG.IMAGE_HEIGHT, crop: 'limit' },
          { quality: 'auto' }
        ],
        resource_type: 'auto'
      }
    });

    console.log('✅ Cloudinary configured for image uploads');
  } catch (error) {
    console.error(`❌ Cloudinary configuration error: ${error.message}`);
    isCloudinaryConfigured = false;
  }
}

if (!isCloudinaryConfigured) {
  // Fallback to local storage
  const uploadDir = path.join(__dirname, '..', CONFIG.UPLOAD_DIR);
  
  // Create upload directory if it doesn't exist
  if (!createUploadDirectory(uploadDir)) {
    throw new Error('Failed to create upload directory');
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const secureFilename = generateSecureFilename(file.originalname);
      cb(null, secureFilename);
    }
  });

  console.log('⚠️ Cloudinary not configured, using local storage for images');
}

// Enhanced file filter with better error handling
const fileFilter = (req, file, cb) => {
  try {
    // Check file type
    if (!CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: ${CONFIG.ALLOWED_FORMATS.join(', ')}`), false);
    }
    
    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase().substring(1);
    if (!CONFIG.ALLOWED_FORMATS.includes(extension)) {
      return cb(new Error(`Invalid file extension. Allowed extensions: ${CONFIG.ALLOWED_FORMATS.join(', ')}`), false);
    }
    
    cb(null, true);
  } catch (error) {
    cb(new Error(`File validation error: ${error.message}`), false);
  }
};

// Create multer upload instance with enhanced configuration
upload = multer({ 
  storage: storage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE,
    files: parseInt(process.env.MAX_FILES) || 10 // Limit number of files
  },
  fileFilter: fileFilter
});

// Utility functions
const deleteFile = async (filePath) => {
  try {
    if (isCloudinaryConfigured && filePath.includes('cloudinary')) {
      // Extract public_id from Cloudinary URL
      const publicId = filePath.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted Cloudinary file: ${publicId}`);
    } else {
      // Delete local file
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`✅ Deleted local file: ${filePath}`);
      }
    }
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete file ${filePath}: ${error.message}`);
    return false;
  }
};

const getFileUrl = (file) => {
  if (isCloudinaryConfigured && file.path) {
    return file.path; // Cloudinary returns the URL in file.path
  } else if (file.filename) {
    // For local files, construct the URL
    return `/${CONFIG.UPLOAD_DIR}/${file.filename}`;
  }
  return null;
};

module.exports = {
  cloudinary: isCloudinaryConfigured ? cloudinary : null,
  storage,
  productStorage: storage, // Alias for compatibility
  upload,
  isCloudinaryConfigured,
  CONFIG,
  deleteFile,
  getFileUrl,
  generateSecureFilename
}; 