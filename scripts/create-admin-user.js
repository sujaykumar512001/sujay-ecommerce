const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const ADMIN_USER = {
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@estore.com',
    password: 'Admin123!',
    phone: '+1234567890',
    role: 'admin',
    isActive: true,
    isEmailVerified: true
};

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: ADMIN_USER.email });
        
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Active: ${existingAdmin.isActive}`);
            
            // Update role to admin if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
                console.log('✅ Updated user role to admin');
            }
            
            return existingAdmin;
        }
        
        // Create new admin user
        const adminUser = new User(ADMIN_USER);
        await adminUser.save();
        
        console.log('✅ Admin user created successfully');
        console.log(`   Username: ${adminUser.username}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Password: ${ADMIN_USER.password}`);
        
        return adminUser;
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run if this file is executed directly
if (require.main === module) {
    createAdminUser()
        .then(() => {
            console.log('\n🎉 Admin user setup completed!');
            console.log('You can now use these credentials to test admin routes:');
            console.log(`   Email: ${ADMIN_USER.email}`);
            console.log(`   Password: ${ADMIN_USER.password}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Admin user setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { createAdminUser }; 