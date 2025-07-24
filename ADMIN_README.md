# Admin Panel Documentation

## Overview

The E-Commerce Admin Panel is a comprehensive management system that provides full control over your online store. It includes user management, product management, order processing, review moderation, analytics, and system settings.

## Features

### 🔐 Authentication & Security
- Secure admin login with role-based access control
- JWT token-based authentication
- Admin-only routes protection
- Session management

### 📊 Dashboard & Analytics
- Real-time statistics overview
- Revenue and sales analytics
- Order status tracking
- User growth metrics
- Interactive charts and graphs

### 👥 User Management
- View all registered users
- Search and filter users by role, status, or name
- Edit user profiles and roles
- Activate/deactivate user accounts
- Bulk user operations
- User activity tracking

### 📦 Product Management
- Add, edit, and delete products
- Product categorization and tagging
- Stock management with low stock alerts
- Product status control (active/inactive)
- Bulk product operations
- Product image management
- SKU generation

### 🛒 Order Management
- View all customer orders
- Order status updates (pending, processing, shipped, delivered, cancelled)
- Order search and filtering
- Date range filtering
- Order details and customer information
- Tracking number management
- Order export functionality

### ⭐ Review Management
- Moderate customer reviews
- Approve/reject reviews
- Review rating filtering
- Bulk review operations
- Review analytics

### 📈 Analytics & Reports
- Sales analytics with customizable time periods
- Revenue tracking and forecasting
- Category performance analysis
- Customer behavior insights
- Export functionality for all data

### ⚙️ System Settings
- Store configuration
- Email settings
- Currency and timezone settings
- System health monitoring

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- All required npm packages installed

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd ecommerce-project
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your-secret-key
   SESSION_SECRET=your-session-secret
   PORT=3000
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

### Accessing the Admin Panel

1. **Navigate to the admin login page**:
   ```
   http://localhost:3000/admin/login
   ```

2. **Use the demo credentials**:
   - **Email**: admin@estore.com
   - **Password**: admin123

3. **Create an admin user** (if needed):
   You can create additional admin users through the API or directly in the database.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current user info

### Dashboard & Stats
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/analytics/sales` - Get sales analytics
- `GET /api/admin/inventory/alerts` - Get inventory alerts

### User Management
- `GET /api/admin/users` - Get all users (with pagination and filters)
- `GET /api/admin/users/:id` - Get single user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/bulk-update` - Bulk update users

### Product Management
- `GET /api/admin/products` - Get all products (with pagination and filters)
- `GET /api/admin/products/:id` - Get single product
- `POST /api/admin/products` - Create new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `PUT /api/admin/products/bulk-status` - Bulk update product status

### Order Management
- `GET /api/admin/orders` - Get all orders (with pagination and filters)
- `GET /api/admin/orders/:id` - Get single order
- `PUT /api/admin/orders/:id/status` - Update order status
- `PUT /api/admin/orders/:id/cancel` - Cancel order

### Review Management
- `GET /api/admin/reviews` - Get all reviews (with pagination and filters)
- `PUT /api/admin/reviews/:id/approve` - Approve/reject review
- `DELETE /api/admin/reviews/:id` - Delete review

### Export & Utilities
- `GET /api/admin/export/:type` - Export data (orders, products, users, reviews)
- `GET /api/admin/health` - System health check

## Usage Guide

### Dashboard Navigation

The admin panel uses a single-page application approach with the following sections:

1. **Dashboard** - Overview and statistics
2. **Users** - User management
3. **Products** - Product management
4. **Orders** - Order management
5. **Reviews** - Review moderation
6. **Analytics** - Detailed analytics
7. **Settings** - System configuration

### User Management

#### Viewing Users
1. Navigate to the "Users" section
2. Use the search bar to find specific users
3. Filter by role (user, admin, moderator) or status (active, inactive)
4. Use pagination to browse through all users

#### Adding a New User
1. Click the "Add User" button
2. Fill in the required information:
   - First Name
   - Last Name
   - Email
   - Role
   - Status
3. Click "Save User"

#### Editing Users
1. Click the edit button (pencil icon) next to any user
2. Modify the user information
3. Click "Save User"

#### Bulk Operations
1. Select multiple users using checkboxes
2. Choose the bulk action:
   - Activate Selected
   - Deactivate Selected
3. Confirm the action

### Product Management

#### Adding Products
1. Navigate to the "Products" section
2. Click "Add Product"
3. Fill in the product details:
   - Product Name
   - Description
   - Price
   - Stock Quantity
   - Category
   - Status
4. Click "Save Product"

#### Managing Product Status
- **Active**: Product is visible to customers
- **Inactive**: Product is hidden from customers

#### Stock Management
- Monitor low stock alerts
- Update stock quantities
- Set products as out of stock

### Order Management

#### Viewing Orders
1. Navigate to the "Orders" section
2. Use filters to find specific orders:
   - Search by order number or customer
   - Filter by status
   - Filter by date range

#### Updating Order Status
1. Click the edit button next to an order
2. Select the new status:
   - **Pending**: Order received, awaiting processing
   - **Processing**: Order is being prepared
   - **Shipped**: Order has been shipped
   - **Delivered**: Order has been delivered
   - **Cancelled**: Order has been cancelled
3. Add tracking number (optional)
4. Add notes (optional)
5. Click "Update Status"

### Review Moderation

#### Managing Reviews
1. Navigate to the "Reviews" section
2. Filter reviews by rating or approval status
3. For each review:
   - **Approve**: Make the review visible to customers
   - **Reject**: Hide the review from customers
   - **Delete**: Permanently remove the review

#### Bulk Review Operations
1. Select multiple reviews
2. Choose to approve or reject all selected reviews

### Analytics

#### Sales Analytics
- View revenue trends over time
- Analyze sales by category
- Monitor order patterns
- Track customer behavior

#### Exporting Data
1. Navigate to any section
2. Click the export button
3. Choose the data type to export
4. Download the JSON file

## Security Features

### Authentication
- JWT token-based authentication
- Secure password hashing
- Session management
- Role-based access control

### Authorization
- Admin-only routes protection
- Middleware validation
- Input sanitization
- CSRF protection

### Data Protection
- Password encryption
- Secure API endpoints
- Input validation
- Error handling

## Customization

### Styling
The admin panel uses a custom CSS framework. You can customize the appearance by modifying:
- `/public/CSS/admin.css` - Main admin styles
- Individual component styles in the views

### Adding New Features
1. **Backend**: Add new routes in `/routes/admin.js`
2. **Frontend**: Add new sections in `/views/admin/dashboard.ejs`
3. **JavaScript**: Add functionality in `/public/js/admin.js`

### Database Schema
The admin panel works with the following models:
- `User` - User accounts and profiles
- `Product` - Product information
- `Order` - Order details and status
- `Review` - Customer reviews

## Troubleshooting

### Common Issues

#### Login Problems
- Ensure the server is running
- Check that the database is connected
- Verify the admin user exists in the database
- Check browser console for JavaScript errors

#### Data Not Loading
- Check the browser's network tab for API errors
- Verify the API endpoints are working
- Check server logs for errors
- Ensure the database connection is stable

#### Styling Issues
- Clear browser cache
- Check that CSS files are being served correctly
- Verify Font Awesome is loading
- Check for CSS conflicts

### Debug Mode
To enable debug mode, set the following environment variable:
```env
DEBUG=true
```

This will provide more detailed error messages and logging.

## Performance Optimization

### Database Optimization
- Use indexes on frequently queried fields
- Implement pagination for large datasets
- Use aggregation pipelines for complex queries

### Frontend Optimization
- Lazy load components
- Implement virtual scrolling for large tables
- Use debouncing for search inputs
- Cache API responses

### Caching
- Implement Redis caching for frequently accessed data
- Cache API responses
- Use browser caching for static assets

## Deployment

### Production Setup
1. Set production environment variables
2. Configure a production database
3. Set up SSL certificates
4. Configure a reverse proxy (nginx)
5. Set up monitoring and logging

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret
PORT=3000
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the server logs
3. Check the browser console for errors
4. Verify database connectivity
5. Test API endpoints directly

## Contributing

To contribute to the admin panel:
1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Write clear documentation
5. Test thoroughly before submitting

## License

This admin panel is part of the E-Commerce project and follows the same license terms. 