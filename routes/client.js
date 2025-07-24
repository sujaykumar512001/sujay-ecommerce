const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken, authenticateTokenWeb, optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const CONSTANTS = require('../config/constants');

// Client shop page - browse products with enhanced filtering
router.get('/shop', asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = CONSTANTS.PRODUCTS_PAGE_SIZE;
        const skip = (page - 1) * limit;
        
    // Build query with enhanced filtering
        let query = {};
        
    // Search filter with multiple fields
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { brand: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } },
            { category: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        // Category filter
        if (req.query.category) {
            query.category = req.query.category;
        }
    
    // Brand filter
    if (req.query.brand) {
        query.brand = req.query.brand;
    }
    
    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
        if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }
    
    // Rating filter
    if (req.query.minRating) {
        query.rating = { $gte: parseFloat(req.query.minRating) };
    }
    
    // Availability filter
    if (req.query.inStock === 'true') {
        query.stockQuantity = { $gt: 0 };
        }
        
        // Sort options
        let sort = { createdAt: -1 }; // Default: newest first
    switch (req.query.sort) {
        case 'price_asc':
            sort = { price: 1 };
            break;
        case 'price_desc':
            sort = { price: -1 };
            break;
        case 'rating':
            sort = { rating: -1 };
            break;
        case 'name_asc':
            sort = { name: 1 };
            break;
        case 'name_desc':
            sort = { name: -1 };
            break;
        case 'popularity':
            sort = { soldCount: -1 };
            break;
    }
    
    // Get products with enhanced data
        const products = await Product.find(query)
            .sort(sort)
            .skip(skip)
        .limit(limit)
        .populate('reviews', 'rating comment')
        .lean();
        
        // Get total count for pagination
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        
    // Get categories and brands for filter
        const categories = await Product.distinct('category');
    const brands = await Product.distinct('brand');
    
    // Get price range for filter
    const priceStats = await Product.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        }
    ]);
        
        res.render('client/shop', {
            title: 'Shop Products',
            products,
            categories,
            brands,
            currentPage: page,
            totalPages,
            totalProducts,
            currentSearch: req.query.search,
            currentCategory: req.query.category,
            currentBrand: req.query.brand,
            currentSort: req.query.sort,
            minPrice: req.query.minPrice,
            maxPrice: req.query.maxPrice,
            minRating: req.query.minRating,
            inStock: req.query.inStock,
            priceRange: priceStats[0] || { minPrice: CONSTANTS.DEFAULT_MIN_PRICE, maxPrice: CONSTANTS.DEFAULT_MAX_PRICE },
            user: req.user
        });
}));

// Enhanced product detail page
router.get('/product/:id', asyncHandler(async (req, res) => {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(404).render('error', { 
            title: 'Product Not Found',
            message: 'Invalid product ID format.',
            statusCode: 404,
            user: req.user
        });
    }
    
    const product = await Product.findById(req.params.id)
        .populate({
            path: 'reviews',
            populate: {
                path: 'user',
                select: 'firstName lastName username'
            }
        })
        .lean();
        
        if (!product) {
            return res.status(404).render('error', { 
                title: 'Product Not Found',
            message: 'The product you are looking for does not exist.',
            statusCode: 404,
                user: req.user
            });
        }
    
    // Get related products
    const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id }
    })
    .limit(4)
    .lean();
    
    // Get recently viewed products (if user is logged in)
    let recentlyViewed = [];
    if (req.user) {
        // This would typically be stored in user's session or database
        // For now, we'll get products from the same category
        recentlyViewed = await Product.find({
            category: product.category,
            _id: { $ne: product._id }
        })
        .limit(3)
        .lean();
        }
        
        res.render('client/product-detail', {
            title: product.name,
            product,
        relatedProducts,
        recentlyViewed,
            user: req.user
        });
}));

// Product search with suggestions
router.get('/search', asyncHandler(async (req, res) => {
    const { q, category, sort } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (q) {
        query.$or = [
            { name: { $regex: q, $options: 'i' } },
            { brand: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { category: { $regex: q, $options: 'i' } }
        ];
    }
    
    if (category) {
        query.category = category;
    }
    
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    
    const products = await Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Get search suggestions
    const suggestions = await Product.find({
        $or: [
            { name: { $regex: q, $options: 'i' } },
            { brand: { $regex: q, $options: 'i' } }
        ]
    })
    .limit(5)
    .select('name brand category')
    .lean();
    
    res.render('client/search', {
        title: `Search Results for "${q}"`,
        products,
        suggestions,
        searchQuery: q,
        currentPage: page,
        totalPages,
        totalProducts,
        currentCategory: category,
        currentSort: sort,
            user: req.user
        });
}));

// Wishlist functionality
router.get('/wishlist', authenticateTokenWeb, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('wishlist');
    
    res.render('client/wishlist', {
        title: 'My Wishlist',
        wishlist: user.wishlist || [],
        user: req.user
    });
}));

// Add to wishlist
router.post('/wishlist/:productId', authenticateTokenWeb, asyncHandler(async (req, res) => {
    const { productId } = req.params;
    
    const user = await User.findById(req.user._id);
    const product = await Product.findById(productId);
    
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (!user.wishlist) {
        user.wishlist = [];
    }
    
    const isInWishlist = user.wishlist.includes(productId);
    
    if (isInWishlist) {
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        res.json({ success: true, message: 'Removed from wishlist', inWishlist: false });
    } else {
        user.wishlist.push(productId);
        await user.save();
        res.json({ success: true, message: 'Added to wishlist', inWishlist: true });
    }
}));

// Product comparison
router.get('/compare', asyncHandler(async (req, res) => {
    const { products } = req.query;
    let productIds = [];
    
    if (products) {
        productIds = products.split(',').slice(0, 4); // Max 4 products
    }
    
    const compareProducts = await Product.find({
        _id: { $in: productIds }
    }).lean();
    
    res.render('client/compare', {
        title: 'Compare Products',
        products: compareProducts,
        user: req.user
    });
}));

// Add to comparison
router.post('/compare/:productId', asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { currentProducts } = req.body;
    
    let products = currentProducts ? currentProducts.split(',') : [];
    
    if (!products.includes(productId)) {
        products.push(productId);
        if (products.length > 4) {
            products = products.slice(-4); // Keep only last 4
        }
    }
    
    res.json({ 
        success: true, 
        products: products.join(','),
        message: 'Product added to comparison'
    });
}));

// Category page
router.get('/category/:category', asyncHandler(async (req, res) => {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const products = await Product.find({ category })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalProducts = await Product.countDocuments({ category });
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Get subcategories if any
    const subcategories = await Product.distinct('subcategory', { category });
    
    res.render('client/category', {
        title: `${category} Products`,
        products,
        category,
        subcategories,
        currentPage: page,
        totalPages,
        totalProducts,
        user: req.user
    });
}));

// Brand page
router.get('/brand/:brand', asyncHandler(async (req, res) => {
    const { brand } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const products = await Product.find({ brand })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalProducts = await Product.countDocuments({ brand });
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('client/brand', {
        title: `${brand} Products`,
        products,
        brand,
        currentPage: page,
        totalPages,
        totalProducts,
        user: req.user
    });
}));

// New arrivals
router.get('/new-arrivals', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const products = await Product.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('client/new-arrivals', {
        title: 'New Arrivals',
        products,
        currentPage: page,
        totalPages,
        totalProducts,
        user: req.user
    });
}));

// Best sellers
router.get('/best-sellers', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const products = await Product.find()
        .sort({ soldCount: -1, rating: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('client/best-sellers', {
        title: 'Best Sellers',
        products,
        currentPage: page,
        totalPages,
        totalProducts,
        user: req.user
    });
}));

// Sale/Deals page
router.get('/deals', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const products = await Product.find({
        $or: [
            { discountPercentage: { $gt: 0 } },
            { onSale: true }
        ]
    })
    .sort({ discountPercentage: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    const totalProducts = await Product.countDocuments({
        $or: [
            { discountPercentage: { $gt: 0 } },
            { onSale: true }
        ]
    });
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('client/deals', {
        title: 'Deals & Discounts',
        products,
        currentPage: page,
        totalPages,
        totalProducts,
        user: req.user
    });
}));

// Product quick view (AJAX)
router.get('/product/:id/quick-view', asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('reviews', 'rating comment')
        .lean();
    
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, product });
}));

// Product reviews
router.get('/product/:id/reviews', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
            const limit = CONSTANTS.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ product: id })
        .populate('user', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalReviews = await Review.countDocuments({ product: id });
    const totalPages = Math.ceil(totalReviews / limit);
    
    res.json({
        success: true,
        reviews,
        currentPage: page,
        totalPages,
        totalReviews
    });
}));

// Client cart page - redirect to modern cart
router.get('/cart', asyncHandler(async (req, res) => {
    res.redirect('/client/cart-simple');
}));

// Client checkout page
router.get('/checkout', (req, res) => {
    if (!req.user) {
        // Redirect to login with return URL
        return res.redirect('/users/login?returnUrl=' + encodeURIComponent('/client/checkout'));
    }
    
    res.render('client/checkout', {
        title: 'Checkout',
        user: req.user
    });
});

// API: Get product reviews
router.get('/api/reviews/product/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.productId })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });
        
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});

// API: Add to cart
router.post('/api/cart/add', async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        // Adding product to cart
        
        // Validate product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND });
        }
        
        // Ensure quantity is a valid positive integer
        const validQuantity = Math.max(1, parseInt(quantity) || 1);
        // Quantity validated
        
        // Check stock
        if (product.stock < validQuantity) {
            return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: 'Insufficient stock' });
        }
        
        // Initialize session cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = [];
        }
        
        // Check if product already in cart
        const existingItem = req.session.cart.find(item => 
            item.productId.toString() === productId
        );
        
        if (existingItem) {
            existingItem.quantity = Math.max(1, (existingItem.quantity || 1) + validQuantity);
            // Updated existing item quantity
        } else {
            req.session.cart.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: validQuantity
            });
            // Added new item to cart
        }
        
        const cartCount = req.session.cart.reduce((total, item) => total + (item.quantity || 1), 0);
        // Cart updated successfully
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('[Cart Add] Session save error:', err);
                return res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SESSION_SAVE_FAILED });
            }
            
            res.json({ 
                message: 'Product added to cart',
                cartCount: cartCount
            });
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Get cart items
router.get('/api/cart', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Remove from cart
router.delete('/api/cart/:productId', async (req, res) => {
    try {
        // Removing item from cart
        
        if (!req.session.cart) {
            return res.status(400).json({ message: 'Cart is empty' });
        }
        
        req.session.cart = req.session.cart.filter(item => 
            item.productId.toString() !== req.params.productId
        );
        
        const cartCount = req.session.cart.reduce((total, item) => total + item.quantity, 0);
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('[Cart Remove] Session save error:', err);
                return res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SESSION_SAVE_FAILED });
            }
            
            res.json({ 
                message: 'Item removed from cart',
                cartCount: cartCount
            });
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Update cart quantity
router.put('/api/cart/:productId', async (req, res) => {
    try {
        const { quantity } = req.body;
        
        // Updating cart item quantity
        
        // Validate quantity - ensure it's a valid positive integer
        const validQuantity = parseInt(quantity);
        if (!Number.isFinite(validQuantity) || validQuantity <= 0) {
            return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: CONSTANTS.ERROR_MESSAGES.INVALID_INPUT });
        }
        
        if (!req.session.cart) {
            return res.status(400).json({ message: 'Cart is empty' });
        }
        
        const item = req.session.cart.find(item => 
            item.productId.toString() === req.params.productId
        );
        
        if (!item) {
            return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: 'Item not found in cart' });
        }
        
        // Update the quantity
        item.quantity = validQuantity;
        
        const cartCount = req.session.cart.reduce((total, item) => total + (item.quantity || 1), 0);
        // Cart item updated successfully
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('[Cart Update] Session save error:', err);
                return res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SESSION_SAVE_FAILED });
            }
            
            res.json({ 
                message: 'Cart updated',
                cartCount: cartCount
            });
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Transfer cart from localStorage to session
router.post('/api/cart/transfer', async (req, res) => {
    try {
        const { cartItems } = req.body;
        
        if (!cartItems || cartItems.length === 0) {
            return res.json({ message: 'No items to transfer' });
        }
        
        // Initialize session cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = [];
        }
        
        let transferredCount = 0;
        
        for (const item of cartItems) {
            // Validate product exists
            const product = await Product.findById(item.id);
            if (!product) {
                continue; // Skip invalid products
            }
            
            // Check if product already in session cart
            const existingItem = req.session.cart.find(sessionItem => 
                sessionItem.productId.toString() === item.id
            );
            
            if (existingItem) {
                existingItem.quantity += parseInt(item.quantity);
            } else {
                req.session.cart.push({
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: parseInt(item.quantity)
                });
            }
            
            transferredCount++;
        }
        
        const cartCount = req.session.cart.reduce((total, item) => total + item.quantity, 0);
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('[Cart Transfer] Session save error:', err);
                return res.status(500).json({ message: 'Error saving cart' });
            }
            
            res.json({ 
                message: `${transferredCount} items transferred to cart`,
                cartCount: cartCount
            });
        });
    } catch (error) {
        console.error('Error transferring cart:', error);
        res.status(500).json({ message: 'Error transferring cart' });
    }
});



// API: Get cart count
router.get('/api/cart/count', async (req, res) => {
    try {
        // Getting cart count

        
        // Fix any cart items with null quantities
        if (req.session.cart) {
            req.session.cart.forEach(item => {
                if (!item.quantity || item.quantity === null) {
                    item.quantity = 1;
                    // Fixed null quantity
                }
            });
        }
        
        const cartCount = req.session.cart ? 
            req.session.cart.reduce((total, item) => total + (item.quantity || 1), 0) : 0;
        
        // Cart count calculated
        res.json({ cartCount });
    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({ message: 'Error getting cart count' });
    }
});

// API: Fix cart items with null quantities
router.post('/api/cart/fix', async (req, res) => {
    try {
        // Fixing cart items with null quantities
        
        if (req.session.cart) {
            let fixedCount = 0;
            req.session.cart.forEach(item => {
                if (!item.quantity || item.quantity === null) {
                    item.quantity = 1;
                    fixedCount++;
                }
            });
            
            // Fixed cart items
            
            res.json({ 
                message: `Fixed ${fixedCount} cart items`,
                cartCount: req.session.cart.reduce((total, item) => total + (item.quantity || 1), 0)
            });
        } else {
            res.json({ message: 'No cart to fix', cartCount: 0 });
        }
    } catch (error) {
        console.error('Error fixing cart:', error);
        res.status(500).json({ message: 'Error fixing cart' });
    }
});

// Test route removed for production

// Simple clear cart route removed for production security

// API: Clear cart
router.delete('/api/cart/clear', authenticateToken, async (req, res) => {
            try {
            // Clearing cart for user
        
        // Clear the cart multiple ways to ensure it's cleared
        req.session.cart = [];
        delete req.session.cart;
        req.session.cart = [];
        
        // Also ensure the session user is set for consistency
        if (!req.session.user && req.user) {
            req.session.user = req.user;
        }
        
        // Force session save with more detailed error handling
        req.session.save((err) => {
            if (err) {
                console.error('[Clear Cart] Error saving session:', err);
                return res.status(500).json({ message: 'Error clearing cart' });
            }
            
            // Cart cleared successfully
            
            // Double-check the cart is actually empty
            const cartCount = req.session.cart ? req.session.cart.reduce((total, item) => total + item.quantity, 0) : 0;
            // Cart count updated
            
            // Add a small delay to ensure session is fully saved
            setTimeout(() => {
                res.json({ 
                    message: 'Cart cleared successfully',
                    cartCount: 0
                });
            }, CONSTANTS.SESSION_SAVE_DELAY);
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Error clearing cart' });
    }
});

// API: Create order
router.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, shippingAddress, city, state, zipCode, phone, paymentMethod } = req.body;

        // Validate items
        if (!items || items.length === 0) {
            return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: 'Order must contain at least one item' });
        }

        // Calculate totals
        let subtotal = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: `Product ${item.product} not found` });
            }
            if (product.stock < item.quantity) {
                return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: `Insufficient stock for ${product.name}` });
            }
            subtotal += product.price * item.quantity;

            // Update stock
            product.stock -= item.quantity;
            await product.save();
        }

        const shipping = subtotal > CONSTANTS.FREE_SHIPPING_THRESHOLD ? 0 : CONSTANTS.SHIPPING_COST_ALT;
        const tax = subtotal * CONSTANTS.TAX_RATE;
        const total = subtotal + shipping + tax;

        const order = new Order({
            user: req.userId,
            items,
            subtotal,
            shipping,
            tax,
            total,
            shippingAddress,
            city,
            state,
            zipCode,
            phone,
            paymentMethod,
            status: 'pending'
        });

        const savedOrder = await order.save();
        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('user', 'firstName lastName email')
            .populate('items.product', 'name image price brand');

        res.status(CONSTANTS.STATUS_CODES.CREATED).json({ order: populatedOrder });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Get user orders
router.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.userId })
            .populate('items.product', 'name image price')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Get single order
router.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName email')
            .populate('items.product', 'name image price brand');

        if (!order) {
            return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND });
        }

        // Check if user is authorized to view this order
        if (order.user._id.toString() !== req.userId) {
            return res.status(CONSTANTS.STATUS_CODES.FORBIDDEN).json({ message: CONSTANTS.ERROR_MESSAGES.FORBIDDEN });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: CONSTANTS.ERROR_MESSAGES.SERVER_ERROR });
    }
});

// API: Add review
router.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const { productId, rating, title, comment } = req.body;
        
        // Check if user already reviewed this product
        const existingReview = await Review.findOne({
            user: req.userId,
            product: productId
        });
        
        if (existingReview) {
            return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ 
                message: 'You have already reviewed this product' 
            });
        }
        
        const review = new Review({
            user: req.userId,
            product: productId,
            rating,
            title,
            comment
        });
        
        const savedReview = await review.save();
        
        // Update product rating
        const product = await Product.findById(productId);
        const reviews = await Review.find({ product: productId });
        
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length
        
        product.rating = averageRating;
        product.numReviews = reviews.length;
        await product.save();
        
        const populatedReview = await Review.findById(savedReview._id)
            .populate('user', 'firstName lastName');
            
        res.status(CONSTANTS.STATUS_CODES.CREATED).json(populatedReview);
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ message: error.message });
    }
});

// API: Get user reviews
router.get('/api/reviews/my-reviews', authenticateToken, async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.userId })
            .populate('product', 'name image')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});

// Debug and reset routes removed for production security


module.exports = router; 