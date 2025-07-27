/**
 * Enhanced E-Commerce Application JavaScript
 * Main application functionality and utilities with comprehensive configuration
 */

(function() {
    'use strict';

    /**
     * Application Configuration
     */
    const appConfig = {
        // API Endpoints
        endpoints: {
            search: window.APP_API_SEARCH || '/api/search/suggestions',
            cart: {
                add: window.APP_API_CART_ADD || '/api/cart/add',
                remove: window.APP_API_CART_REMOVE || '/api/cart/remove',
                update: window.APP_API_CART_UPDATE || '/api/cart/update',
                count: window.APP_API_CART_COUNT || '/api/cart/count'
            },
            wishlist: {
                add: window.APP_API_WISHLIST_ADD || '/api/wishlist/add',
                remove: window.APP_API_WISHLIST_REMOVE || '/api/wishlist/remove',
                count: window.APP_API_WISHLIST_COUNT || '/api/wishlist/count'
            },
            products: window.APP_API_PRODUCTS || '/api/products'
        },
        
        // Element Selectors
        selectors: {
            navbar: window.APP_SELECTOR_NAVBAR || '.navbar',
            navbarToggler: window.APP_SELECTOR_NAVBAR_TOGGLER || '.navbar-toggler',
            navbarCollapse: window.APP_SELECTOR_NAVBAR_COLLAPSE || '.navbar-collapse',
            dropdownToggle: window.APP_SELECTOR_DROPDOWN_TOGGLE || '.dropdown-toggle',
            dropdownMenu: window.APP_SELECTOR_DROPDOWN_MENU || '.dropdown-menu',
            searchForm: window.APP_SELECTOR_SEARCH_FORM || '.search-form',
            searchInput: window.APP_SELECTOR_SEARCH_INPUT || '.search-input',
            searchSuggestions: window.APP_SELECTOR_SEARCH_SUGGESTIONS || '.search-suggestions',
            cartCount: window.APP_SELECTOR_CART_COUNT || '.cart-count',
            wishlistCount: window.APP_SELECTOR_WISHLIST_COUNT || '.wishlist-count',
            backToTop: window.APP_SELECTOR_BACK_TO_TOP || '.back-to-top',
            cartSidebar: window.APP_SELECTOR_CART_SIDEBAR || '.cart-sidebar'
        },
        
        // UI Configuration
        ui: {
            searchDelay: parseInt(window.APP_SEARCH_DELAY) || 300,
            searchMinLength: parseInt(window.APP_SEARCH_MIN_LENGTH) || 2,
            toastDuration: parseInt(window.APP_TOAST_DURATION) || 4000,
            scrollThreshold: parseInt(window.APP_SCROLL_THRESHOLD) || 300,
            navbarScrollThreshold: parseInt(window.APP_NAVBAR_SCROLL_THRESHOLD) || 50,
            animationDelay: parseInt(window.APP_ANIMATION_DELAY) || 200,
            toastZIndex: parseInt(window.APP_TOAST_Z_INDEX) || 1055
        },
        
        // Messages
        messages: {
            auth: {
                loginRequired: window.APP_MESSAGE_LOGIN_REQUIRED || 'Please login to add items to cart',
                loginRequiredWishlist: window.APP_MESSAGE_LOGIN_REQUIRED_WISHLIST || 'Please login to add items to wishlist',
                logoutSuccess: window.APP_MESSAGE_LOGOUT_SUCCESS || 'Logged out successfully'
            },
            cart: {
                addSuccess: window.APP_MESSAGE_CART_ADD_SUCCESS || 'Product added to cart!',
                removeSuccess: window.APP_MESSAGE_CART_REMOVE_SUCCESS || 'Product removed from cart',
                updateSuccess: window.APP_MESSAGE_CART_UPDATE_SUCCESS || 'Cart updated successfully',
                addError: window.APP_MESSAGE_CART_ADD_ERROR || 'Failed to add product to cart',
                removeError: window.APP_MESSAGE_CART_REMOVE_ERROR || 'Failed to remove product from cart',
                updateError: window.APP_MESSAGE_CART_UPDATE_ERROR || 'Failed to update cart'
            },
            wishlist: {
                addSuccess: window.APP_MESSAGE_WISHLIST_ADD_SUCCESS || 'Added to wishlist',
                removeSuccess: window.APP_MESSAGE_WISHLIST_REMOVE_SUCCESS || 'Removed from wishlist',
                updateError: window.APP_MESSAGE_WISHLIST_UPDATE_ERROR || 'Failed to update wishlist'
            },
            general: {
                error: window.APP_MESSAGE_GENERAL_ERROR || 'An error occurred. Please try again.',
                loading: window.APP_MESSAGE_LOADING || 'Loading...',
                adding: window.APP_MESSAGE_ADDING || 'Adding...'
            },
            modal: {
                loadError: window.APP_MESSAGE_MODAL_LOAD_ERROR || 'Failed to load product details'
            }
        },
        
        // CSS Classes
        classes: {
            show: window.APP_CLASS_SHOW || 'show',
            scrolled: window.APP_CLASS_SCROLLED || 'scrolled',
            animateIn: window.APP_CLASS_ANIMATE_IN || 'animate-in',
            animateOnScroll: window.APP_CLASS_ANIMATE_ON_SCROLL || 'animate-on-scroll',
            animateOnLoad: window.APP_CLASS_ANIMATE_ON_LOAD || 'animate-on-load',
            inWishlist: window.APP_CLASS_IN_WISHLIST || 'in-wishlist',
            loginRequired: window.APP_CLASS_LOGIN_REQUIRED || 'login-required',
            logoutRequired: window.APP_CLASS_LOGOUT_REQUIRED || 'logout-required',
            userName: window.APP_CLASS_USER_NAME || 'user-name',
            toastContainer: window.APP_CLASS_TOAST_CONTAINER || 'toast-container',
            toast: window.APP_CLASS_TOAST || 'toast',
            modal: window.APP_CLASS_MODAL || 'modal',
            quickViewBtn: window.APP_CLASS_QUICK_VIEW_BTN || 'quick-view-btn',
            addToCartBtn: window.APP_CLASS_ADD_TO_CART_BTN || 'add-to-cart-btn',
            removeFromCartBtn: window.APP_CLASS_REMOVE_FROM_CART_BTN || 'remove-from-cart-btn',
            updateCartQuantity: window.APP_CLASS_UPDATE_CART_QUANTITY || 'update-cart-quantity',
            addToWishlistBtn: window.APP_CLASS_ADD_TO_WISHLIST_BTN || 'add-to-wishlist-btn'
        },
        
        // Features
        features: {
            debugMode: window.APP_DEBUG_MODE === 'true',
            accessibility: window.APP_FEATURE_ACCESSIBILITY !== 'false',
            retryOnError: window.APP_FEATURE_RETRY_ON_ERROR !== 'false',
            lazyLoading: window.APP_FEATURE_LAZY_LOADING !== 'false',
            serviceWorker: window.APP_FEATURE_SERVICE_WORKER !== 'false'
        },
        
        // Validation
        validation: {
            maxSearchLength: parseInt(window.APP_MAX_SEARCH_LENGTH) || 100,
            maxQuantity: parseInt(window.APP_MAX_QUANTITY) || 999,
            minQuantity: parseInt(window.APP_MIN_QUANTITY) || 1
        },
        
        // Retry Configuration
        retry: {
            maxAttempts: parseInt(window.APP_RETRY_MAX_ATTEMPTS) || 3,
            delay: parseInt(window.APP_RETRY_DELAY) || 1000,
            backoff: parseFloat(window.APP_RETRY_BACKOFF) || 2
        },
        
        // Storage Keys
        storage: {
            token: window.APP_STORAGE_TOKEN || 'token',
            userData: window.APP_STORAGE_USER_DATA || 'userData',
            cart: window.APP_STORAGE_CART || 'cart',
            wishlist: window.APP_STORAGE_WISHLIST || 'wishlist'
        }
    };

    // Global variables
    let cartCount = 0;
    let wishlistCount = 0;
    let isLoggedIn = false;
    let currentUser = null;

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
         * Safe DOM query selector
         */
        safeQuerySelector: function(selector, parent = document) {
            try {
                return parent.querySelector(selector);
            } catch (error) {
                if (appConfig.features.debugMode) {
                    console.warn(`[App] Invalid selector: ${selector}`, error);
                }
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
                if (appConfig.features.debugMode) {
                    console.warn(`[App] Invalid selector: ${selector}`, error);
                }
                return [];
            }
        },

        /**
         * Validate configuration
         */
        validateConfig: function() {
            const errors = [];
            
            if (appConfig.ui.searchDelay < 0) {
                errors.push('Search delay cannot be negative');
            }
            
            if (appConfig.validation.maxQuantity < appConfig.validation.minQuantity) {
                errors.push('Max quantity must be greater than min quantity');
            }
            
            if (appConfig.retry.maxAttempts < 1) {
                errors.push('Retry max attempts must be at least 1');
            }
            
            if (errors.length > 0) {
                throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
            }
        },

        /**
         * Sleep utility
         */
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Debounce function
         */
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function
         */
        throttle: function(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => (inThrottle = false), limit);
                }
            };
        },

        /**
         * Format currency
         */
        formatCurrency: function(amount) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(amount);
        },

        /**
         * Format date
         */
        formatDate: function(date) {
            return new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }).format(new Date(date));
        }
    };

    /**
     * HTTP Request Manager
     */
    const httpManager = {
        /**
         * Make HTTP request with retry logic
         */
        async request(url, options = {}) {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include'
            };

            const finalOptions = { ...defaultOptions, ...options };

            try {
                const response = await fetch(url, finalOptions);
                
                // Handle session expiration
                if (response.status === 401) {
                    console.warn('[API] Session expired, redirecting to login');
                    // Clear any stored auth data
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    sessionStorage.removeItem('userData');
                    sessionStorage.removeItem('authToken');
                    
                    // Redirect to login page
                    window.location.href = '/clean/login';
                    return;
                }
                
                return response;
            } catch (error) {
                console.error('[API] Request failed:', error);
                throw error;
            }
        },

        /**
         * GET request
         */
        async get(url) {
            return this.request(url, { method: 'GET' });
        },

        /**
         * POST request
         */
        async post(url, data) {
            return this.request(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    };

    /**
     * Authentication Manager
     */
    const authManager = {
        /**
         * Check authentication status
         */
        checkAuthStatus() {
            const token = localStorage.getItem(appConfig.storage.token);
            const userData = localStorage.getItem(appConfig.storage.userData);

            if (token && userData) {
                try {
                    currentUser = JSON.parse(userData);
                    isLoggedIn = true;
                    this.updateUIForLoggedInUser();
                    
                    if (appConfig.features.debugMode) {
                        console.log('[App] User authenticated:', currentUser.name);
                    }
                } catch (error) {
                    console.error('[App] Error parsing user data:', error);
                    this.logout();
                }
            }
        },

        /**
         * Update UI for logged in user
         */
        updateUIForLoggedInUser() {
            const loginButtons = utils.safeQuerySelectorAll(`.${appConfig.classes.loginRequired}`);
            const logoutButtons = utils.safeQuerySelectorAll(`.${appConfig.classes.logoutRequired}`);
            const userNameElements = utils.safeQuerySelectorAll(`.${appConfig.classes.userName}`);

            loginButtons.forEach((btn) => (btn.style.display = "none"));
            logoutButtons.forEach((btn) => (btn.style.display = "block"));
            userNameElements.forEach((el) => (el.textContent = currentUser.name));
        },

        /**
         * Logout user
         */
        async logout() {
            try {
                // Make API call to logout
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                // Clear local storage regardless of API response
                localStorage.removeItem(appConfig.storage.token);
                localStorage.removeItem(appConfig.storage.userData);
                localStorage.removeItem('cart');
                localStorage.removeItem('wishlist');
                sessionStorage.removeItem('userData');
                sessionStorage.removeItem('authToken');
                
                isLoggedIn = false;
                currentUser = null;
                cartCount = 0;
                wishlistCount = 0;

                // Update UI
                const loginButtons = utils.safeQuerySelectorAll(`.${appConfig.classes.loginRequired}`);
                const logoutButtons = utils.safeQuerySelectorAll(`.${appConfig.classes.logoutRequired}`);

                loginButtons.forEach((btn) => (btn.style.display = "block"));
                logoutButtons.forEach((btn) => (btn.style.display = "none"));

                // Show success message if API call was successful
                if (response.ok) {
                    toastManager.show('Logged out successfully', 'success');
                }

                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = "/";
                }, 1000);
                
            } catch (error) {
                console.error('Logout error:', error);
                
                // Even if API call fails, clear local data and redirect
                localStorage.removeItem(appConfig.storage.token);
                localStorage.removeItem(appConfig.storage.userData);
                localStorage.removeItem('cart');
                localStorage.removeItem('wishlist');
                sessionStorage.removeItem('userData');
                sessionStorage.removeItem('authToken');
                
                isLoggedIn = false;
                currentUser = null;
                cartCount = 0;
                wishlistCount = 0;

                // Update UI
                const loginButtons = utils.safeQuerySelectorAll(`.${appConfig.classes.loginRequired}`);
                const logoutButtons = utils.safeQuerySelectorAll(`.${appConfig.classes.logoutRequired}`);

                loginButtons.forEach((btn) => (btn.style.display = "block"));
                logoutButtons.forEach((btn) => (btn.style.display = "none"));

                // Redirect to home page
                window.location.href = "/";
            }
        }
    };

    /**
     * Toast Notification Manager
     */
    const toastManager = {
        /**
         * Show toast notification
         */
        show(message, type = "info", duration = appConfig.ui.toastDuration) {
            const toastContainer = this.getOrCreateToastContainer();
            const toast = this.createToast(message, type);

            toastContainer.appendChild(toast);

            // Show toast with animation
            setTimeout(() => {
                toast.classList.add(appConfig.classes.show);
            }, 100);

            // Auto-hide toast
            setTimeout(() => {
                this.hideToast(toast);
            }, duration);
        },

        /**
         * Get or create toast container
         */
        getOrCreateToastContainer() {
            let container = utils.safeQuerySelector(`.${appConfig.classes.toastContainer}`);
            if (!container) {
                container = document.createElement("div");
                container.className = `${appConfig.classes.toastContainer} position-fixed top-0 end-0 p-3`;
                container.style.zIndex = appConfig.ui.toastZIndex;
                document.body.appendChild(container);
            }
            return container;
        },

        /**
         * Create toast element
         */
        createToast(message, type) {
            const toast = document.createElement("div");
            toast.className = appConfig.classes.toast;
            toast.setAttribute("role", "alert");

            const colors = {
                success: "bg-success",
                error: "bg-danger",
                warning: "bg-warning",
                info: "bg-info",
            };

            const icons = {
                success: "fa-check-circle",
                error: "fa-exclamation-triangle",
                warning: "fa-exclamation-circle",
                info: "fa-info-circle",
            };

            toast.innerHTML = `
                <div class="toast-header ${colors[type]} text-white">
                    <i class="fas ${icons[type]} me-2"></i>
                    <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <button type="button" class="btn-close btn-close-white" onclick="appManager.toastManager.hideToast(this.closest('.${appConfig.classes.toast}'))"></button>
                </div>
                <div class="toast-body">
                    ${utils.sanitizeHtml(message)}
                </div>
            `;

            return toast;
        },

        /**
         * Hide toast
         */
        hideToast(toast) {
            toast.classList.remove(appConfig.classes.show);
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    };

    /**
     * Cart Manager
     */
    const cartManager = {
        /**
         * Initialize cart functionality
         */
        initialize() {
            document.addEventListener("click", (e) => {
                if (e.target.matches(`.${appConfig.classes.addToCartBtn}`) || e.target.closest(`.${appConfig.classes.addToCartBtn}`)) {
                    const button = e.target.matches(`.${appConfig.classes.addToCartBtn}`) ? e.target : e.target.closest(`.${appConfig.classes.addToCartBtn}`);
                    const productId = button.dataset.productId;
                    const quantity = parseInt(button.dataset.quantity) || 1;
                    this.addToCart(productId, quantity, button);
                }

                if (e.target.matches(`.${appConfig.classes.removeFromCartBtn}`) || e.target.closest(`.${appConfig.classes.removeFromCartBtn}`)) {
                    const button = e.target.matches(`.${appConfig.classes.removeFromCartBtn}`) ? e.target : e.target.closest(`.${appConfig.classes.removeFromCartBtn}`);
                    const productId = button.dataset.productId;
                    this.removeFromCart(productId);
                }

                if (e.target.matches(`.${appConfig.classes.updateCartQuantity}`) || e.target.closest(`.${appConfig.classes.updateCartQuantity}`)) {
                    const input = e.target.matches(`.${appConfig.classes.updateCartQuantity}`) ? e.target : e.target.closest(`.${appConfig.classes.updateCartQuantity}`);
                    const productId = input.dataset.productId;
                    const quantity = parseInt(input.value);
                    this.updateCartQuantity(productId, quantity);
                }
            });
        },

        /**
         * Add item to cart
         */
        async addToCart(productId, quantity = 1, button = null) {
            // Validate quantity
            if (quantity < appConfig.validation.minQuantity || quantity > appConfig.validation.maxQuantity) {
                toastManager.show(`Quantity must be between ${appConfig.validation.minQuantity} and ${appConfig.validation.maxQuantity}`, "error");
                return;
            }

            // Show loading state
            let originalText = "";
            if (button) {
                originalText = button.innerHTML;
                button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${appConfig.messages.general.adding}`;
                button.disabled = true;
            }

            try {
                const response = await httpManager.post(appConfig.endpoints.cart.add, { productId, quantity });
                const data = await response.json();

                if (data.success) {
                    cartCount += quantity;
                    this.updateCartCount();
                    toastManager.show(appConfig.messages.cart.addSuccess, "success");

                    // Update cart sidebar if open
                    if (utils.safeQuerySelector(`${appConfig.selectors.cartSidebar}.${appConfig.classes.show}`)) {
                        this.loadCartSidebar();
                    }
                } else {
                    toastManager.show(data.message || appConfig.messages.cart.addError, "error");
                }
            } catch (error) {
                console.error('[App] Error adding to cart:', error);
                toastManager.show(appConfig.messages.general.error, "error");
            } finally {
                // Restore button state
                if (button) {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }
            }
        },

        /**
         * Remove item from cart
         */
        async removeFromCart(productId) {
            try {
                const response = await httpManager.post(appConfig.endpoints.cart.remove, { productId });
                const data = await response.json();

                if (data.success) {
                    this.updateCartCount();
                    toastManager.show(appConfig.messages.cart.removeSuccess, "info");

                    // Reload cart page or sidebar
                    if (window.location.pathname === "/cart") {
                        location.reload();
                    } else if (utils.safeQuerySelector(`${appConfig.selectors.cartSidebar}.${appConfig.classes.show}`)) {
                        this.loadCartSidebar();
                    }
                } else {
                    toastManager.show(data.message || appConfig.messages.cart.removeError, "error");
                }
            } catch (error) {
                console.error('[App] Error removing from cart:', error);
                toastManager.show(appConfig.messages.general.error, "error");
            }
        },

        /**
         * Update cart quantity
         */
        async updateCartQuantity(productId, quantity) {
            if (quantity < appConfig.validation.minQuantity) return;

            try {
                const response = await httpManager.post(appConfig.endpoints.cart.update, { productId, quantity });
                const data = await response.json();

                if (data.success) {
                    this.updateCartCount();

                    // Update cart totals if on cart page
                    if (window.location.pathname === "/cart") {
                        this.updateCartTotals();
                    }
                } else {
                    toastManager.show(data.message || appConfig.messages.cart.updateError, "error");
                }
            } catch (error) {
                console.error('[App] Error updating cart:', error);
                toastManager.show(appConfig.messages.general.error, "error");
            }
        },

        /**
         * Update cart count
         */
        async updateCartCount() {
            try {
                const response = await httpManager.get(appConfig.endpoints.cart.count);
                const data = await response.json();
                cartCount = data.count || 0;
                this.updateCartBadge();
            } catch (error) {
                console.error('[App] Error fetching cart count:', error);
                // Set cart count to 0 if there's an error
                cartCount = 0;
                this.updateCartBadge();
            }
        },

        /**
         * Update cart badge
         */
        updateCartBadge() {
            const cartBadges = utils.safeQuerySelectorAll(appConfig.selectors.cartCount);
            cartBadges.forEach((badge) => {
                badge.textContent = cartCount;
                badge.style.display = cartCount > 0 ? "inline" : "none";
            });
        },

        /**
         * Load cart sidebar (placeholder)
         */
        loadCartSidebar() {
            if (appConfig.features.debugMode) {
                console.log('[App] Loading cart sidebar');
            }
        },

        /**
         * Update cart totals (placeholder)
         */
        updateCartTotals() {
            if (appConfig.features.debugMode) {
                console.log('[App] Updating cart totals');
            }
        }
    };

    /**
     * Wishlist Manager
     */
    const wishlistManager = {
        /**
         * Initialize wishlist functionality
         */
        initialize() {
            document.addEventListener("click", (e) => {
                if (e.target.matches(`.${appConfig.classes.addToWishlistBtn}`) || e.target.closest(`.${appConfig.classes.addToWishlistBtn}`)) {
                    const button = e.target.matches(`.${appConfig.classes.addToWishlistBtn}`) ? e.target : e.target.closest(`.${appConfig.classes.addToWishlistBtn}`);
                    const productId = button.dataset.productId;
                    this.toggleWishlist(productId, button);
                }
            });
        },

        /**
         * Toggle wishlist item
         */
        async toggleWishlist(productId, button = null) {
            if (!isLoggedIn) {
                toastManager.show(appConfig.messages.auth.loginRequiredWishlist, "warning");
                return;
            }

            const isInWishlist = button && button.classList.contains(appConfig.classes.inWishlist);
            const action = isInWishlist ? "remove" : "add";

            try {
                const response = await httpManager.post(appConfig.endpoints.wishlist[action], { productId });
                const data = await response.json();

                if (data.success) {
                    if (button) {
                        button.classList.toggle(appConfig.classes.inWishlist);
                        const icon = button.querySelector("i");
                        if (icon) {
                            icon.classList.toggle("fas");
                            icon.classList.toggle("far");
                        }
                    }

                    this.updateWishlistCount();
                    toastManager.show(
                        isInWishlist ? appConfig.messages.wishlist.removeSuccess : appConfig.messages.wishlist.addSuccess, 
                        isInWishlist ? "info" : "success"
                    );
                } else {
                    toastManager.show(data.message || appConfig.messages.wishlist.updateError, "error");
                }
            } catch (error) {
                console.error('[App] Error updating wishlist:', error);
                toastManager.show(appConfig.messages.general.error, "error");
            }
        },

        /**
         * Update wishlist count
         */
        async updateWishlistCount() {
            if (!isLoggedIn) {
                wishlistCount = 0;
                this.updateWishlistBadge();
                return;
            }

            try {
                const response = await httpManager.get(appConfig.endpoints.wishlist.count);
                const data = await response.json();
                wishlistCount = data.count || 0;
                this.updateWishlistBadge();
            } catch (error) {
                console.error('[App] Error fetching wishlist count:', error);
            }
        },

        /**
         * Update wishlist badge
         */
        updateWishlistBadge() {
            const wishlistBadges = utils.safeQuerySelectorAll(appConfig.selectors.wishlistCount);
            wishlistBadges.forEach((badge) => {
                badge.textContent = wishlistCount;
                badge.style.display = wishlistCount > 0 ? "inline" : "none";
            });
        }
    };

    /**
     * Search Manager
     */
    const searchManager = {
        /**
         * Initialize search functionality
         */
        initialize() {
            const searchForm = utils.safeQuerySelector(appConfig.selectors.searchForm);
            const searchInput = utils.safeQuerySelector(appConfig.selectors.searchInput);

            if (searchInput) {
                // Real-time search suggestions with debouncing
                const debouncedSearch = utils.debounce((query) => {
                    this.fetchSearchSuggestions(query);
                }, appConfig.ui.searchDelay);

                searchInput.addEventListener("input", function() {
                    const query = this.value.trim();

                    if (query.length >= appConfig.ui.searchMinLength && query.length <= appConfig.validation.maxSearchLength) {
                        debouncedSearch(query);
                    } else {
                        this.hideSearchSuggestions();
                    }
                });

                // Handle search form submission
                if (searchForm) {
                    searchForm.addEventListener("submit", (e) => {
                        e.preventDefault();
                        const query = searchInput.value.trim();
                        if (query) {
                            window.location.href = `/products?search=${encodeURIComponent(query)}`;
                        }
                    });
                }
            }
        },

        /**
         * Fetch search suggestions
         */
        async fetchSearchSuggestions(query) {
            try {
                const response = await httpManager.get(`${appConfig.endpoints.search}?q=${encodeURIComponent(query)}`);
                const suggestions = await response.json();
                this.displaySearchSuggestions(suggestions);
            } catch (error) {
                console.error('[App] Error fetching search suggestions:', error);
            }
        },

        /**
         * Display search suggestions
         */
        displaySearchSuggestions(suggestions) {
            const suggestionsContainer = utils.safeQuerySelector(appConfig.selectors.searchSuggestions);
            if (!suggestionsContainer) return;

            if (!Array.isArray(suggestions) || suggestions.length === 0) {
                this.hideSearchSuggestions();
                return;
            }

            const suggestionsHTML = suggestions
                .map((suggestion) => `
                    <div class="search-suggestion-item" onclick="appManager.searchManager.selectSearchSuggestion('${utils.sanitizeHtml(suggestion.name)}')">
                        <img src="${utils.sanitizeHtml(suggestion.image || '')}" alt="${utils.sanitizeHtml(suggestion.name)}" class="suggestion-image">
                        <div class="suggestion-details">
                            <div class="suggestion-name">${utils.sanitizeHtml(suggestion.name)}</div>
                            <div class="suggestion-price">${utils.formatCurrency(suggestion.price || 0)}</div>
                        </div>
                    </div>
                `)
                .join("");

            suggestionsContainer.innerHTML = suggestionsHTML;
            suggestionsContainer.style.display = "block";
        },

        /**
         * Select search suggestion
         */
        selectSearchSuggestion(productName) {
            const searchInput = utils.safeQuerySelector(appConfig.selectors.searchInput);
            if (searchInput) {
                searchInput.value = productName;
                this.hideSearchSuggestions();
                window.location.href = `/products?search=${encodeURIComponent(productName)}`;
            }
        },

        /**
         * Hide search suggestions
         */
        hideSearchSuggestions() {
            const suggestionsContainer = utils.safeQuerySelector(appConfig.selectors.searchSuggestions);
            if (suggestionsContainer) {
                suggestionsContainer.style.display = "none";
            }
        }
    };

    /**
     * Navigation Manager
     */
    const navigationManager = {
        /**
         * Initialize navigation functionality
         */
        initialize() {
            this.initializeMobileMenu();
            this.initializeDropdowns();
            this.initializeScrollEffects();
        },

        /**
         * Initialize mobile menu
         */
        initializeMobileMenu() {
            const mobileMenuToggle = utils.safeQuerySelector(appConfig.selectors.navbarToggler);
            const mobileMenu = utils.safeQuerySelector(appConfig.selectors.navbarCollapse);

            if (mobileMenuToggle && mobileMenu) {
                mobileMenuToggle.addEventListener("click", () => {
                    mobileMenu.classList.toggle(appConfig.classes.show);
                });
            }
        },

        /**
         * Initialize dropdowns
         */
        initializeDropdowns() {
            const dropdownToggles = utils.safeQuerySelectorAll(appConfig.selectors.dropdownToggle);
            dropdownToggles.forEach((toggle) => {
                toggle.addEventListener("click", function(e) {
                    e.preventDefault();
                    const dropdown = this.nextElementSibling;
                    if (dropdown) {
                        dropdown.classList.toggle(appConfig.classes.show);
                    }
                });
            });

            // Close dropdowns when clicking outside
            document.addEventListener("click", (e) => {
                if (!e.target.matches(appConfig.selectors.dropdownToggle)) {
                    const dropdowns = utils.safeQuerySelectorAll(appConfig.selectors.dropdownMenu);
                    dropdowns.forEach((dropdown) => {
                        dropdown.classList.remove(appConfig.classes.show);
                    });
                }
            });
        },

        /**
         * Initialize scroll effects
         */
        initializeScrollEffects() {
            // Back to top button
            const backToTopBtn = utils.safeQuerySelector(appConfig.selectors.backToTop);
            if (backToTopBtn) {
                window.addEventListener("scroll", () => {
                    if (window.pageYOffset > appConfig.ui.scrollThreshold) {
                        backToTopBtn.style.display = "block";
                    } else {
                        backToTopBtn.style.display = "none";
                    }
                });

                backToTopBtn.addEventListener("click", () => {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                    });
                });
            }

            // Navbar scroll effect
            const navbar = utils.safeQuerySelector(appConfig.selectors.navbar);
            if (navbar) {
                window.addEventListener("scroll", () => {
                    if (window.pageYOffset > appConfig.ui.navbarScrollThreshold) {
                        navbar.classList.add(appConfig.classes.scrolled);
                    } else {
                        navbar.classList.remove(appConfig.classes.scrolled);
                    }
                });
            }

            // Animate elements on scroll
            const observerOptions = {
                threshold: 0.1,
                rootMargin: "0px 0px -50px 0px",
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(appConfig.classes.animateIn);
                    }
                });
            }, observerOptions);

            const animateElements = utils.safeQuerySelectorAll(`.${appConfig.classes.animateOnScroll}`);
            animateElements.forEach((el) => observer.observe(el));
        }
    };

    /**
     * Modal Manager
     */
    const modalManager = {
        /**
         * Initialize modal functionality
         */
        initialize() {
            // Quick view modal
            document.addEventListener("click", (e) => {
                if (e.target.matches(`.${appConfig.classes.quickViewBtn}`) || e.target.closest(`.${appConfig.classes.quickViewBtn}`)) {
                    const button = e.target.matches(`.${appConfig.classes.quickViewBtn}`) ? e.target : e.target.closest(`.${appConfig.classes.quickViewBtn}`);
                    const productId = button.dataset.productId;
                    this.openQuickViewModal(productId);
                }
            });

            // Close modals when clicking outside
            document.addEventListener("click", (e) => {
                if (e.target.matches(`.${appConfig.classes.modal}`)) {
                    this.closeModal(e.target);
                }
            });

            // Close modals with escape key
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    const openModal = utils.safeQuerySelector(`.${appConfig.classes.modal}.${appConfig.classes.show}`);
                    if (openModal) {
                        this.closeModal(openModal);
                    }
                }
            });
        },

        /**
         * Open quick view modal
         */
        async openQuickViewModal(productId) {
            try {
                const response = await httpManager.get(`${appConfig.endpoints.products}/${productId}`);
                const product = await response.json();

                if (product) {
                    this.displayQuickViewModal(product);
                }
            } catch (error) {
                console.error('[App] Error loading product for quick view:', error);
                toastManager.show(appConfig.messages.modal.loadError, "error");
            }
        },

        /**
         * Display quick view modal
         */
        displayQuickViewModal(product) {
            const modalHTML = `
                <div class="${appConfig.classes.modal} fade" id="quickViewModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${utils.sanitizeHtml(product.name)}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <img src="${utils.sanitizeHtml(product.image || '')}" class="img-fluid rounded" alt="${utils.sanitizeHtml(product.name)}">
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-2">
                                            <span class="badge bg-primary">${utils.sanitizeHtml(product.category || '')}</span>
                                            ${product.featured ? '<span class="badge bg-success ms-1">Featured</span>' : ""}
                                        </div>
                                        <h4 class="mb-3">${utils.formatCurrency(product.price || 0)}</h4>
                                        <p class="mb-3">${utils.sanitizeHtml(product.description || '')}</p>
                                        <div class="mb-3">
                                            <strong>Stock:</strong> ${product.stock || 0} available
                                        </div>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-primary ${appConfig.classes.addToCartBtn}" data-product-id="${utils.sanitizeHtml(product.id || product._id)}">
                                                <i class="fas fa-cart-plus me-2"></i>Add to Cart
                                            </button>
                                            <button class="btn btn-outline-secondary ${appConfig.classes.addToWishlistBtn}" data-product-id="${utils.sanitizeHtml(product.id || product._id)}">
                                                <i class="far fa-heart"></i>
                                            </button>
                                            <a href="/products/${utils.sanitizeHtml(product.id || product._id)}" class="btn btn-outline-primary">
                                                View Details
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            const existingModal = document.getElementById("quickViewModal");
            if (existingModal) {
                existingModal.remove();
            }

            // Add new modal to body
            document.body.insertAdjacentHTML("beforeend", modalHTML);

            // Show modal
            const modal = new window.bootstrap.Modal(document.getElementById("quickViewModal"));
            modal.show();
        },

        /**
         * Close modal
         */
        closeModal(modal) {
            const bsModal = window.bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    };

    /**
     * Tooltip Manager
     */
    const tooltipManager = {
        /**
         * Initialize tooltips
         */
        initialize() {
            const tooltipTriggerList = [].slice.call(utils.safeQuerySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map((tooltipTriggerEl) => new window.bootstrap.Tooltip(tooltipTriggerEl));
        }
    };

    /**
     * Page Manager
     */
    const pageManager = {
        /**
         * Initialize page-specific functionality
         */
        initialize() {
            const currentPage = window.location.pathname;

            switch (true) {
                case currentPage === "/":
                    this.initializeHomePage();
                    break;
                case currentPage.startsWith("/products"):
                    this.initializeProductsPage();
                    break;
                case currentPage === "/cart":
                    this.initializeCartPage();
                    break;
                case currentPage.startsWith("/listings"):
                    this.initializeListingsPage();
                    break;
                case currentPage === "/checkout":
                    this.initializeCheckoutPage();
                    break;
            }
        },

        /**
         * Initialize home page
         */
        initializeHomePage() {
            // Hero section animations
            const heroElements = utils.safeQuerySelectorAll(`.hero-section .${appConfig.classes.animateOnLoad}`);
            heroElements.forEach((el, index) => {
                setTimeout(() => {
                    el.classList.add(appConfig.classes.animateIn);
                }, index * appConfig.ui.animationDelay);
            });

            // Featured products carousel
            this.initializeProductCarousel();
        },

        /**
         * Initialize products page
         */
        initializeProductsPage() {
            this.initializeProductFilters();
            this.initializeProductSorting();
            this.initializePagination();
        },

        /**
         * Initialize cart page
         */
        initializeCartPage() {
            this.initializeQuantityControls();
            cartManager.updateCartTotals();
            this.initializeCouponCode();
        },

        /**
         * Initialize listings page
         */
        initializeListingsPage() {
            if (currentUser && currentUser.role === "admin") {
                this.initializeAdminFeatures();
            }
            this.initializeViewModeToggle();
            this.initializeBulkOperations();
        },

        /**
         * Initialize checkout page
         */
        initializeCheckoutPage() {
            this.initializeCheckoutForm();
            this.initializePaymentForm();
            this.initializeAddressValidation();
        },

        // Placeholder functions for page-specific features
        initializeProductCarousel() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing product carousel');
            }
        },

        initializeProductFilters() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing product filters');
            }
        },

        initializeProductSorting() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing product sorting');
            }
        },

        initializePagination() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing pagination');
            }
        },

        initializeQuantityControls() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing quantity controls');
            }
        },

        initializeCouponCode() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing coupon code');
            }
        },

        initializeAdminFeatures() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing admin features');
            }
        },

        initializeViewModeToggle() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing view mode toggle');
            }
        },

        initializeBulkOperations() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing bulk operations');
            }
        },

        initializeCheckoutForm() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing checkout form');
            }
        },

        initializePaymentForm() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing payment form');
            }
        },

        initializeAddressValidation() {
            if (appConfig.features.debugMode) {
                console.log('[App] Initializing address validation');
            }
        }
    };

    /**
     * Service Worker Manager
     */
    const serviceWorkerManager = {
        /**
         * Initialize service worker
         */
        initialize() {
            if (appConfig.features.serviceWorker && "serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                    navigator.serviceWorker
                        .register("/sw.js")
                        .then((registration) => {
                            if (appConfig.features.debugMode) {
                                console.log('[App] ServiceWorker registration successful');
                            }
                        })
                        .catch((error) => {
                            console.error('[App] ServiceWorker registration failed:', error);
                        });
                });
            }
        }
    };

    /**
     * Main Application Manager
     */
    const appManager = {
        /**
         * Initialize application
         */
        init() {
            try {
                utils.validateConfig();
                
                // Check authentication status
                authManager.checkAuthStatus();

                // Initialize all managers
                navigationManager.initialize();
                searchManager.initialize();
                cartManager.initialize();
                wishlistManager.initialize();
                modalManager.initialize();
                tooltipManager.initialize();
                pageManager.initialize();
                // Initialize service worker
                // TEMPORARILY DISABLED - causing infinite requests
                /*
                serviceWorkerManager.initialize();
                */

                // Load cart and wishlist counts
                cartManager.updateCartCount();
                wishlistManager.updateWishlistCount();

                // Session keep-alive to prevent automatic logout
                const sessionKeepAlive = {
                    interval: null,
                    intervalTime: 5 * 60 * 1000, // 5 minutes
                    
                    start() {
                        if (this.interval) {
                            clearInterval(this.interval);
                        }
                        
                        this.interval = setInterval(() => {
                            this.refreshSession();
                        }, this.intervalTime);
                    },
                    
                    stop() {
                        if (this.interval) {
                            clearInterval(this.interval);
                            this.interval = null;
                        }
                    },
                    
                    async refreshSession() {
                        try {
                            // Make a lightweight request to keep session alive
                            const response = await fetch('/api/auth/session-check', {
                                method: 'GET',
                                credentials: 'include'
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.authenticated) {
                                    console.log('[Session] Session refreshed successfully');
                                } else {
                                    console.warn('[Session] Session expired');
                                    // Don't redirect automatically, let the user continue browsing
                                }
                            } else {
                                console.warn('[Session] Session check failed');
                            }
                        } catch (error) {
                            console.warn('[Session] Session check failed:', error);
                        }
                    }
                };

                // Start session keep-alive if user is logged in
                // TEMPORARILY DISABLED - causing infinite requests
                /*
                if (isLoggedIn) {
                    sessionKeepAlive.start();
                }
                */

                // Session monitoring system to prevent automatic logout
                // TEMPORARILY DISABLED - causing infinite requests
                /*
                const sessionMonitor = {
                    interval: null,
                    checkInterval: 2 * 60 * 1000, // Check every 2 minutes
                    lastActivity: Date.now(),
                    isActive: true,
                    
                    init() {
                        this.startMonitoring();
                        this.bindActivityEvents();
                    },
                    
                    startMonitoring() {
                        if (this.interval) {
                            clearInterval(this.interval);
                        }
                        
                        this.interval = setInterval(() => {
                            this.checkSessionHealth();
                        }, this.checkInterval);
                    },
                    
                    stopMonitoring() {
                        if (this.interval) {
                            clearInterval(this.interval);
                            this.interval = null;
                        }
                    },
                    
                    bindActivityEvents() {
                        // Track user activity
                        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
                        events.forEach(event => {
                            document.addEventListener(event, () => {
                                this.lastActivity = Date.now();
                                this.isActive = true;
                            }, { passive: true });
                        });
                        
                        // Handle page visibility changes
                        document.addEventListener('visibilitychange', () => {
                            if (!document.hidden) {
                                this.lastActivity = Date.now();
                                this.isActive = true;
                                this.checkSessionHealth(); // Check session when page becomes visible
                            }
                        });
                    },
                    
                    async checkSessionHealth() {
                        try {
                            const response = await fetch('/api/auth/session-health', {
                                method: 'GET',
                                credentials: 'include'
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                
                                if (data.success && data.session.hasUser) {
                                    console.log('[SessionMonitor] Session is healthy');
                                    this.isActive = true;
                                } else {
                                    console.warn('[SessionMonitor] Session health check failed');
                                    this.handleSessionIssue();
                                }
                            } else {
                                console.warn('[SessionMonitor] Session health check failed');
                                this.handleSessionIssue();
                            }
                        } catch (error) {
                            console.warn('[SessionMonitor] Session health check error:', error);
                            this.handleSessionIssue();
                        }
                    },
                    
                    handleSessionIssue() {
                        console.warn('[SessionMonitor] Session issue detected, attempting recovery...');
                        this.attemptSessionRecovery();
                    },
                    
                    async attemptSessionRecovery() {
                        try {
                            const response = await fetch('/api/auth/session-recover', {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.success) {
                                    console.log('[SessionMonitor] Session recovered successfully');
                                    this.isActive = true;
                                } else {
                                    console.warn('[SessionMonitor] Session recovery failed');
                                }
                            } else {
                                console.warn('[SessionMonitor] Session recovery failed');
                            }
                        } catch (error) {
                            console.warn('[SessionMonitor] Session recovery error:', error);
                        }
                    }
                };

                // Initialize session monitoring
                if (isLoggedIn) {
                    sessionMonitor.init();
                }
                */

                if (appConfig.features.debugMode) {
                    console.log('[App] E-Commerce App initialized successfully');
                }
                
            } catch (error) {
                console.error('[App] Initialization failed:', error);
            }
        }
    };

    /**
     * Initialize application when DOM is loaded
     */
    document.addEventListener("DOMContentLoaded", () => {
        // Check session persistence first
        checkSessionPersistence().then(() => {
            appManager.init();
        });
    });

    /**
     * Check session persistence on page load
     */
    async function checkSessionPersistence() {
        try {
            const response = await fetch('/api/auth/session-health', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.session.hasUser) {
                    console.log('[SessionPersistence] Session is valid on page load');
                    
                    // Update local storage with current user data
                    if (data.session.user) {
                        localStorage.setItem('userData', JSON.stringify(data.session.user));
                        localStorage.setItem('authToken', 'session-active');
                    }
                } else {
                    console.warn('[SessionPersistence] Session not found on page load');
                    
                    // Clear any stale data
                    localStorage.removeItem('userData');
                    localStorage.removeItem('authToken');
                }
            } else {
                console.warn('[SessionPersistence] Session health check failed on page load');
            }
        } catch (error) {
            console.error('[SessionPersistence] Session check error on page load:', error);
        }
    }

    /**
     * Global API
     */
    window.appManager = {
        init: appManager.init.bind(appManager),
        auth: authManager,
        cart: cartManager,
        wishlist: wishlistManager,
        search: searchManager,
        navigation: navigationManager,
        modal: modalManager,
        tooltip: tooltipManager,
        page: pageManager,
        toast: toastManager,
        utils: utils,
        config: appConfig
    };

    // Export functions for global use
    window.ecommerce = {
        addToCart: cartManager.addToCart.bind(cartManager),
        removeFromCart: cartManager.removeFromCart.bind(cartManager),
        toggleWishlist: wishlistManager.toggleWishlist.bind(wishlistManager),
        showToast: toastManager.show.bind(toastManager),
        formatCurrency: utils.formatCurrency,
        formatDate: utils.formatDate,
        logout: authManager.logout.bind(authManager),
    };

    // Global logout function for navbar compatibility
    window.logout = function() {
        // Use the enhanced logout handler if available
        if (window.logoutHandler && typeof window.logoutHandler.handleLogout === 'function') {
            window.logoutHandler.handleLogout();
        } else {
            // Fallback to the basic logout function
            authManager.logout();
        }
    };

    /**
     * Session debugging tool
     */
    window.sessionDebug = {
        getSessionInfo() {
            return {
                localStorage: {
                    userData: localStorage.getItem('userData'),
                    authToken: localStorage.getItem('authToken')
                },
                sessionStorage: {
                    userData: sessionStorage.getItem('userData'),
                    authToken: sessionStorage.getItem('authToken')
                },
                cookies: document.cookie,
                timestamp: new Date().toISOString()
            };
        },
        
        async checkServerSession() {
            try {
                const response = await fetch('/api/auth/session-health', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return data;
                } else {
                    return { error: 'Session health check failed' };
                }
            } catch (error) {
                return { error: error.message };
            }
        },
        
        async forceSessionRefresh() {
            try {
                const response = await fetch('/api/auth/session-check', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Session refresh result:', data);
                    return data;
                } else {
                    console.error('Session refresh failed');
                    return { error: 'Session refresh failed' };
                }
            } catch (error) {
                console.error('Session refresh error:', error);
                return { error: error.message };
            }
        },
        
        logSessionStatus() {
            const clientInfo = this.getSessionInfo();
            console.log('=== SESSION DEBUG INFO ===');
            console.log('Client Session Info:', clientInfo);
            
            this.checkServerSession().then(serverInfo => {
                console.log('Server Session Info:', serverInfo);
                console.log('=== END SESSION DEBUG ===');
            });
        }
    };

    // Add session debug to global scope
    if (typeof window !== 'undefined') {
        window.sessionDebug = window.sessionDebug;
    }

})(); 