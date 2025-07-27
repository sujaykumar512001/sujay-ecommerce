#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Final Cleanup - Removing Unused Files and Securing Data');
console.log('=' .repeat(60));

// Files to remove
const filesToRemove = [
    't commit',
    'h origin HEAD',
    'h origin master',
    'CLEANUP_COMPLETE.md',
    'VIEWS_CLEANUP_SUMMARY.md',
    'logs/views-cleanup-report.json',
    'logs/cleanup-report.json',
    'logs/deployment-readiness-static.json',
    'scripts/check-deployment-readiness.js',
    'scripts/create-test-products.js',
    'scripts/verify-admin-user.js',
    'scripts/create-admin-user.js',
    'scripts/validate-routes.js'
];

// Directories to remove
const dirsToRemove = [
    'logs'
];

// Remove files
console.log('\n📁 Removing unused files...');
filesToRemove.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`✅ Removed: ${file}`);
        }
    } catch (error) {
        console.log(`⚠️  Could not remove ${file}: ${error.message}`);
    }
});

// Remove directories
console.log('\n📂 Removing unused directories...');
dirsToRemove.forEach(dir => {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log(`✅ Removed directory: ${dir}`);
        }
    } catch (error) {
        console.log(`⚠️  Could not remove directory ${dir}: ${error.message}`);
    }
});

// Security check
console.log('\n🔒 Security Check...');

// Check if .env exists and is in .gitignore
const gitignore = fs.readFileSync('.gitignore', 'utf8');
if (gitignore.includes('.env')) {
    console.log('✅ .env is protected in .gitignore');
} else {
    console.log('❌ .env is NOT protected in .gitignore');
}

// Check env.example for real credentials
const envExample = fs.readFileSync('env.example', 'utf8');
const sensitivePatterns = [
    /mongodb\+srv:\/\/[^@]+@[^\/]+/,
    /CLOUDINARY_API_KEY=\d+/,
    /CLOUDINARY_API_SECRET=[a-zA-Z0-9_-]+/,
    /CLOUDINARY_URL=cloudinary:\/\/[^@]+@/
];

let hasSensitiveData = false;
sensitivePatterns.forEach(pattern => {
    if (pattern.test(envExample)) {
        console.log(`❌ Found sensitive data in env.example: ${pattern}`);
        hasSensitiveData = true;
    }
});

if (!hasSensitiveData) {
    console.log('✅ env.example contains only placeholder values');
}

// Check for any .env files
const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production'
];

envFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`⚠️  Found ${file} - Make sure it's not committed to git`);
    }
});

console.log('\n🎉 Final cleanup completed!');
console.log('\n📋 Next steps:');
console.log('1. Create .env file with your real credentials (local only)');
console.log('2. Test your application locally');
console.log('3. Push to GitHub (credentials will be safe)');
console.log('4. Deploy with environment variables');

// Remove this cleanup script
setTimeout(() => {
    try {
        fs.unlinkSync(__filename);
        console.log('\n🧹 Self-removing cleanup script...');
    } catch (error) {
        console.log('\n⚠️  Could not remove cleanup script');
    }
}, 1000); 