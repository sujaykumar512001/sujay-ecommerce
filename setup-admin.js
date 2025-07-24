const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin functionality...');

    // Check if admin user exists
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('👤 Creating admin user...');
      adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        isActive: true,
        username: 'admin'
      });
      console.log('✅ Admin user created:', adminUser.email);
    } else {
      console.log('✅ Admin user already exists:', adminUser.email);
    }

    // Check if we have sample products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('📦 Creating sample products...');
      
      const sampleProducts = [
        {
          name: 'Premium Cotton T-Shirt',
          description: 'High-quality cotton t-shirt with modern design',
          price: 29.99,
          category: 'Clothing',
          brand: 'Fashion Brand',
          stockQuantity: 100,
          images: ['/uploads/products/sample1.jpg'],
          isActive: true,
          featured: true
        },
        {
          name: 'Wireless Bluetooth Headphones',
          description: 'Premium wireless headphones with noise cancellation',
          price: 89.99,
          category: 'Electronics',
          brand: 'TechPro',
          stockQuantity: 50,
          images: ['/uploads/products/sample2.jpg'],
          isActive: true,
          featured: true
        },
        {
          name: 'Handmade Ceramic Vase',
          description: 'Beautiful handmade ceramic vase for home decoration',
          price: 45.99,
          category: 'Home & Garden',
          brand: 'Artisan Crafts',
          stockQuantity: 25,
          images: ['/uploads/products/sample3.jpg'],
          isActive: true,
          featured: true
        }
      ];

      await Product.insertMany(sampleProducts);
      console.log('✅ Sample products created');
    } else {
      console.log('✅ Products already exist:', productCount, 'products');
    }

    // Check if we have sample orders
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      console.log('📋 Creating sample orders...');
      
      const sampleOrders = [
        {
          user: adminUser._id,
          orderNumber: 'ORD-001',
          items: [
            {
              product: (await Product.findOne())._id,
              quantity: 2,
              price: 29.99
            }
          ],
          totalPrice: 59.98,
          status: 'completed',
          isPaid: true,
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        }
      ];

      await Order.insertMany(sampleOrders);
      console.log('✅ Sample orders created');
    } else {
      console.log('✅ Orders already exist:', orderCount, 'orders');
    }

    console.log('\n🎉 Admin setup complete!');
    console.log('📊 Admin Login Details:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   URL: http://localhost:9000/admin/login');
    
    console.log('\n🔗 Admin Routes:');
    console.log('   Dashboard: /admin/dashboard');
    console.log('   Products: /admin/products');
    console.log('   Orders: /admin/orders');
    console.log('   Users: /admin/users');
    console.log('   Analytics: /admin/analytics');

    process.exit(0);
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  }
}

setupAdmin(); 