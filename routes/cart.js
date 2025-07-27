const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken, authenticateTokenWeb, optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const CONSTANTS = require('../config/constants');

// Cart page route removed - handled by client routes

// Add item to cart
router.post('/add', optionalAuth, asyncHandler(async (req, res) => {
    console.log('Cart add request:', {
        body: req.body,
        session: req.session ? 'exists' : 'missing',
        cart: req.session?.cart ? req.session.cart.length : 'no cart'
    });
    
    const { productId, quantity = 1 } = req.body;
        
    if (!productId) {
        console.log('No productId provided');
        return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ success: false, message: CONSTANTS.ERROR_MESSAGES.INVALID_INPUT });
    }
    
    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
        console.log('Product not found:', productId);
        return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ success: false, message: CONSTANTS.ERROR_MESSAGES.NOT_FOUND });
    }

    if (product.stock < quantity) {
        console.log('Insufficient stock:', { requested: quantity, available: product.stock });
        return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ 
            success: false, 
            message: `Only ${product.stock} items available in stock` 
        });
    }
    
    // Initialize cart if it doesn't exist
    if (!req.session.cart) {
        console.log('Initializing new cart');
        req.session.cart = [];
    }

    // Check if item already exists in cart
    const existingItemIndex = req.session.cart.findIndex(
        item => item.productId === productId
    );
    
    if (existingItemIndex > -1) {
        // Update quantity
        const newQuantity = req.session.cart[existingItemIndex].quantity + quantity;
        if (newQuantity > product.stock) {
            console.log('Cannot add more items - stock limit');
            return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: `Cannot add more than ${product.stock} items` 
            });
        }
        req.session.cart[existingItemIndex].quantity = newQuantity;
        console.log('Updated existing item quantity:', newQuantity);
    } else {
        // Add new item
        req.session.cart.push({
            productId,
            quantity,
            addedAt: new Date()
        });
        console.log('Added new item to cart');
    }
    
    // Calculate cart totals
    const cartTotal = req.session.cart.reduce((total, item) => total + item.quantity, 0);
    
    console.log('Cart add success:', { cartTotal, cartItems: req.session.cart.length });
    
    // Save session to ensure cart data is persisted
    req.session.save((err) => {
        if (err) {
            console.error('Session save error in cart add:', err);
            return res.status(500).json({ success: false, message: 'Failed to save cart' });
        }
        
        res.json({
            success: true,
            message: 'Item added to cart',
            cartTotal,
            cartItems: req.session.cart.length
        });
    });
}));

// Update cart item quantity (POST method for JavaScript compatibility)
router.post('/update', optionalAuth, asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;

    if (!req.session.cart) {
        return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Cart is empty' });
    }

    const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
        return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Item not found in cart' });
    }

    // Validate quantity
    if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        req.session.cart.splice(itemIndex, 1);
        
        // Save session to ensure cart data is persisted
        req.session.save((err) => {
            if (err) {
                console.error('Session save error in cart update (remove):', err);
                return res.status(500).json({ success: false, message: 'Failed to save cart' });
            }
            
            res.json({ success: true, message: 'Item removed from cart' });
        });
        return;
    }
    
    // Check stock availability
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (quantity > product.stock) {
        return res.status(400).json({ 
            success: false, 
            message: `Only ${product.stock} items available in stock` 
        });
    }
    
    // Update quantity
    req.session.cart[itemIndex].quantity = quantity;
    
    // Save session to ensure cart data is persisted
    req.session.save((err) => {
        if (err) {
            console.error('Session save error in cart update:', err);
            return res.status(500).json({ success: false, message: 'Failed to save cart' });
        }
        
        res.json({ success: true, message: 'Cart updated' });
    });
}));

// Update cart item quantity (PUT method for REST compliance)
router.put('/update/:productId', optionalAuth, asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;

        if (!req.session.cart) {
            return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Cart is empty' });
        }

    const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
            return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Item not found in cart' });
        }

    // Validate quantity
        if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        req.session.cart.splice(itemIndex, 1);
        res.json({ success: true, message: 'Item removed from cart' });
        return;
    }
    
    // Check stock availability
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (quantity > product.stock) {
        return res.status(400).json({ 
            success: false, 
            message: `Only ${product.stockQuantity} items available in stock` 
        });
    }
    
    // Update quantity
    req.session.cart[itemIndex].quantity = quantity;
    
    // Save session to ensure cart data is persisted
    req.session.save((err) => {
        if (err) {
            console.error('Session save error in cart update:', err);
            return res.status(500).json({ success: false, message: 'Failed to save cart' });
        }
        
        res.json({ success: true, message: 'Cart updated' });
    });
}));

// Remove item from cart (POST method for JavaScript compatibility)
router.post('/remove', optionalAuth, asyncHandler(async (req, res) => {
    const { productId } = req.body;

    if (!req.session.cart) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
        return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
    
    req.session.cart.splice(itemIndex, 1);
    
    // Save session to ensure cart data is persisted
    req.session.save((err) => {
        if (err) {
            console.error('Session save error in cart remove:', err);
            return res.status(500).json({ success: false, message: 'Failed to save cart' });
        }
        
        res.json({ success: true, message: 'Item removed from cart' });
    });
}));

// Remove item from cart (DELETE method for REST compliance)
router.delete('/remove/:productId', optionalAuth, asyncHandler(async (req, res) => {
        const { productId } = req.params;

        if (!req.session.cart) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

    const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
        return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
    
    req.session.cart.splice(itemIndex, 1);
    
    // Save session to ensure cart data is persisted
    req.session.save((err) => {
        if (err) {
            console.error('Session save error in cart remove:', err);
            return res.status(500).json({ success: false, message: 'Failed to save cart' });
        }
        
        res.json({ success: true, message: 'Item removed from cart' });
    });
}));

// Clear cart
router.delete('/clear', authenticateTokenWeb, asyncHandler(async (req, res) => {
    req.session.cart = [];
    res.json({ 
        success: true, 
        message: 'Cart cleared successfully',
        cartItems: 0
    });
}));

// Get cart count (for header/mini cart)
router.get('/count', optionalAuth, asyncHandler(async (req, res) => {
    console.log('Cart count request - session cart:', req.session?.cart ? req.session.cart.length : 'no cart');
    const cart = req.session.cart || [];
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    console.log('Cart count response:', cartCount);
    
    res.json({
        success: true,
        count: cartCount
    });
}));

// Get cart summary (for header/mini cart)
router.get('/summary', optionalAuth, asyncHandler(async (req, res) => {
    const cart = req.session.cart || [];
    let cartItems = [];
    let total = 0;
    
    if (cart.length > 0) {
        const productIds = cart.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } })
            .select('name price images')
            .lean();
        
        cartItems = cart.map(item => {
            const product = products.find(p => p._id.toString() === item.productId);
            if (product) {
                const itemTotal = product.price * item.quantity;
                total += itemTotal;
                return {
                    ...item,
                    product: {
                        name: product.name,
                        price: product.price,
                        image: product.images[0]
                    },
                    itemTotal
                };
            }
            return null;
        }).filter(Boolean);
    }

        res.json({
            success: true,
        cartItems,
        total,
        itemCount: cart.length
    });
}));

// Save cart for later (for guest users)
router.post('/save', optionalAuth, asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // In a real application, you might save this to a database
    // For now, we'll just acknowledge the request
    res.json({ 
        success: true, 
        message: 'Cart saved successfully. You can retrieve it later by logging in.' 
    });
}));

// Apply coupon code
router.post('/apply-coupon', optionalAuth, asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // Mock coupon validation - in real app, check against database
    const validCoupons = {
        'SAVE10': CONSTANTS.COUPONS.SAVE10,
        'FREESHIP': CONSTANTS.COUPONS.FREESHIP,
        'WELCOME20': { discount: 20, type: 'percentage' } // TODO: Move to CONSTANTS
    };
    
    const coupon = validCoupons[code];
    if (!coupon) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    }
    
    req.session.coupon = { code, ...coupon };
    
    res.json({ 
        success: true, 
        message: 'Coupon applied successfully',
        coupon: req.session.coupon
    });
}));

// Remove coupon
router.delete('/remove-coupon', optionalAuth, asyncHandler(async (req, res) => {
    delete req.session.coupon;
    res.json({ success: true, message: 'Coupon removed' });
}));

// Checkout page
router.get('/checkout', authenticateTokenWeb, asyncHandler(async (req, res) => {
    let cart = req.session.cart || [];
    
    if (cart.length === 0) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/cart');
    }
    
    // Get product details
    const productIds = cart.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    
    const cartItems = cart.map(item => {
        const product = products.find(p => p._id.toString() === item.productId);
        if (product) {
            return {
                ...item,
                product,
                itemTotal: product.price * item.quantity
            };
        }
        return null;
    }).filter(Boolean);
    
    // Calculate totals
    const subtotal = cartItems.reduce((total, item) => total + item.itemTotal, 0);
    const tax = subtotal * CONSTANTS.TAX_RATE;
    const shipping = subtotal > CONSTANTS.FREE_SHIPPING_THRESHOLD ? 0 : CONSTANTS.SHIPPING_COST;
    const couponDiscount = req.session.coupon ? 
        (req.session.coupon.type === 'percentage' ? 
            subtotal * (req.session.coupon.discount / 100) : 
            req.session.coupon.discount) : 0;
    const total = subtotal + tax + shipping - couponDiscount;
    
    res.render('client/checkout', {
        title: 'Checkout',
        cartItems,
        subtotal,
        tax,
        shipping,
        couponDiscount,
        total,
        coupon: req.session.coupon,
        user: req.user
    });
}));

// Process checkout
router.post('/checkout', authenticateTokenWeb, asyncHandler(async (req, res) => {
    const { 
        shippingAddress, 
        billingAddress, 
        paymentMethod, 
        saveAddress 
    } = req.body;
    
    let cart = req.session.cart || [];
    
    if (cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // Validate stock availability
    const productIds = cart.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    
    for (const item of cart) {
        const product = products.find(p => p._id.toString() === item.productId);
        if (!product) {
            return res.status(400).json({ 
                success: false, 
                message: `Product ${item.productId} not found` 
            });
        }
        if (product.stock < item.quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient stock for ${product.name}` 
            });
        }
    }
    
    // Calculate totals
    const cartItems = cart.map(item => {
        const product = products.find(p => p._id.toString() === item.productId);
        return {
            product: product._id,
            quantity: item.quantity,
            price: product.price,
            itemTotal: product.price * item.quantity
        };
    });
    
    const subtotal = cartItems.reduce((total, item) => total + item.itemTotal, 0);
    const tax = subtotal * CONSTANTS.TAX_RATE;
    const shipping = subtotal > CONSTANTS.FREE_SHIPPING_THRESHOLD ? 0 : CONSTANTS.SHIPPING_COST;
    const couponDiscount = req.session.coupon ? 
        (req.session.coupon.type === 'percentage' ? 
            subtotal * (req.session.coupon.discount / 100) : 
            req.session.coupon.discount) : 0;
    const total = subtotal + tax + shipping - couponDiscount;
    
    // Create order
    const order = new Order({
        user: req.user._id,
        items: cartItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        subtotal,
        tax,
        shipping,
        couponDiscount,
        total,
        status: 'pending'
    });
    
    await order.save();
    
    // Update product stock
    for (const item of cart) {
        const product = products.find(p => p._id.toString() === item.productId);
        product.stock -= item.quantity;
        product.soldCount += item.quantity;
        await product.save();
    }
    
    // Save address if requested
    if (saveAddress && req.user) {
        const user = await User.findById(req.user._id);
        user.addresses = user.addresses || [];
        user.addresses.push(shippingAddress);
        await user.save();
    }
    
    // Clear cart
    req.session.cart = [];
    delete req.session.coupon;
    
    res.json({
        success: true,
        message: 'Order placed successfully',
        orderId: order._id
    });
}));

module.exports = router;
