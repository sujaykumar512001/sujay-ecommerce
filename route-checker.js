const express = require('express');
const path = require('path');
const fs = require('fs');

// Route checker middleware
const routeChecker = (req, res, next) => {
  console.log(`🔍 Route accessed: ${req.method} ${req.path}`);
  console.log(`📁 User agent: ${req.headers['user-agent']}`);
  console.log(`🔐 User: ${req.user ? req.user.firstName : 'Not logged in'}`);
  console.log(`📦 Session user: ${req.session.user ? req.session.user.firstName : 'No session'}`);
  console.log(`🌐 Referer: ${req.headers.referer || 'Direct access'}`);
  console.log('---');
  next();
};

// Template checker
const checkTemplates = () => {
  const viewsDir = path.join(__dirname, 'views');
  const templates = [];
  
  function scanDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, prefix + item + '/');
      } else if (item.endsWith('.ejs')) {
        templates.push(prefix + item);
      }
    });
  }
  
  try {
    scanDirectory(viewsDir);
    console.log('📋 Available EJS templates:');
    templates.forEach(template => {
      console.log(`  ✅ ${template}`);
    });
    return templates;
  } catch (error) {
    console.error('❌ Error scanning templates:', error);
    return [];
  }
};

// Route tester
const testRoutes = (app) => {
  const testRoutes = [
    '/',
    '/client/shop',
    '/client/deals',
    '/users/login',
    '/users/register',
    '/users/profile',
    '/users/orders',
    '/cart',
    '/admin',
    '/products',
    '/about',
    '/test-csp'
  ];
  
  console.log('🧪 Testing routes...');
  testRoutes.forEach(route => {
    console.log(`  🔗 ${route}`);
  });
};

module.exports = {
  routeChecker,
  checkTemplates,
  testRoutes
}; 