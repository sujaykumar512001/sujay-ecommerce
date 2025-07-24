/**
 * Enhanced Checkout Class - Secure and Configurable E-Commerce Checkout
 * Handles order processing, payment integration, and user experience
 */

class Checkout {
    constructor() {
        /**
         * Checkout Configuration
         */
        this.config = {
            // API Endpoints
            endpoints: {
                products: window.CHECKOUT_API_PRODUCTS || '/api/products/batch',
                orders: window.CHECKOUT_API_ORDERS || '/api/orders',
                payments: window.CHECKOUT_API_PAYMENTS || '/api/payments/create-payment-intent',
                user: window.CHECKOUT_API_USER || '/api/user/profile'
            },
            
            // Redirect URLs
            redirects: {
                cart: window.CHECKOUT_REDIRECT_CART || '/client/cart',
                order: window.CHECKOUT_REDIRECT_ORDER || '/orders',
                success: window.CHECKOUT_REDIRECT_SUCCESS || '/orders'
            },
            
            // Pricing Configuration
            pricing: {
                shipping: parseFloat(window.CHECKOUT_SHIPPING_COST) || 5.99,
                taxRate: parseFloat(window.CHECKOUT_TAX_RATE) || 0.08,
                currency: window.CHECKOUT_CURRENCY || 'USD',
                currencySymbol: window.CHECKOUT_CURRENCY_SYMBOL || '$'
            },
            
            // Stripe Configuration
            stripe: {
                publishableKey: window.STRIPE_PUBLISHABLE_KEY || '<%= process.env.STRIPE_PUBLISHABLE_KEY %>',
                demoKey: window.CHECKOUT_STRIPE_DEMO_KEY || 'pk_test_your_key_here',
                style: {
                    base: {
                        fontSize: window.CHECKOUT_STRIPE_FONT_SIZE || '16px',
                        color: window.CHECKOUT_STRIPE_COLOR || '#424770',
                        '::placeholder': {
                            color: window.CHECKOUT_STRIPE_PLACEHOLDER_COLOR || '#aab7c4',
                        },
                    },
                    invalid: {
                        color: window.CHECKOUT_STRIPE_ERROR_COLOR || '#9e2146',
                    },
                }
            },
            
            // UI Configuration
            ui: {
                alertTimeout: parseInt(window.CHECKOUT_ALERT_TIMEOUT) || 5000,
                redirectDelay: parseInt(window.CHECKOUT_REDIRECT_DELAY) || 2000,
                alertPosition: {
                    top: window.CHECKOUT_ALERT_TOP || '20px',
                    right: window.CHECKOUT_ALERT_RIGHT || '20px',
                    zIndex: parseInt(window.CHECKOUT_ALERT_Z_INDEX) || 9999,
                    minWidth: window.CHECKOUT_ALERT_MIN_WIDTH || '300px'
                }
            },
            
            // Messages
            messages: {
                errors: {
                    cartEmpty: window.CHECKOUT_ERROR_CART_EMPTY || 'Your cart is empty. Please add items before checkout.',
                    loadData: window.CHECKOUT_ERROR_LOAD_DATA || 'Error loading order data. Please try again.',
                    createOrder: window.CHECKOUT_ERROR_CREATE_ORDER || 'Failed to create order. Please try again.',
                    paymentIntent: window.CHECKOUT_ERROR_PAYMENT_INTENT || 'Failed to create payment intent.',
                    payment: window.CHECKOUT_ERROR_PAYMENT || 'Payment failed. Please try again.',
                    general: window.CHECKOUT_ERROR_GENERAL || 'An error occurred during checkout. Please try again.',
                    validation: window.CHECKOUT_ERROR_VALIDATION || 'Please check your form and try again.'
                },
                success: {
                    orderPlaced: window.CHECKOUT_SUCCESS_ORDER_PLACED || 'Order placed successfully!',
                    demoMode: window.CHECKOUT_SUCCESS_DEMO_MODE || 'Demo Mode: Payment processing is not configured. This is a demonstration checkout.'
                },
                info: {
                    processing: window.CHECKOUT_INFO_PROCESSING || 'Processing...',
                    completeOrder: window.CHECKOUT_INFO_COMPLETE_ORDER || 'Complete Order'
                }
            },
            
            // Validation
            validation: {
                required: ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'],
                email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                phone: /^[\+]?[1-9][\d]{0,15}$/,
                zipCode: /^\d{5}(-\d{4})?$/,
                maxLengths: {
                    firstName: 50,
                    lastName: 50,
                    email: 100,
                    phone: 20,
                    address: 200,
                    city: 100,
                    state: 50,
                    zipCode: 10,
                    notes: 500
                }
            },
            
            // Features
            features: {
                demoMode: window.CHECKOUT_DEMO_MODE === 'true',
                prefillUserData: window.CHECKOUT_PREFILL_USER_DATA !== 'false',
                validateForm: window.CHECKOUT_VALIDATE_FORM !== 'false',
                retryFailedRequests: window.CHECKOUT_RETRY_REQUESTS !== 'false',
                debugMode: window.CHECKOUT_DEBUG_MODE === 'true'
            },
            
            // Retry Configuration
            retry: {
                maxAttempts: parseInt(window.CHECKOUT_RETRY_MAX_ATTEMPTS) || 3,
                delay: parseInt(window.CHECKOUT_RETRY_DELAY) || 1000,
                backoff: parseFloat(window.CHECKOUT_RETRY_BACKOFF) || 2
            }
        };

        // Instance properties
        this.stripe = null;
        this.cardElement = null;
        this.orderData = null;
        this.isProcessing = false;
        this.retryCount = 0;

        // Initialize
        this.init();
    }

    /**
     * Initialize checkout
     */
    async init() {
        try {
            this.validateConfig();
            await this.loadOrderData();
            this.setupStripe();
            this.setupEventListeners();
            this.renderOrderSummary();
            
            if (this.config.features.debugMode) {
                console.log('[Checkout] Initialized successfully');
            }
        } catch (error) {
            console.error('[Checkout] Initialization failed:', error);
            this.showAlert(this.config.messages.errors.general, 'danger');
        }
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        const errors = [];
        
        if (this.config.pricing.shipping < 0) {
            errors.push('Shipping cost cannot be negative');
        }
        
        if (this.config.pricing.taxRate < 0 || this.config.pricing.taxRate > 1) {
            errors.push('Tax rate must be between 0 and 1');
        }
        
        if (this.config.retry.maxAttempts < 1) {
            errors.push('Retry max attempts must be at least 1');
        }
        
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Load order data from cart
     */
    async loadOrderData() {
        try {
            const cart = this.getCartData();
            if (cart.length === 0) {
                this.showAlert(this.config.messages.errors.cartEmpty, 'warning');
                setTimeout(() => {
                    window.location.href = this.config.redirects.cart;
                }, 2000);
                return;
            }

            const products = await this.fetchProducts(cart);
            this.orderData = this.buildOrderData(cart, products);
            this.calculateTotals();
            
        } catch (error) {
            console.error('[Checkout] Error loading order data:', error);
            this.showAlert(this.config.messages.errors.loadData, 'danger');
            throw error;
        }
    }

    /**
     * Get cart data from localStorage
     */
    getCartData() {
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            return Array.isArray(cart) ? cart : [];
        } catch (error) {
            console.error('[Checkout] Error parsing cart data:', error);
            return [];
        }
    }

    /**
     * Fetch products data
     */
    async fetchProducts(cart) {
        const productIds = cart.map(item => item.productId).filter(Boolean);
        
        if (productIds.length === 0) {
            throw new Error('No valid product IDs found in cart');
        }

        const response = await this.makeRequest(
            `${this.config.endpoints.products}?ids=${productIds.join(',')}`,
            'GET'
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Build order data structure
     */
    buildOrderData(cart, products) {
        const items = cart.map(item => {
            const product = products.find(p => p._id === item.productId);
            return {
                product: product,
                quantity: parseInt(item.quantity) || 1,
                price: product ? parseFloat(product.price) || 0 : 0
            };
        }).filter(item => item.product && item.quantity > 0);

        return {
            items: items,
            subtotal: 0,
            shipping: this.config.pricing.shipping,
            tax: 0,
            total: 0
        };
    }

    /**
     * Calculate order totals
     */
    calculateTotals() {
        if (!this.orderData || !this.orderData.items) return;

        this.orderData.subtotal = this.orderData.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        this.orderData.tax = this.orderData.subtotal * this.config.pricing.taxRate;
        this.orderData.total = this.orderData.subtotal + this.orderData.shipping + this.orderData.tax;
    }

    /**
     * Setup Stripe payment
     */
    setupStripe() {
        const publishableKey = this.config.stripe.publishableKey;

        if (publishableKey && publishableKey !== this.config.stripe.demoKey && !this.config.features.demoMode) {
            try {
                this.stripe = Stripe(publishableKey);
                const elements = this.stripe.elements();
                
                this.cardElement = elements.create('card', {
                    style: this.config.stripe.style
                });

                this.cardElement.mount('#card-element');
                this.setupStripeEventListeners();
                
            } catch (error) {
                console.error('[Checkout] Stripe setup failed:', error);
                this.showStripeDemoMode();
            }
        } else {
            this.showStripeDemoMode();
        }
    }

    /**
     * Setup Stripe event listeners
     */
    setupStripeEventListeners() {
        if (!this.cardElement) return;

        this.cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (!displayError) return;

            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.display = 'block';
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
            }
        });
    }

    /**
     * Show Stripe demo mode
     */
    showStripeDemoMode() {
        const cardElement = document.getElementById('card-element');
        if (!cardElement) return;

        cardElement.innerHTML = `
            <div class="alert alert-info" role="alert">
                <strong>Demo Mode:</strong> ${this.config.messages.success.demoMode}
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('checkoutForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.setupFormValidation(form);
        }

        if (this.config.features.prefillUserData) {
            this.prefillUserData();
        }
    }

    /**
     * Setup form validation
     */
    setupFormValidation(form) {
        if (!this.config.features.validateForm) return;

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    /**
     * Validate form field
     */
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        const validation = this.config.validation;

        // Clear previous errors
        this.clearFieldError(field);

        // Required field validation
        if (validation.required.includes(fieldName) && !value) {
            this.showFieldError(field, 'This field is required');
            return false;
        }

        // Email validation
        if (fieldName === 'email' && value && !validation.email.test(value)) {
            this.showFieldError(field, 'Please enter a valid email address');
            return false;
        }

        // Phone validation
        if (fieldName === 'phone' && value && !validation.phone.test(value.replace(/\s/g, ''))) {
            this.showFieldError(field, 'Please enter a valid phone number');
            return false;
        }

        // ZIP code validation
        if (fieldName === 'zipCode' && value && !validation.zipCode.test(value)) {
            this.showFieldError(field, 'Please enter a valid ZIP code');
            return false;
        }

        // Length validation
        const maxLength = validation.maxLengths[fieldName];
        if (maxLength && value.length > maxLength) {
            this.showFieldError(field, `Maximum ${maxLength} characters allowed`);
            return false;
        }

        return true;
    }

    /**
     * Show field error
     */
    showFieldError(field, message) {
        field.classList.add('is-invalid');
        
        let errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            field.parentNode.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * Prefill user data
     */
    async prefillUserData() {
        try {
            const response = await this.makeRequest(this.config.endpoints.user, 'GET');
            if (response.ok) {
                const userData = await response.json();
                this.populateFormFields(userData);
            }
        } catch (error) {
            if (this.config.features.debugMode) {
                console.warn('[Checkout] Failed to prefill user data:', error);
            }
        }
    }

    /**
     * Populate form fields with user data
     */
    populateFormFields(userData) {
        const fields = ['firstName', 'lastName', 'email', 'phone'];
        fields.forEach(field => {
            const element = document.querySelector(`[name="${field}"]`);
            if (element && userData[field]) {
                element.value = userData[field];
            }
        });

        // Populate address if available
        if (userData.addresses && userData.addresses.length > 0) {
            const defaultAddress = userData.addresses.find(addr => addr.isDefault) || userData.addresses[0];
            const addressFields = ['address', 'city', 'state', 'zipCode'];
            addressFields.forEach(field => {
                const element = document.querySelector(`[name="${field}"]`);
                if (element && defaultAddress[field]) {
                    element.value = defaultAddress[field];
                }
            });
        }
    }

    /**
     * Render order summary
     */
    renderOrderSummary() {
        const container = document.getElementById('orderSummary');
        if (!container || !this.orderData) return;

        const itemsHtml = this.orderData.items.map(item => this.renderOrderItem(item)).join('');
        container.innerHTML = itemsHtml;

        this.updateOrderTotals();
    }

    /**
     * Render order item
     */
    renderOrderItem(item) {
        const itemTotal = item.price * item.quantity;
        const productName = this.sanitizeHtml(item.product.name);
        
        return `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <div class="fw-bold">${productName}</div>
                    <small class="text-muted">Qty: ${item.quantity}</small>
                </div>
                <div class="text-end">
                    <div>${this.formatCurrency(itemTotal)}</div>
                    <small class="text-muted">${this.formatCurrency(item.price)} each</small>
                </div>
            </div>
        `;
    }

    /**
     * Update order totals display
     */
    updateOrderTotals() {
        const elements = {
            subtotal: document.getElementById('subtotal'),
            shipping: document.getElementById('shipping'),
            tax: document.getElementById('tax'),
            total: document.getElementById('total')
        };

        if (elements.subtotal) elements.subtotal.textContent = this.formatCurrency(this.orderData.subtotal);
        if (elements.shipping) elements.shipping.textContent = this.formatCurrency(this.orderData.shipping);
        if (elements.tax) elements.tax.textContent = this.formatCurrency(this.orderData.tax);
        if (elements.total) elements.total.textContent = this.formatCurrency(this.orderData.total);
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return `${this.config.pricing.currencySymbol}${parseFloat(amount).toFixed(2)}`;
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        if (this.isProcessing) {
            return;
        }

        if (!this.validateForm()) {
            this.showAlert(this.config.messages.errors.validation, 'danger');
            return;
        }

        this.setProcessingState(true);

        try {
            const orderResponse = await this.createOrder();
            if (!orderResponse.ok) {
                throw new Error('Failed to create order');
            }

            const order = await orderResponse.json();

            if (this.stripe && !this.config.features.demoMode) {
                await this.processPayment(order);
            } else {
                await this.completeOrder(order._id);
            }

        } catch (error) {
            console.error('[Checkout] Error:', error);
            this.showAlert(error.message || this.config.messages.errors.general, 'danger');
        } finally {
            this.setProcessingState(false);
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        const form = document.getElementById('checkoutForm');
        if (!form || !this.config.features.validateForm) return true;

        let isValid = true;
        const fields = form.querySelectorAll('input, textarea, select');
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Set processing state
     */
    setProcessingState(processing) {
        this.isProcessing = processing;
        
        const submitButton = document.getElementById('submitButton');
        const buttonText = document.getElementById('buttonText');
        const spinner = document.getElementById('spinner');

        if (submitButton) {
            submitButton.disabled = processing;
        }

        if (buttonText) {
            buttonText.textContent = processing ? this.config.messages.info.processing : this.config.messages.info.completeOrder;
        }

        if (spinner) {
            spinner.style.display = processing ? 'inline-block' : 'none';
        }
    }

    /**
     * Create order
     */
    async createOrder() {
        const formData = new FormData(document.getElementById('checkoutForm'));
        const orderData = {
            items: this.orderData.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.price
            })),
            shippingAddress: {
                firstName: this.sanitizeInput(formData.get('firstName')),
                lastName: this.sanitizeInput(formData.get('lastName')),
                email: this.sanitizeInput(formData.get('email')),
                phone: this.sanitizeInput(formData.get('phone')),
                address: this.sanitizeInput(formData.get('address')),
                city: this.sanitizeInput(formData.get('city')),
                state: this.sanitizeInput(formData.get('state')),
                zipCode: this.sanitizeInput(formData.get('zipCode'))
            },
            subtotal: this.orderData.subtotal,
            shipping: this.orderData.shipping,
            tax: this.orderData.tax,
            total: this.orderData.total,
            notes: this.sanitizeInput(formData.get('notes'))
        };

        return await this.makeRequest(this.config.endpoints.orders, 'POST', orderData);
    }

    /**
     * Process payment
     */
    async processPayment(order) {
        const paymentResponse = await this.makeRequest(this.config.endpoints.payments, 'POST', {
            amount: this.orderData.total,
            orderId: order._id
        });

        if (!paymentResponse.ok) {
            throw new Error(this.config.messages.errors.paymentIntent);
        }

        const { clientSecret } = await paymentResponse.json();

        const { error } = await this.stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: this.cardElement,
                billing_details: {
                    name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
                    email: order.shippingAddress.email
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        await this.completeOrder(order._id);
    }

    /**
     * Complete order
     */
    async completeOrder(orderId) {
        localStorage.removeItem('cart');
        this.showAlert(this.config.messages.success.orderPlaced, 'success');

        setTimeout(() => {
            window.location.href = `${this.config.redirects.order}/${orderId}`;
        }, this.config.ui.redirectDelay);
    }

    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        let lastError;
        
        for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
            try {
                const response = await fetch(url, options);
                
                if (response.ok || !this.config.features.retryFailedRequests) {
                    return response;
                }
                
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                
            } catch (error) {
                lastError = error;
            }

            if (attempt < this.config.retry.maxAttempts) {
                const delay = this.config.retry.delay * Math.pow(this.config.retry.backoff, attempt - 1);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        if (typeof window.appManager !== 'undefined' && window.appManager.showMessage) {
            window.appManager.showMessage(message, type);
            return;
        }

        // Fallback alert implementation
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.style.cssText = `
            top: ${this.config.ui.alertPosition.top};
            right: ${this.config.ui.alertPosition.right};
            z-index: ${this.config.ui.alertPosition.zIndex};
            min-width: ${this.config.ui.alertPosition.minWidth};
        `;
        
        alertDiv.innerHTML = `
            ${this.sanitizeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, this.config.ui.alertTimeout);
    }

    /**
     * Sanitize HTML input
     */
    sanitizeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Sanitize input value
     */
    sanitizeInput(value) {
        if (typeof value !== 'string') return '';
        return value.trim().replace(/[<>]/g, '');
    }
}

// Initialize checkout when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Checkout();
});
