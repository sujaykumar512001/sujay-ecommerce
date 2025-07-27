const mongoose = require('mongoose');
require('dotenv').config();

const TEST_PRODUCTS = [
    {
        name: 'Test Product 1',
        category: 'Electronics',
        brand: 'TestBrand',
        price: 99.99,
        salePrice: 89.99,
        stock: 50,
        sku: 'TEST-ELEC-001',
        images: [{ url: 'https://via.placeholder.com/300x300', isPrimary: true }],
        rating: 4.5,
        description: 'This is a test product for admin testing',
        viewCount: 100,
        totalSales: 25,
        reviewCount: 10,
        seo: { slug: 'test-product-1-electronics' },
        createdBy: null // Will be set to admin user ID
    },
    {
        name: 'Test Product 2',
        category: 'Clothing',
        brand: 'FashionBrand',
        price: 49.99,
        salePrice: 39.99,
        stock: 30,
        sku: 'TEST-CLOTH-002',
        images: [{ url: 'https://via.placeholder.com/300x300', isPrimary: true }],
        rating: 4.2,
        description: 'Another test product for admin testing',
        viewCount: 75,
        totalSales: 15,
        reviewCount: 8,
        seo: { slug: 'test-product-2-clothing' },
        createdBy: null // Will be set to admin user ID
    },
    {
        name: 'Test Product 3',
        category: 'Home & Garden',
        brand: 'HomeBrand',
        price: 199.99,
        salePrice: 179.99,
        stock: 20,
        sku: 'TEST-HOME-003',
        images: [{ url: 'https://via.placeholder.com/300x300', isPrimary: true }],
        rating: 4.8,
        description: 'A third test product for admin testing',
        viewCount: 150,
        totalSales: 35,
        reviewCount: 12,
        seo: { slug: 'test-product-3-home-garden' },
        createdBy: null // Will be set to admin user ID
    }
];

async function createTestProducts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Import models
        const Product = require('../models/Product');
        const User = require('../models/User');
        
        // Get admin user ID
        const adminUser = await User.findOne({ email: 'admin@estore.com' });
        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }
        
        // Clear existing test products
        await Product.deleteMany({ name: { $regex: /^Test Product/ } });
        console.log('🗑️  Cleared existing test products');
        
        // Set createdBy for all test products
        const productsWithAdmin = TEST_PRODUCTS.map(product => ({
            ...product,
            createdBy: adminUser._id
        }));
        
        // Create new test products
        const createdProducts = await Product.insertMany(productsWithAdmin);
        
        console.log('✅ Created test products:');
        createdProducts.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name} (ID: ${product._id})`);
        });
        
        // Get all products for reference
        const allProducts = await Product.find().select('_id name').limit(5);
        console.log('\n📋 Available products (first 5):');
        allProducts.forEach(product => {
            console.log(`   ${product._id} - ${product.name}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

createTestProducts(); 