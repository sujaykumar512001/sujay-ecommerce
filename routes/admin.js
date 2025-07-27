const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// Apply admin middleware to all other routes
router.use(requireAdmin);

// Admin Dashboard
router.get('/', (req, res) => {
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        user: req.user,
        message: req.query.message || null,
        activePage: 'dashboard'
    });
});

// Admin Products Management Page
router.get('/products', async (req, res) => {
    try {
        // Get all products for admin view
        const products = await Product.find().lean();
        
        // Calculate analytics
        const totalProducts = products.length;
        const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
        const totalSales = products.reduce((sum, product) => sum + (product.sales || 0), 0);
        const avgRating = products.length > 0 ? 
            (products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length).toFixed(1) : 0;

        res.render('admin/products', {
            title: 'Product Management',
            products: products,
            totalProducts: totalProducts,
            totalViews: totalViews,
            totalSales: totalSales,
            avgRating: avgRating,
            user: req.user,
            activePage: 'products'
        });
    } catch (error) {
        console.error('Admin products page error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load products',
            statusCode: 500,
            user: req.user
        });
    }
});

// API Routes for Product Management

// Get all products (API)
router.get('/api/products', asyncHandler(async (req, res) => {
    const products = await Product.find().lean();
    res.json({
        success: true,
        products: products
    });
}));

// Add new product (API)
router.post('/api/products', asyncHandler(async (req, res) => {
    const {
        name,
        category,
        brand,
        price,
        salePrice,
        stock,
        images,
        rating,
        description,
        sku
    } = req.body;

    // Validate required fields
    if (!name || !category || !brand || !price || !description) {
        return res.status(400).json({
            success: false,
            message: 'All required fields must be provided'
        });
    }

    // Generate SKU if not provided
    const productSku = sku || `PROD-${Date.now()}`;

    // Create new product
    const newProduct = new Product({
        name,
        category,
        brand,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        stock: stock ? parseInt(stock) : 10,
        images: images || [{ url: 'https://via.placeholder.com/300x300', isPrimary: true }],
        rating: rating ? parseFloat(rating) : 0,
        description,
        sku: productSku,
        viewCount: 0,
        totalSales: 0,
        reviewCount: 0,
        createdBy: req.user._id
    });

    await newProduct.save();

    res.json({
        success: true,
        message: 'Product added successfully',
        product: newProduct
    });
}));

// Update product (API)
router.put('/api/products/:id', asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const {
        name,
        category,
        brand,
        price,
        salePrice,
        stock,
        images,
        rating,
        description,
        sku
    } = req.body;

    // Validate required fields
    if (!name || !category || !brand || !price || !description) {
        return res.status(400).json({
            success: false,
            message: 'All required fields must be provided'
        });
    }

    // Find and update product
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
            name,
            category,
            brand,
            price: parseFloat(price),
            salePrice: salePrice ? parseFloat(salePrice) : null,
            stock: stock ? parseInt(stock) : 10,
            images: images || [{ url: 'https://via.placeholder.com/300x300', isPrimary: true }],
            rating: rating ? parseFloat(rating) : 0,
            description,
            sku: sku || `PROD-${Date.now()}`
        },
        { new: true }
    );

    if (!updatedProduct) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    res.json({
        success: true,
        message: 'Product updated successfully',
        product: updatedProduct
    });
}));

// Bulk delete products (API) - Must come before /:id route
router.delete('/api/products/bulk-delete', asyncHandler(async (req, res) => {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Product IDs array is required'
        });
    }

    const result = await Product.deleteMany({ _id: { $in: productIds } });

    res.json({
        success: true,
        message: `${result.deletedCount} products deleted successfully`
    });
}));

// Delete product (API)
router.delete('/api/products/:id', asyncHandler(async (req, res) => {
    const productId = req.params.id;

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    res.json({
        success: true,
        message: 'Product deleted successfully'
    });
}));

// Get product analytics (API)
router.get('/api/analytics', asyncHandler(async (req, res) => {
    const products = await Product.find().lean();

    // Basic analytics
    const totalProducts = products.length;
    const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
    const totalSales = products.reduce((sum, product) => sum + (product.sales || 0), 0);
    const avgRating = products.length > 0 ? 
        (products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length).toFixed(1) : 0;

    // Category analytics
    const categoryStats = {};
    products.forEach(product => {
        if (!categoryStats[product.category]) {
            categoryStats[product.category] = {
                count: 0,
                totalViews: 0,
                totalSales: 0,
                avgRating: 0,
                totalRating: 0
            };
        }
        categoryStats[product.category].count++;
        categoryStats[product.category].totalViews += product.views || 0;
        categoryStats[product.category].totalSales += product.sales || 0;
        categoryStats[product.category].totalRating += product.rating || 0;
    });

    // Calculate average ratings for categories
    Object.keys(categoryStats).forEach(category => {
        if (categoryStats[category].count > 0) {
            categoryStats[category].avgRating = (categoryStats[category].totalRating / categoryStats[category].count).toFixed(1);
        }
    });

    // Top performing products
    const topProducts = products
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);

    // Low stock products
    const lowStockProducts = products
        .filter(product => (product.stock || 0) < 10)
        .sort((a, b) => (a.stock || 0) - (b.stock || 0))
        .slice(0, 5);

    res.json({
        success: true,
        analytics: {
            totalProducts,
            totalViews,
            totalSales,
            avgRating,
            categoryStats,
            topProducts,
            lowStockProducts
        }
    });
}));

// Search products (API)
router.get('/api/products/search/:query', asyncHandler(async (req, res) => {
    const query = req.params.query;

    const products = await Product.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { brand: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ]
    }).lean();

    res.json({
        success: true,
        products: products,
        count: products.length
    });
}));

// Export products (API)
router.get('/api/products/export', asyncHandler(async (req, res) => {
    const products = await Product.find().lean();

    // Convert to CSV format
    const csvHeaders = ['ID', 'Name', 'Category', 'Brand', 'Price', 'Original Price', 'Stock', 'Rating', 'Views', 'Sales', 'Description'];
    const csvRows = products.map(product => [
        product._id,
        product.name,
        product.category,
        product.brand,
        product.price,
        product.originalPrice || '',
        product.stock || '',
        product.rating || 0,
        product.views || 0,
        product.sales || 0,
        product.description
    ]);

    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csvContent);
}));

// Get product by ID (API)
router.get('/api/products/:id', asyncHandler(async (req, res) => {
    const productId = req.params.id;

    const product = await Product.findById(productId).lean();

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    res.json({
        success: true,
        product: product
    });
}));

// Update product views (API)
router.post('/api/products/:id/view', asyncHandler(async (req, res) => {
    const productId = req.params.id;

    const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { viewCount: 1 } },
        { new: true }
    );

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    res.json({
        success: true,
        viewCount: product.viewCount
    });
}));

// Update product sales (API)
router.post('/api/products/:id/sale', asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const { quantity = 1 } = req.body;

    const product = await Product.findByIdAndUpdate(
        productId,
        { 
            $inc: { 
                totalSales: parseInt(quantity),
                stock: -parseInt(quantity)
            }
        },
        { new: true }
    );

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    res.json({
        success: true,
        totalSales: product.totalSales,
        stock: product.stock
    });
}));

// Admin Orders Management
router.get('/orders', (req, res) => {
    res.render('admin/orders', {
        title: 'Order Management',
        user: req.user,
        activePage: 'orders'
    });
});

// Admin Users Management
router.get('/users', (req, res) => {
    res.render('admin/users', {
        title: 'User Management',
        user: req.user,
        activePage: 'users'
    });
});

// Admin Analytics Dashboard
router.get('/analytics', (req, res) => {
    res.render('admin/analytics', {
        title: 'Analytics Dashboard',
        user: req.user,
        activePage: 'analytics'
    });
});

module.exports = router;
