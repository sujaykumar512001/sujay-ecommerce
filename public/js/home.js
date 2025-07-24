/**
 * Enhanced Home.js - Secure and Configurable Home Page Functionality
 * Handles featured products display, user interactions, and home page features
 */

(function() {
    'use strict';

    /**
     * Home Page Configuration
     */
    const homeConfig = {
        // API Endpoints
        endpoints: {
            featuredProducts: window.HOME_API_FEATURED_PRODUCTS || '/products/featured',
            products: window.HOME_API_PRODUCTS || '/products'
        },
        
        // Element IDs
        elements: {
            featuredProducts: window.HOME_ELEMENT_FEATURED_PRODUCTS || 'featuredProducts',
            shopNowBtn: window.HOME_ELEMENT_SHOP_NOW_BTN || 'shopNowBtn',
            viewAllBtn: window.HOME_ELEMENT_VIEW_ALL_BTN || 'viewAllBtn',
            categoryBtns: window.HOME_ELEMENT_CATEGORY_BTNS || '.category-btn'
        },
        
        // UI Configuration
        ui: {
            loadingDelay: parseInt(window.HOME_LOADING_DELAY) || 1000,
            retryDelay: parseInt(window.HOME_RETRY_DELAY) || 2000,
            descriptionLength: parseInt(window.HOME_DESCRIPTION_LENGTH) || 100,
            imagePlaceholder: window.HOME_IMAGE_PLACEHOLDER || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY2NjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Qcm9kdWN0PC90ZXh0Pjwvc3ZnPg==',
            currencySymbol: window.HOME_CURRENCY_SYMBOL || '$'
        },
        
        // Messages
        messages: {
            loading: window.HOME_MESSAGE_LOADING || 'Loading featured products...',
            noProducts: window.HOME_MESSAGE_NO_PRODUCTS || 'No featured products available.',
            loadError: window.HOME_MESSAGE_LOAD_ERROR || 'Unable to load featured products. Please try again later.',
            retryButton: window.HOME_MESSAGE_RETRY_BUTTON || 'Retry Loading Products',
            addToCart: window.HOME_MESSAGE_ADD_TO_CART || 'Add to Cart'
        },
        
        // CSS Classes
        classes: {
            loading: window.HOME_CLASS_LOADING || 'loading',
            productCard: window.HOME_CLASS_PRODUCT_CARD || 'product-card',
            productImage: window.HOME_CLASS_PRODUCT_IMAGE || 'product-image',
            productContent: window.HOME_CLASS_PRODUCT_CONTENT || 'product-content',
            productTitle: window.HOME_CLASS_PRODUCT_TITLE || 'product-title',
            productDescription: window.HOME_CLASS_PRODUCT_DESCRIPTION || 'product-description',
            productPrice: window.HOME_CLASS_PRODUCT_PRICE || 'product-price',
            productActions: window.HOME_CLASS_PRODUCT_ACTIONS || 'product-actions',
            originalPrice: window.HOME_CLASS_ORIGINAL_PRICE || 'original-price',
            currentPrice: window.HOME_CLASS_CURRENT_PRICE || 'current-price',
            discountBadge: window.HOME_CLASS_DISCOUNT_BADGE || 'discount-badge',
            addToCartBtn: window.HOME_CLASS_ADD_TO_CART_BTN || 'add-to-cart-btn',
            btnPrimary: window.HOME_CLASS_BTN_PRIMARY || 'btn btn-primary',
            textCenter: window.HOME_CLASS_TEXT_CENTER || 'text-center'
        },
        
        // Features
        features: {
            lazyLoading: window.HOME_FEATURE_LAZY_LOADING !== 'false',
            retryOnError: window.HOME_FEATURE_RETRY_ON_ERROR !== 'false',
            debugMode: window.HOME_DEBUG_MODE === 'true',
            accessibility: window.HOME_FEATURE_ACCESSIBILITY !== 'false'
        },
        
        // Validation
        validation: {
            maxDescriptionLength: parseInt(window.HOME_MAX_DESCRIPTION_LENGTH) || 100,
            maxProductNameLength: parseInt(window.HOME_MAX_PRODUCT_NAME_LENGTH) || 100,
            minPrice: parseFloat(window.HOME_MIN_PRICE) || 0,
            maxPrice: parseFloat(window.HOME_MAX_PRICE) || 999999
        },
        
        // Retry Configuration
        retry: {
            maxAttempts: parseInt(window.HOME_RETRY_MAX_ATTEMPTS) || 3,
            delay: parseInt(window.HOME_RETRY_DELAY) || 2000,
            backoff: parseFloat(window.HOME_RETRY_BACKOFF) || 2
        }
    };

    /**
     * Utility Functions
     */
    const utils = {
        /**
         * Sanitize HTML to prevent XSS
         */
        sanitizeHtml: function(str) {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Validate product data
         */
        validateProduct: function(product) {
            if (!product || typeof product !== 'object') return false;
            
            const required = ['_id', 'name', 'price'];
            const hasRequired = required.every(field => product[field] !== undefined && product[field] !== null);
            
            if (!hasRequired) return false;
            
            // Validate price
            const price = parseFloat(product.price);
            if (isNaN(price) || price < homeConfig.validation.minPrice || price > homeConfig.validation.maxPrice) {
                return false;
            }
            
            // Validate name length
            if (product.name.length > homeConfig.validation.maxProductNameLength) {
                return false;
            }
            
            return true;
        },

        /**
         * Safe DOM query selector
         */
        safeQuerySelector: function(selector, parent = document) {
            try {
                return parent.querySelector(selector);
            } catch (error) {
                console.warn(`[Home] Invalid selector: ${selector}`, error);
                return null;
            }
        },

        /**
         * Safe DOM query selector all
         */
        safeQuerySelectorAll: function(selector, parent = document) {
            try {
                return parent.querySelectorAll(selector);
            } catch (error) {
                console.warn(`[Home] Invalid selector: ${selector}`, error);
                return [];
            }
        },

        /**
         * Format currency
         */
        formatCurrency: function(amount) {
            const num = parseFloat(amount);
            if (isNaN(num)) return `${homeConfig.ui.currencySymbol}0.00`;
            return `${homeConfig.ui.currencySymbol}${num.toFixed(2)}`;
        },

        /**
         * Truncate text
         */
        truncateText: function(text, maxLength) {
            if (!text || typeof text !== 'string') return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        /**
         * Sleep utility
         */
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Validate configuration
         */
        validateConfig: function() {
            const errors = [];
            
            if (homeConfig.validation.maxDescriptionLength < 10) {
                errors.push('Max description length must be at least 10 characters');
            }
            
            if (homeConfig.retry.maxAttempts < 1) {
                errors.push('Retry max attempts must be at least 1');
            }
            
            if (errors.length > 0) {
                throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
            }
        }
    };

    /**
     * Product Manager
     */
    const productManager = {
        /**
         * Load featured products
         */
        async loadFeaturedProducts() {
            const container = utils.safeQuerySelector(`#${homeConfig.elements.featuredProducts}`);
            
            if (!container) {
                console.warn('[Home] Featured products container not found');
                return;
            }

            this.showLoadingState(container);

            try {
                const products = await this.fetchFeaturedProducts();
                this.displayProducts(products, container);
                
                if (homeConfig.features.debugMode) {
                    console.log('[Home] Featured products loaded successfully:', products.length);
                }
                
            } catch (error) {
                console.error('[Home] Error loading featured products:', error);
                this.showErrorState(container, error);
            }
        },

        /**
         * Fetch featured products from API
         */
        async fetchFeaturedProducts() {
            let lastError;
            
            for (let attempt = 1; attempt <= homeConfig.retry.maxAttempts; attempt++) {
                try {
                    const response = await fetch(homeConfig.endpoints.featuredProducts, {
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();
                    
                    // Handle both old format (array) and new format (object with data property)
                    const products = result.data || result;
                    
                    if (!Array.isArray(products)) {
                        throw new Error('Invalid products data format');
                    }

                    // Validate products
                    const validProducts = products.filter(utils.validateProduct);
                    
                    if (validProducts.length === 0 && products.length > 0) {
                        throw new Error('No valid products found');
                    }

                    return validProducts;
                    
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < homeConfig.retry.maxAttempts && homeConfig.features.retryOnError) {
                        const delay = homeConfig.retry.delay * Math.pow(homeConfig.retry.backoff, attempt - 1);
                        await utils.sleep(delay);
                    }
                }
            }

            throw lastError;
        },

        /**
         * Display products in container
         */
        displayProducts(products, container) {
            if (!container) return;

            if (!Array.isArray(products) || products.length === 0) {
                container.innerHTML = `
                    <div class="${homeConfig.classes.textCenter}">
                        <p>${homeConfig.messages.noProducts}</p>
                    </div>
                `;
                return;
            }

            const productsHtml = products.map(product => this.createProductCard(product)).join('');
            container.innerHTML = productsHtml;
        },

        /**
         * Create product card HTML
         */
        createProductCard(product) {
            if (!utils.validateProduct(product)) {
                console.warn('[Home] Invalid product data:', product);
                return '';
            }

            const discountedPrice = this.calculateDiscountedPrice(product);
            const originalPriceHTML = this.createOriginalPriceHTML(product);
            const discountBadgeHTML = this.createDiscountBadgeHTML(product);
            const description = this.createDescriptionHTML(product);

            return `
                <div class="${homeConfig.classes.productCard}" role="article" aria-label="Product: ${utils.sanitizeHtml(product.name)}">
                    <div class="${homeConfig.classes.productImage}">
                        <img src="${utils.sanitizeHtml(product.image || '')}" 
                             alt="${utils.sanitizeHtml(product.name)}" 
                             loading="${homeConfig.features.lazyLoading ? 'lazy' : 'eager'}"
                             onerror="this.src='${homeConfig.ui.imagePlaceholder}'"
                             ${homeConfig.features.accessibility ? 'aria-describedby="product-desc-' + utils.sanitizeHtml(product._id) + '"' : ''}>
                        ${discountBadgeHTML}
                    </div>
                    <div class="${homeConfig.classes.productContent}">
                        <h3 class="${homeConfig.classes.productTitle}">${utils.sanitizeHtml(product.name)}</h3>
                        <p class="${homeConfig.classes.productDescription}" 
                           ${homeConfig.features.accessibility ? 'id="product-desc-' + utils.sanitizeHtml(product._id) + '"' : ''}>
                            ${description}
                        </p>
                        <div class="${homeConfig.classes.productPrice}">
                            ${originalPriceHTML}
                            <span class="${homeConfig.classes.currentPrice}">${utils.formatCurrency(discountedPrice)}</span>
                        </div>
                        <div class="${homeConfig.classes.productActions}">
                            <button class="${homeConfig.classes.btnPrimary} ${homeConfig.classes.addToCartBtn}"
                                    data-product-id="${utils.sanitizeHtml(product._id)}"
                                    data-product-name="${utils.sanitizeHtml(product.name)}"
                                    data-product-price="${discountedPrice}"
                                    data-product-image="${utils.sanitizeHtml(product.image || '')}"
                                    ${homeConfig.features.accessibility ? 'aria-label="Add ' + utils.sanitizeHtml(product.name) + ' to cart"' : ''}>
                                ${homeConfig.messages.addToCart}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Calculate discounted price
         */
        calculateDiscountedPrice(product) {
            const price = parseFloat(product.price) || 0;
            const discount = parseFloat(product.discount) || 0;
            
            if (discount > 0 && discount <= 100) {
                return price * (1 - discount / 100);
            }
            
            return price;
        },

        /**
         * Create original price HTML
         */
        createOriginalPriceHTML(product) {
            const discount = parseFloat(product.discount) || 0;
            
            if (discount > 0 && discount <= 100) {
                return `<span class="${homeConfig.classes.originalPrice}">${utils.formatCurrency(product.price)}</span>`;
            }
            
            return '';
        },

        /**
         * Create discount badge HTML
         */
        createDiscountBadgeHTML(product) {
            const discount = parseFloat(product.discount) || 0;
            
            if (discount > 0 && discount <= 100) {
                return `<span class="${homeConfig.classes.discountBadge}" aria-label="${discount}% discount">-${discount}%</span>`;
            }
            
            return '';
        },

        /**
         * Create description HTML
         */
        createDescriptionHTML(product) {
            const description = product.description || '';
            const truncated = utils.truncateText(description, homeConfig.validation.maxDescriptionLength);
            return utils.sanitizeHtml(truncated);
        },

        /**
         * Show loading state
         */
        showLoadingState(container) {
            if (!container) return;
            
            container.innerHTML = `
                <div class="${homeConfig.classes.loading}" role="status" aria-live="polite">
                    ${homeConfig.messages.loading}
                </div>
            `;
        },

        /**
         * Show error state
         */
        showErrorState(container, error) {
            if (!container) return;
            
            container.innerHTML = `
                <div class="${homeConfig.classes.textCenter}">
                    <p>${homeConfig.messages.loadError}</p>
                    ${homeConfig.features.retryOnError ? `
                        <button class="${homeConfig.classes.btnPrimary}" 
                                onclick="this.disabled=true; homeManager.productManager.loadFeaturedProducts(); setTimeout(() => this.disabled=false, ${homeConfig.retry.delay})"
                                aria-label="Retry loading products">
                            ${homeConfig.messages.retryButton}
                        </button>
                    ` : ''}
                </div>
            `;
        }
    };

    /**
     * Event Manager
     */
    const eventManager = {
        /**
         * Setup home page event listeners
         */
        setupListeners() {
            this.setupButtonListeners();
            this.setupCartListeners();
            this.setupCategoryListeners();
            this.setupAccessibilityListeners();
        },

        /**
         * Setup button listeners
         */
        setupButtonListeners() {
            const shopNowBtn = utils.safeQuerySelector(`#${homeConfig.elements.shopNowBtn}`);
            if (shopNowBtn) {
                shopNowBtn.addEventListener('click', this.handleShopNowClick.bind(this));
            }

            const viewAllBtn = utils.safeQuerySelector(`#${homeConfig.elements.viewAllBtn}`);
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', this.handleViewAllClick.bind(this));
            }
        },

        /**
         * Setup cart listeners
         */
        setupCartListeners() {
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains(homeConfig.classes.addToCartBtn)) {
                    e.preventDefault();
                    this.handleAddToCartClick(e.target);
                }
            });
        },

        /**
         * Setup category listeners
         */
        setupCategoryListeners() {
            const categoryBtns = utils.safeQuerySelectorAll(homeConfig.elements.categoryBtns);
            categoryBtns.forEach(btn => {
                btn.addEventListener('click', this.handleCategoryClick.bind(this));
            });
        },

        /**
         * Setup accessibility listeners
         */
        setupAccessibilityListeners() {
            if (!homeConfig.features.accessibility) return;

            // Add keyboard navigation for product cards
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const target = e.target;
                    if (target.classList.contains(homeConfig.classes.addToCartBtn)) {
                        e.preventDefault();
                        this.handleAddToCartClick(target);
                    }
                }
            });
        },

        /**
         * Handle shop now button click
         */
        handleShopNowClick() {
            if (homeConfig.features.debugMode) {
                console.log('[Home] Shop now button clicked');
            }
            // Navigation logic can be added here
        },

        /**
         * Handle view all button click
         */
        handleViewAllClick() {
            if (homeConfig.features.debugMode) {
                console.log('[Home] View all button clicked');
            }
            // Navigation logic can be added here
        },

        /**
         * Handle category button click
         */
        handleCategoryClick(event) {
            const category = event.target.dataset.category;
            if (homeConfig.features.debugMode) {
                console.log('[Home] Category clicked:', category);
            }
            // Category filtering logic can be added here
        },

        /**
         * Handle add to cart button click
         */
        handleAddToCartClick(button) {
            const productId = button.dataset.productId;
            const productName = button.dataset.productName;
            const productPrice = button.dataset.productPrice;
            const productImage = button.dataset.productImage;

            if (!productId || !productName || !productPrice) {
                console.error('[Home] Missing product data for add to cart');
                return;
            }

            if (typeof window.addToCart === 'function') {
                window.addToCart(productId, productName, productPrice, productImage);
            } else {
                console.warn('[Home] addToCart function not available');
            }
        }
    };

    /**
     * Home Manager - Main controller
     */
    const homeManager = {
        /**
         * Initialize home page
         */
        init() {
            try {
                utils.validateConfig();
                
                if (window.homeInitialized) {
                    if (homeConfig.features.debugMode) {
                        console.log('[Home] Already initialized');
                    }
                    return;
                }
                
                window.homeInitialized = true;
                
                this.loadFeaturedProducts();
                eventManager.setupListeners();
                
                if (homeConfig.features.debugMode) {
                    console.log('[Home] Initialized successfully');
                }
                
            } catch (error) {
                console.error('[Home] Initialization failed:', error);
            }
        },

        /**
         * Load featured products
         */
        loadFeaturedProducts() {
            if (!window.featuredProductsLoaded) {
                productManager.loadFeaturedProducts();
                window.featuredProductsLoaded = true;
            }
        }
    };

    /**
     * Initialize when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', () => {
        homeManager.init();
    });

    /**
     * Global API
     */
    window.homeManager = {
        init: homeManager.init.bind(homeManager),
        loadFeaturedProducts: homeManager.loadFeaturedProducts.bind(homeManager),
        productManager: productManager,
        eventManager: eventManager,
        utils: utils,
        config: homeConfig
    };

})();
