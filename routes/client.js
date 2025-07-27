const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken, authenticateTokenWeb, optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const CONSTANTS = require('../config/constants');

// Client shop page - browse products with enhanced filtering
router.get('/shop', async (req, res) => {
    try {
        // Sample products data for demonstration
        const sampleProducts = [
            {
                _id: '507f1f77bcf86cd799439011',
                name: 'Elegant Women\'s Dress',
                category: 'Women',
                brand: 'Fashion Brand',
                price: 1299,
                originalPrice: 1599,
                discount: 19,
                rating: 4.5,
                reviewCount: 23,
                image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=500&fit=crop',
                description: 'Beautiful elegant dress perfect for any occasion'
            },
            {
                _id: '507f1f77bcf86cd799439012',
                name: 'Men\'s Casual Shirt',
                category: 'Men',
                brand: 'Elegance',
                price: 899,
                originalPrice: 1199,
                discount: 25,
                rating: 4.2,
                reviewCount: 18,
                image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop',
                description: 'Comfortable and stylish casual shirt for men'
            },
            {
                _id: '507f1f77bcf86cd799439013',
                name: 'Kids Summer Dress',
                category: 'Kids',
                brand: 'Denim Co',
                price: 599,
                originalPrice: 799,
                discount: 25,
                rating: 4.8,
                reviewCount: 12,
                image: 'https://images.unsplash.com/photo-1553451191-6d7232c0f5b8?w=400&h=500&fit=crop',
                description: 'Adorable summer dress for kids'
            },
            {
                _id: '507f1f77bcf86cd799439014',
                name: 'Abstract Art Painting',
                category: 'Paintings',
                brand: 'Art Studio',
                price: 2499,
                originalPrice: 2999,
                discount: 17,
                rating: 4.7,
                reviewCount: 8,
                image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=500&fit=crop',
                description: 'Beautiful abstract art painting for your home'
            },
            {
                _id: '507f1f77bcf86cd799439015',
                name: 'Women\'s Handbag',
                category: 'Women',
                brand: 'Fashion Brand',
                price: 1899,
                originalPrice: 2299,
                discount: 17,
                rating: 4.3,
                reviewCount: 31,
                image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500&fit=crop',
                description: 'Stylish and practical handbag for women'
            },
            {
                _id: '507f1f77bcf86cd799439016',
                name: 'Men\'s Formal Suit',
                category: 'Men',
                brand: 'Elegance',
                price: 3499,
                originalPrice: 4499,
                discount: 22,
                rating: 4.6,
                reviewCount: 15,
                image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=500&fit=crop',
                description: 'Professional formal suit for men'
            },
            {
                _id: '507f1f77bcf86cd799439017',
                name: 'Kids Winter Jacket',
                category: 'Kids',
                brand: 'Denim Co',
                price: 1299,
                originalPrice: 1599,
                discount: 19,
                rating: 4.4,
                reviewCount: 9,
                image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=500&fit=crop',
                description: 'Warm and cozy winter jacket for kids'
            },
            {
                _id: '507f1f77bcf86cd799439018',
                name: 'Landscape Painting',
                category: 'Paintings',
                brand: 'Art Studio',
                price: 1899,
                originalPrice: 2299,
                discount: 17,
                rating: 4.9,
                reviewCount: 6,
                image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
                description: 'Stunning landscape painting for nature lovers'
            }
        ];

        // Apply filters if provided
        let filteredProducts = [...sampleProducts];
        
        if (req.query.category && req.query.category !== 'All Categories') {
            filteredProducts = filteredProducts.filter(p => p.category === req.query.category);
        }
        
        if (req.query.brand && req.query.brand !== 'All Brands') {
            filteredProducts = filteredProducts.filter(p => p.brand === req.query.brand);
        }
        
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) || 
                p.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price_asc':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'rating':
                    filteredProducts.sort((a, b) => b.rating - a.rating);
                    break;
                default:
                    // Default: newest first (by ID)
                    filteredProducts.sort((a, b) => b._id.localeCompare(a._id));
            }
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filteredProducts.length / limit);

        res.render('client/shop', {
            title: 'Shop Products',
            products: paginatedProducts,
            categories: ['Men', 'Women', 'Kids', 'Paintings'],
            brands: ['Fashion Brand', 'Elegance', 'Denim Co', 'Art Studio'],
            currentPage: page,
            totalPages: totalPages,
            totalProducts: filteredProducts.length,
            currentSearch: req.query.search || '',
            currentCategory: req.query.category || '',
            currentBrand: req.query.brand || '',
            currentSort: req.query.sort || '',
            minPrice: req.query.minPrice || '',
            maxPrice: req.query.maxPrice || '',
            minRating: req.query.minRating || '',
            inStock: req.query.inStock || '',
            priceRange: { minPrice: 0, maxPrice: 4000 },
            user: req.user
        });
    } catch (error) {
        console.error('Shop page error:', error);
        // Render shop page with empty data instead of error page
        res.render('client/shop', {
            title: 'Shop Products',
            products: [],
            categories: ['Men', 'Women', 'Kids', 'Paintings'],
            brands: ['Fashion Brand', 'Elegance', 'Denim Co', 'Art Studio'],
            currentPage: 1,
            totalPages: 1,
            totalProducts: 0,
            currentSearch: '',
            currentCategory: '',
            currentBrand: '',
            currentSort: '',
            minPrice: '',
            maxPrice: '',
            minRating: '',
            inStock: '',
            priceRange: { minPrice: 0, maxPrice: 1000 },
            user: req.user
        });
    }
});

// Enhanced product detail page
router.get('/product/:id', async (req, res) => {
    try {
        // Sample products data for demonstration
        const sampleProducts = [
            {
                _id: '507f1f77bcf86cd799439011',
                name: 'Elegant Women\'s Dress',
                category: 'Women',
                brand: 'Fashion Brand',
                price: 1299,
                originalPrice: 1599,
                discount: 19,
                rating: 4.5,
                reviewCount: 23,
                image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=500&fit=crop',
                description: 'Beautiful elegant dress perfect for any occasion. This stunning dress features a flattering silhouette with premium fabric that ensures comfort and style. Perfect for weddings, parties, or any special event where you want to make a lasting impression.'
            },
            {
                _id: '507f1f77bcf86cd799439012',
                name: 'Men\'s Casual Shirt',
                category: 'Men',
                brand: 'Elegance',
                price: 899,
                originalPrice: 1199,
                discount: 25,
                rating: 4.2,
                reviewCount: 18,
                image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop',
                description: 'Comfortable and stylish casual shirt for men. Made from breathable cotton fabric, this shirt offers the perfect balance of comfort and style. Ideal for casual outings, office wear, or weekend gatherings.'
            },
            {
                _id: '507f1f77bcf86cd799439013',
                name: 'Kids Summer Dress',
                category: 'Kids',
                brand: 'Denim Co',
                price: 599,
                originalPrice: 799,
                discount: 25,
                rating: 4.8,
                reviewCount: 12,
                image: 'https://images.unsplash.com/photo-1553451191-6d7232c0f5b8?w=400&h=500&fit=crop',
                description: 'Adorable summer dress for kids. This lightweight and comfortable dress is perfect for summer days. Features a cute design with soft fabric that\'s gentle on children\'s skin.'
            },
            {
                _id: '507f1f77bcf86cd799439014',
                name: 'Abstract Art Painting',
                category: 'Paintings',
                brand: 'Art Studio',
                price: 2499,
                originalPrice: 2999,
                discount: 17,
                rating: 4.7,
                reviewCount: 8,
                image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=500&fit=crop',
                description: 'Beautiful abstract art painting for your home. This hand-painted masterpiece adds a touch of sophistication to any room. Each piece is unique and created with premium materials.'
            },
            {
                _id: '507f1f77bcf86cd799439015',
                name: 'Women\'s Handbag',
                category: 'Women',
                brand: 'Fashion Brand',
                price: 1899,
                originalPrice: 2299,
                discount: 17,
                rating: 4.3,
                reviewCount: 31,
                image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500&fit=crop',
                description: 'Stylish and practical handbag for women. This versatile bag features multiple compartments for organization and is made from durable materials. Perfect for everyday use or special occasions.'
            },
            {
                _id: '507f1f77bcf86cd799439016',
                name: 'Men\'s Formal Suit',
                category: 'Men',
                brand: 'Elegance',
                price: 3499,
                originalPrice: 4499,
                discount: 22,
                rating: 4.6,
                reviewCount: 15,
                image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=500&fit=crop',
                description: 'Professional formal suit for men. This premium suit is crafted from high-quality fabric and features a modern cut that ensures a perfect fit. Ideal for business meetings, interviews, or formal events.'
            },
            {
                _id: '507f1f77bcf86cd799439017',
                name: 'Kids Winter Jacket',
                category: 'Kids',
                brand: 'Denim Co',
                price: 1299,
                originalPrice: 1599,
                discount: 19,
                rating: 4.4,
                reviewCount: 9,
                image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=500&fit=crop',
                description: 'Warm and cozy winter jacket for kids. This insulated jacket provides excellent protection against cold weather while maintaining comfort and style. Features a durable design that withstands active play.'
            },
            {
                _id: '507f1f77bcf86cd799439018',
                name: 'Landscape Painting',
                category: 'Paintings',
                brand: 'Art Studio',
                price: 1899,
                originalPrice: 2299,
                discount: 17,
                rating: 4.9,
                reviewCount: 6,
                image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
                description: 'Stunning landscape painting for nature lovers. This beautiful artwork captures the essence of natural beauty with vibrant colors and detailed brushwork. A perfect addition to any home or office.'
            }
        ];

        // Find the product by ID
        const product = sampleProducts.find(p => p._id === req.params.id);
        
        if (!product) {
            return res.status(404).render('error', { 
                title: 'Product Not Found',
                message: 'The product you are looking for does not exist.',
                statusCode: 404,
                user: req.user
            });
        }

        // Get related products (same category, different product)
        const relatedProducts = sampleProducts.filter(p => 
            p.category === product.category && p._id !== product._id
        ).slice(0, 4);

        res.render('client/product-detail', {
            title: product.name,
            product: product,
            relatedProducts: relatedProducts,
            user: req.user
        });

    } catch (error) {
        console.error('Product detail error:', error);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Something went wrong while loading the product.',
            statusCode: 500,
            user: req.user
        });
    }
});

// Product search with suggestions
router.get('/search', async (req, res, next) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            // Database not connected, using fallback data for search...
            // Use fallback data instead of trying to connect
            const templateData = {
                title: 'Search Products',
                products: [],
                searchQuery: req.query.q || '',
                category: req.query.category || '',
                brand: req.query.brand || '',
                minPrice: req.query.minPrice || '',
                maxPrice: req.query.maxPrice || '',
                sort: req.query.sort || 'relevance',
                currentPage: 1,
                totalPages: 1,
                totalProducts: 0,
                categories: [],
                brands: [],
                user: req.user || null,
                message: 'Database connection unavailable. Please try again later.'
            };
            return res.render('client/search', templateData);
        }

        const searchQuery = req.query.q || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const minPrice = req.query.minPrice || '';
        const maxPrice = req.query.maxPrice || '';
        const sort = req.query.sort || 'relevance';
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        // Build search query
        let query = {};
        
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
                { brand: { $regex: searchQuery, $options: 'i' } },
                { category: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Sort options
        let sortOption = {};
        switch (sort) {
            case 'price_asc':
                sortOption = { price: 1 };
                break;
            case 'price_desc':
                sortOption = { price: -1 };
                break;
            case 'rating':
                sortOption = { rating: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Get filter options
        const categories = await Product.distinct('category');
        const brands = await Product.distinct('brand');

        // Ensure all variables are defined for the template
        const templateData = {
            title: searchQuery ? `Search Results for "${searchQuery}"` : 'Search Products',
            products: products || [],
            searchQuery: searchQuery || '',
            selectedCategory: category || '',
            selectedBrand: brand || '',
            minPrice: minPrice || '',
            maxPrice: maxPrice || '',
            sort: sort || 'relevance',
            page: page || 1,
            limit: limit || 12,
            currentPage: page || 1,
            totalPages: totalPages || 1,
            totalProducts: totalProducts || 0,
            categories: categories || [],
            brands: brands || [],
            user: req.user || null
        };

        res.render('client/search', templateData);
    } catch (error) {
        console.error('Search route error:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error performing search'
        });
    }
});

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

// Category index page (all categories)
router.get('/category', async (req, res, next) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            // Database not connected, using fallback data for categories...
            // Use fallback data instead of trying to connect
            const templateData = {
                title: 'All Categories',
                categories: [],
                user: req.user || null,
                message: 'Database connection unavailable. Please try again later.'
            };
            return res.render('client/category', templateData);
        }

        const categories = await Product.distinct('category');
        const categoryStats = [];
        
        for (const category of categories) {
            const count = await Product.countDocuments({ category });
            categoryStats.push({ name: category, count });
        }
        
        // Ensure all variables are defined for the template
        const templateData = {
            title: 'All Categories',
            categories: categoryStats || [],
            categoryName: 'All Categories',
            brands: [],
            products: [],
            page: 1,
            limit: 12,
            user: req.user || null
        };
        
        res.render('client/category', templateData);
    } catch (error) {
        console.error('Category route error:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading categories'
        });
    }
});

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
        categoryName: category,
        subcategories,
        currentPage: page,
        totalPages,
        totalProducts,
        brands: [],
        page: page,
        limit: limit,
        user: req.user
    });
}));

// Brand index page (all brands)
router.get('/brand', async (req, res, next) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            // Database not connected, using fallback data for brands...
            // Use fallback data instead of trying to connect
            const templateData = {
                title: 'All Brands',
                brands: [],
                user: req.user || null,
                message: 'Database connection unavailable. Please try again later.'
            };
            return res.render('client/brand', templateData);
        }

        const brands = await Product.distinct('brand');
        const brandStats = [];
        
        for (const brand of brands) {
            const count = await Product.countDocuments({ brand });
            brandStats.push({ name: brand, count });
        }
        
        // Ensure all variables are defined for the template
        const templateData = {
            title: 'All Brands',
            brands: brandStats || [],
            brandName: 'All Brands',
            categories: [],
            products: [],
            page: 1,
            limit: 12,
            user: req.user || null
        };
        
        res.render('client/brand', templateData);
    } catch (error) {
        console.error('Brand route error:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading brands'
        });
    }
});

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
        brandName: brand,
        currentPage: page,
        totalPages,
        totalProducts,
        categories: [],
        brands: [],
        user: req.user
    });
}));

// New arrivals
router.get('/new-arrivals', async (req, res, next) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            // Database not connected, using fallback data for new arrivals...
            // Use fallback data instead of trying to connect
            const templateData = {
                title: 'New Arrivals',
                products: [],
                currentPage: 1,
                totalPages: 1,
                totalProducts: 0,
                user: req.user || null,
                message: 'Database connection unavailable. Please try again later.'
            };
            return res.render('client/new-arrivals', templateData);
        }

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
        
        // Ensure all variables are defined for the template
        const templateData = {
            title: 'New Arrivals',
            products: products || [],
            categories: [],
            brands: [],
            page: page || 1,
            limit: limit || 12,
            totalProducts: totalProducts || 0,
            currentPage: page || 1,
            totalPages: totalPages || 1,
            user: req.user || null
        };
        
        res.render('client/new-arrivals', templateData);
    } catch (error) {
        console.error('New arrivals route error:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading new arrivals'
        });
    }
});

// Best sellers
router.get('/best-sellers', async (req, res, next) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            // Database not connected, using fallback data for best sellers...
            // Use fallback data instead of trying to connect
            const templateData = {
                title: 'Best Sellers',
                products: [],
                categories: [],
                brands: [],
                page: 1,
                limit: 12,
                totalProducts: 0,
                currentPage: 1,
                totalPages: 1,
                user: req.user || null,
                message: 'Database connection unavailable. Please try again later.'
            };
            return res.render('client/best-sellers', templateData);
        }

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
        
        // Ensure all variables are defined for the template
        const templateData = {
            title: 'Best Sellers',
            products: products || [],
            categories: [],
            brands: [],
            page: page || 1,
            limit: limit || 12,
            totalProducts: totalProducts || 0,
            currentPage: page || 1,
            totalPages: totalPages || 1,
            user: req.user || null
        };
        
        res.render('client/best-sellers', templateData);
    } catch (error) {
        console.error('Best sellers route error:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading best sellers'
        });
    }
});

// Sale/Deals page
router.get('/deals', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    // Build query for deals
    let query = {};
    
    // Search filter
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
    
    // Discount filter
    if (req.query.discount) {
        const minDiscount = parseInt(req.query.discount);
        query.$or = [
            { discountPercentage: { $gte: minDiscount } },
            { onSale: true }
        ];
    }
    
    // If no specific filters, show products that might be on sale or have discounts
    if (!req.query.search && !req.query.category && !req.query.discount) {
        query.$or = [
            { discountPercentage: { $gt: 0 } },
            { onSale: true },
            { price: { $lt: 1000 } }, // Show products under 1000 as "deals"
            { category: { $in: ['Women', 'Men', 'Kids'] } } // Show fashion items
        ];
    }
    
    // Sort options
    let sort = { createdAt: -1 }; // Default: newest first
    switch (req.query.sort) {
        case 'discount_desc':
            sort = { discountPercentage: -1 };
            break;
        case 'price_asc':
            sort = { price: 1 };
            break;
        case 'price_desc':
            sort = { price: -1 };
            break;
    }
    
    const products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
    
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Get categories for filter
    const categories = await Product.distinct('category');
    
    res.render('client/deals', {
        title: 'Deals & Discounts',
        products,
        currentPage: page,
        totalPages,
        totalProducts,
        categories,
        currentSearch: req.query.search || '',
        currentCategory: req.query.category || '',
        currentDiscount: req.query.discount || '',
        currentSort: req.query.sort || '',
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
        .populate('user', 'firstName lastName')
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

// Cart page route
router.get('/cart', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        let cartItems = [];
    let subtotal = 0;
    let totalItems = 0;
    
        if (cart.length > 0) {
            const productIds = cart.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).lean();
        
            cartItems = cart.map(item => {
                const product = products.find(p => p._id.toString() === item.productId);
            if (product) {
                    const itemTotal = product.price * item.quantity;
                subtotal += itemTotal;
                    totalItems += item.quantity;
                return {
                        ...item,
                        product,
                        itemTotal
                    };
                }
                return null;
            }).filter(Boolean);
        }
        
        const tax = subtotal * CONSTANTS.TAX_RATE;
        const shipping = subtotal > CONSTANTS.FREE_SHIPPING_THRESHOLD ? 0 : CONSTANTS.SHIPPING_COST;
        const total = subtotal + tax + shipping;
        
        res.render('client/cart', {
            title: 'Shopping Cart',
            cartItems,
            subtotal,
            tax,
            shipping,
            total,
            totalItems,
            user: req.user || null
        });
    } catch (error) {
        console.error('Cart page error:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading cart page'
        });
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