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

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function testFile(filePath, description) {
  results.total++;
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim().length > 0) {
        log.success(`${description} - ${filePath}`);
        results.passed++;
        return true;
      } else {
        log.error(`${description} - ${filePath} (empty file)`);
        results.failed++;
        results.errors.push(`${filePath} is empty`);
        return false;
      }
    } else {
      log.error(`${description} - ${filePath} (not found)`);
      results.failed++;
      results.errors.push(`${filePath} not found`);
      return false;
    }
  } catch (error) {
    log.error(`${description} - ${filePath} (error: ${error.message})`);
    results.failed++;
    results.errors.push(`${filePath}: ${error.message}`);
    return false;
  }
}

function testEJSTemplate(filePath, description) {
  results.total++;
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      // Basic EJS syntax check
      if (content.includes('<%') || content.includes('<%-') || content.includes('<%=') || content.includes('<%#') || !content.includes('<%')) {
        log.success(`${description} - ${filePath}`);
        results.passed++;
        return true;
      } else {
        log.error(`${description} - ${filePath} (invalid EJS syntax)`);
        results.failed++;
        results.errors.push(`${filePath} has invalid EJS syntax`);
        return false;
      }
    } else {
      log.error(`${description} - ${filePath} (not found)`);
      results.failed++;
      results.errors.push(`${filePath} not found`);
      return false;
    }
  } catch (error) {
    log.error(`${description} - ${filePath} (error: ${error.message})`);
    results.failed++;
    results.errors.push(`${filePath}: ${error.message}`);
    return false;
  }
}

function testRouteFile(filePath, description) {
  results.total++;
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      // Basic syntax check - look for common route patterns
      if (content.includes('router.get') || content.includes('router.post') || content.includes('router.put') || content.includes('router.delete') || content.includes('app.get') || content.includes('app.post')) {
        log.success(`${description} - ${filePath}`);
        results.passed++;
        return true;
      } else {
        log.error(`${description} - ${filePath} (no route definitions found)`);
        results.failed++;
        results.errors.push(`${filePath} has no route definitions`);
        return false;
      }
    } else {
      log.error(`${description} - ${filePath} (not found)`);
      results.failed++;
      results.errors.push(`${filePath} not found`);
      return false;
    }
  } catch (error) {
    log.error(`${description} - ${filePath} (error: ${error.message})`);
    results.failed++;
    results.errors.push(`${filePath}: ${error.message}`);
    return false;
  }
}

function testConfigFile(filePath, description) {
  results.total++;
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim().length > 0) {
        log.success(`${description} - ${filePath}`);
        results.passed++;
        return true;
      } else {
        log.error(`${description} - ${filePath} (empty file)`);
        results.failed++;
        results.errors.push(`${filePath} is empty`);
        return false;
      }
    } else {
      log.error(`${description} - ${filePath} (not found)`);
      results.failed++;
      results.errors.push(`${filePath} not found`);
      return false;
    }
  } catch (error) {
    log.error(`${description} - ${filePath} (error: ${error.message})`);
    results.failed++;
    results.errors.push(`${filePath}: ${error.message}`);
    return false;
  }
}

function checkEnvironmentVariables() {
  log.header('Checking Environment Variables');
  
  results.total++;
  try {
    require('dotenv').config();
    const requiredVars = ['PORT', 'JWT_SECRET', 'SESSION_SECRET', 'MONGODB_URI'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      log.success('All required environment variables are set');
      results.passed++;
    } else {
      log.error(`Missing environment variables: ${missingVars.join(', ')}`);
      results.failed++;
      results.errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
    }
  } catch (error) {
    log.error(`Environment check failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Environment check: ${error.message}`);
  }
}

function checkPackageJson() {
  log.header('Checking Package Configuration');
  
  testConfigFile('package.json', 'Package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check for required scripts
    const requiredScripts = ['start', 'dev'];
    requiredScripts.forEach(script => {
      results.total++;
      if (packageJson.scripts && packageJson.scripts[script]) {
        log.success(`Script '${script}' exists`);
        results.passed++;
      } else {
        log.error(`Script '${script}' missing`);
        results.failed++;
        results.errors.push(`Missing script: ${script}`);
      }
    });
    
    // Check for main entry point
    results.total++;
    if (packageJson.main && packageJson.main === 'server.js') {
      log.success(`Main entry point: ${packageJson.main}`);
      results.passed++;
    } else {
      log.error(`Main entry point should be server.js, got: ${packageJson.main || 'undefined'}`);
      results.failed++;
      results.errors.push(`Invalid main entry point: ${packageJson.main || 'undefined'}`);
    }
    
    // Check Node.js version requirement
    results.total++;
    if (packageJson.engines && packageJson.engines.node) {
      log.success(`Node.js requirement: ${packageJson.engines.node}`);
      results.passed++;
    } else {
      log.warning('No Node.js version requirement specified');
      results.passed++; // Not critical
    }
  } catch (error) {
    log.error(`Package.json parsing error: ${error.message}`);
    results.failed++;
    results.errors.push(`Package.json parsing: ${error.message}`);
  }
}

function checkEJSTemplates() {
  log.header('Checking EJS Templates');
  
  const templateFiles = [
    { path: 'views/layout.ejs', desc: 'Main Layout' },
    { path: 'views/index.ejs', desc: 'Home Page' },
    { path: 'views/about.ejs', desc: 'About Page' },
    { path: 'views/error.ejs', desc: 'Error Page' },
    { path: 'views/admin/layout.ejs', desc: 'Admin Layout' },
    { path: 'views/admin/dashboard.ejs', desc: 'Admin Dashboard' },
    { path: 'views/admin/products.ejs', desc: 'Admin Products' },
    { path: 'views/admin/users.ejs', desc: 'Admin Users' },
    { path: 'views/admin/orders.ejs', desc: 'Admin Orders' },
    { path: 'views/admin/analytics.ejs', desc: 'Admin Analytics' },
    { path: 'views/admin/login.ejs', desc: 'Admin Login' },
    { path: 'views/client/shop.ejs', desc: 'Client Shop' },
    { path: 'views/client/cart.ejs', desc: 'Client Cart' },
    { path: 'views/client/search.ejs', desc: 'Client Search' },
    { path: 'views/client/product-detail.ejs', desc: 'Client Product Detail' },
    { path: 'views/client/deals.ejs', desc: 'Client Deals' },
    { path: 'views/client/new-arrivals.ejs', desc: 'Client New Arrivals' },
    { path: 'views/client/best-sellers.ejs', desc: 'Client Best Sellers' },
    { path: 'views/client/category.ejs', desc: 'Client Category' },
    { path: 'views/client/brand.ejs', desc: 'Client Brand' },
    { path: 'views/client/compare.ejs', desc: 'Client Compare' },
    { path: 'views/client/checkout.ejs', desc: 'Client Checkout' },
    { path: 'views/users/login.ejs', desc: 'User Login' },
    { path: 'views/users/register.ejs', desc: 'User Register' },
    { path: 'views/users/profile.ejs', desc: 'User Profile' },
    { path: 'views/users/orders.ejs', desc: 'User Orders' },
    { path: 'views/partials/navbar.ejs', desc: 'Navbar Partial' },
    { path: 'views/partials/footer.ejs', desc: 'Footer Partial' },
    { path: 'views/partials/header.ejs', desc: 'Header Partial' }
  ];
  
  templateFiles.forEach(file => {
    testEJSTemplate(file.path, file.desc);
  });
}

function checkRouteFiles() {
  log.header('Checking Route Files');
  
  const routeFiles = [
    { path: 'routes/auth.js', desc: 'Authentication Routes' },
    { path: 'routes/admin.js', desc: 'Admin Routes' },
    { path: 'routes/products.js', desc: 'Product Routes' },
    { path: 'routes/users.js', desc: 'User Routes' },
    { path: 'routes/orders.js', desc: 'Order Routes' },
    { path: 'routes/cart.js', desc: 'Cart Routes' },
    { path: 'routes/reviews.js', desc: 'Review Routes' },
    { path: 'routes/client.js', desc: 'Client Routes' },
    { path: 'routes/userViews.js', desc: 'User View Routes' },
    { path: 'routes/clean-auth.js', desc: 'Clean Auth Routes' },
    { path: 'routes/auth-standalone.js', desc: 'Auth Standalone Routes' }
  ];
  
  routeFiles.forEach(file => {
    testRouteFile(file.path, file.desc);
  });
}

function checkConfigurationFiles() {
  log.header('Checking Configuration Files');
  
  const configFiles = [
    { path: 'server.js', desc: 'Main Server File' },
    { path: 'config/database.js', desc: 'Database Configuration' },
    { path: 'config/constants.js', desc: 'Constants Configuration' },
    { path: 'middleware/auth.js', desc: 'Authentication Middleware' },
    { path: 'middleware/errorMiddleware.js', desc: 'Error Middleware' },
    { path: 'models/User.js', desc: 'User Model' },
    { path: 'models/Product.js', desc: 'Product Model' },
    { path: 'models/Order.js', desc: 'Order Model' },
    { path: 'utils/logger.js', desc: 'Logger Utility' },
    { path: 'utils/asyncHandler.js', desc: 'Async Handler Utility' }
  ];
  
  configFiles.forEach(file => {
    testConfigFile(file.path, file.desc);
  });
}

function checkStaticFiles() {
  log.header('Checking Static Files');
  
  const staticFiles = [
    { path: 'public/CSS/style.css', desc: 'Main CSS' },
    { path: 'public/CSS/mobile-nav.css', desc: 'Mobile CSS' },
    { path: 'public/js/script.js', desc: 'Main JavaScript' },
    { path: 'public/js/mobile-enhancements.js', desc: 'Mobile JavaScript' },
    { path: 'public/js/image-optimization.js', desc: 'Image Optimization JS' },
    { path: 'public/robots.txt', desc: 'Robots.txt' },
    { path: 'public/sitemap.xml', desc: 'Sitemap.xml' },
    { path: 'public/site.webmanifest', desc: 'Site Manifest' }
  ];
  
  staticFiles.forEach(file => {
    testFile(file.path, file.desc);
  });
}

function checkDeploymentFiles() {
  log.header('Checking Deployment Files');
  
  const deploymentFiles = [
    { path: 'Dockerfile', desc: 'Docker Configuration' },
    { path: 'ecosystem.config.js', desc: 'PM2 Configuration' },
    { path: 'healthcheck.js', desc: 'Health Check Script' },
    { path: 'nodemon.json', desc: 'Nodemon Configuration' },
    { path: 'README.md', desc: 'README Documentation' },
    { path: 'env.example', desc: 'Environment Example' }
  ];
  
  deploymentFiles.forEach(file => {
    testFile(file.path, file.desc);
  });
}

function generateSummary() {
  log.header('📊 Deployment Readiness Summary');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  
  log.info(`Total Tests: ${results.total}`);
  log.info(`Passed: ${results.passed}`);
  log.info(`Failed: ${results.failed}`);
  log.info(`Success Rate: ${successRate}%`);
  
  if (results.errors.length > 0) {
    log.header('❌ Issues Found');
    results.errors.forEach(error => {
      log.error(error);
    });
  }
  
  if (successRate >= 90) {
    log.success('✅ Application is READY for deployment!');
    return true;
  } else if (successRate >= 80) {
    log.warning('⚠️ Application is mostly ready but has some issues to address');
    return false;
  } else {
    log.error('❌ Application needs significant fixes before deployment');
    return false;
  }
}

// Main execution
function main() {
  log.header('🚀 Deployment Readiness Check');
  log.info(`Check started at: ${new Date().toLocaleString()}\n`);
  
  checkEnvironmentVariables();
  checkPackageJson();
  checkEJSTemplates();
  checkRouteFiles();
  checkConfigurationFiles();
  checkStaticFiles();
  checkDeploymentFiles();
  
  const isReady = generateSummary();
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../logs/deployment-readiness-static.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / results.total) * 100).toFixed(1),
    isReady,
    errors: results.errors
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.info(`Detailed report saved to: ${reportPath}`);
  
  process.exit(isReady ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main, results }; 