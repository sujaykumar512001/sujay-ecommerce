const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configuration
const CONFIG = {
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'ecommerce-products',
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  IMAGE_WIDTH: parseInt(process.env.IMAGE_WIDTH) || 800,
  IMAGE_HEIGHT: parseInt(process.env.IMAGE_HEIGHT) || 600,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'public/uploads/products',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

// Validate environment
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                process.env.CLOUDINARY_API_KEY &&
                                process.env.CLOUDINARY_API_SECRET;

const generateSecureFilename = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const ext = path.extname(originalname).toLowerCase();
  const name = path.basename(originalname, ext).replace(/[^a-z0-9]/gi, '_');
  return `${name}_${timestamp}_${random}${ext}`;
};

const fileFilter = (req, file, cb) => {
  const isMimeValid = CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype);
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const isExtValid = CONFIG.ALLOWED_FORMATS.includes(ext);
  if (!isMimeValid || !isExtValid) {
    return cb(new Error(`Invalid file type. Allowed: ${CONFIG.ALLOWED_FORMATS.join(', ')}`), false);
  }
  cb(null, true);
};

// Cloudinary or local storage setup
let storage;
if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: CONFIG.CLOUDINARY_FOLDER,
      allowed_formats: CONFIG.ALLOWED_FORMATS,
      transformation: [
        { width: CONFIG.IMAGE_WIDTH, height: CONFIG.IMAGE_HEIGHT, crop: 'limit' },
        { quality: 'auto' }
      ]
    }
  });
  // Cloudinary configured for uploads
} else {
  const uploadPath = path.join(__dirname, '..', CONFIG.UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, generateSecureFilename(file.originalname))
  });

  console.warn('⚠️ Cloudinary not configured. Using local storage.');
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: CONFIG.MAX_FILE_SIZE, files: parseInt(process.env.MAX_FILES) || 10 }
});

const deleteFile = async (filePath) => {
  try {
    if (isCloudinaryConfigured && filePath.includes('cloudinary')) {
      const publicId = filePath.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      return true;
    } else {
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      return true;
    }
  } catch (err) {
    console.error('❌ File delete error:', err.message);
    return false;
  }
};

const getFileUrl = (file) => {
  if (isCloudinaryConfigured && file?.path) return file.path;
  if (file?.filename) return `/${CONFIG.UPLOAD_DIR}/${file.filename}`;
  return null;
};

const testCloudinaryConnection = async () => {
  try {
    const res = await cloudinary.api.ping();
    // Cloudinary test successful
    return true;
  } catch (e) {
    console.error('❌ Cloudinary test failed:', e.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  upload,
  testCloudinaryConnection,
  deleteFile,
  getFileUrl,
  generateSecureFilename,
  isCloudinaryConfigured,
  CONFIG
};
