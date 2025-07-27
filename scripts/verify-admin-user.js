const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ADMIN_USER = {
    email: 'admin@estore.com',
    password: 'Admin123!'
};

async function verifyAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Import User model
        const User = require('../models/User');
        
        // Find admin user
        const adminUser = await User.findOne({ email: ADMIN_USER.email }).select('+password');
        
        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('✅ Admin user found:');
        console.log('   Email:', adminUser.email);
        console.log('   Role:', adminUser.role);
        console.log('   Active:', adminUser.isActive);
        console.log('   Password hash exists:', !!adminUser.password);
        console.log('   Password hash length:', adminUser.password?.length || 0);
        
        // Test password comparison
        const isPasswordValid = await adminUser.comparePassword(ADMIN_USER.password);
        console.log('   Password valid:', isPasswordValid);
        
        // Test direct bcrypt comparison
        const directComparison = await bcrypt.compare(ADMIN_USER.password, adminUser.password);
        console.log('   Direct bcrypt comparison:', directComparison);
        
        // Test with different password
        const wrongPassword = await adminUser.comparePassword('wrongpassword');
        console.log('   Wrong password test:', wrongPassword);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

verifyAdminUser(); 