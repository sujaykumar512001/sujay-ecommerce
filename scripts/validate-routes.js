#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

// Route files to check
const routeFiles = [
  'routes/auth.js',
  'routes/admin.js',
  'routes/products.js',
  'routes/users.js',
  'routes/orders.js',
  'routes/cart.js',
  'routes/reviews.js',
  'routes/listing.js',
  'routes/client.js',
  'routes/userViews.js',
  'routes/adminPages.js',
  'routes/adminComplete.js'
];

// Check if file exists and has valid syntax
function validateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    // Basic syntax check
    try {
      require(path.resolve(filePath));
    } catch (syntaxError) {
      return { valid: false, error: `Syntax error: ${syntaxError.message}` };
    }
    
    return { 
      valid: true, 
      size: stats.size,
      lines: content.split('\n').length
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Check middleware files
function validateMiddleware() {
  const middlewareFiles = [
    'middleware/auth.js',
    'middleware/errorMiddleware.js',
    'middleware/validation.js',
    'middleware/seo.js'
  ];
  
  log.header('Validating Middleware Files');
  
  middlewareFiles.forEach(file => {
    const result = validateFile(file);
    if (result.valid) {
      log.success(`${file} (${result.lines} lines)`);
    } else {
      log.error(`${file}: ${result.error}`);
    }
  });
}

// Check model files
function validateModels() {
  const modelFiles = [
    'models/User.js',
    'models/Product.js',
    'models/Order.js',
    'models/Review.js'
  ];
  
  log.header('Validating Model Files');
  
  modelFiles.forEach(file => {
    const result = validateFile(file);
    if (result.valid) {
      log.success(`${file} (${result.lines} lines)`);
    } else {
      log.error(`${file}: ${result.error}`);
    }
  });
}

// Check configuration files
function validateConfig() {
  const configFiles = [
    'config/database.js',
    'config/passport.js',
    'config/cloudinary.js'
  ];
  
  log.header('Validating Configuration Files');
  
  configFiles.forEach(file => {
    const result = validateFile(file);
    if (result.valid) {
      log.success(`${file} (${result.lines} lines)`);
    } else {
      log.error(`${file}: ${result.error}`);
    }
  });
}

// Check environment configuration
function validateEnvironment() {
  log.header('Validating Environment Configuration');
  
  if (fs.existsSync('.env')) {
    log.success('.env file exists');
  } else {
    log.warning('.env file not found (use env.example as template)');
  }
  
  if (fs.existsSync('env.example')) {
    log.success('env.example file exists');
  } else {
    log.error('env.example file not found');
  }
}

// Check package.json
function validatePackageJson() {
  log.header('Validating Package Configuration');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check required scripts
    const requiredScripts = ['start', 'dev'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log.success(`Script '${script}' exists`);
      } else {
        log.error(`Script '${script}' missing`);
      }
    });
    
    // Check main entry point
    if (packageJson.main) {
      log.success(`Main entry point: ${packageJson.main}`);
    } else {
      log.error('Main entry point not specified');
    }
    
    // Check Node.js version requirement
    if (packageJson.engines && packageJson.engines.node) {
      log.success(`Node.js requirement: ${packageJson.engines.node}`);
    } else {
      log.warning('Node.js version requirement not specified');
    }
    
  } catch (error) {
    log.error(`Package.json error: ${error.message}`);
  }
}

// Main validation function
function validateRoutes() {
  log.header('Route Validation Report');
  log.info('Checking all route files for deployment readiness...\n');
  
  let totalRoutes = 0;
  let validRoutes = 0;
  let totalLines = 0;
  
  routeFiles.forEach(file => {
    totalRoutes++;
    const result = validateFile(file);
    
    if (result.valid) {
      validRoutes++;
      totalLines += result.lines;
      log.success(`${file} (${result.lines} lines)`);
    } else {
      log.error(`${file}: ${result.error}`);
    }
  });
  
  log.header('Validation Summary');
  log.info(`Total route files: ${totalRoutes}`);
  log.info(`Valid route files: ${validRoutes}`);
  log.info(`Total lines of code: ${totalLines.toLocaleString()}`);
  
  if (validRoutes === totalRoutes) {
    log.success('All route files are valid!');
  } else {
    log.error(`${totalRoutes - validRoutes} route files have issues`);
  }
  
  // Validate other components
  validateMiddleware();
  validateModels();
  validateConfig();
  validateEnvironment();
  validatePackageJson();
  
  log.header('Deployment Readiness');
  if (validRoutes === totalRoutes) {
    log.success('✅ All routes are ready for deployment!');
    log.info('Make sure to:');
    log.info('1. Set up environment variables');
    log.info('2. Configure database connection');
    log.info('3. Set up SSL certificates');
    log.info('4. Configure reverse proxy');
  } else {
    log.error('❌ Some issues need to be resolved before deployment');
  }
}

// Run validation
if (require.main === module) {
  validateRoutes();
}

module.exports = { validateRoutes, validateFile }; 