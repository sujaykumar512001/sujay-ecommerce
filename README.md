# Yadav Collection

A premium fashion and handmade art e-commerce application built with Node.js, Express.js, MongoDB, and EJS templates.

**Owner:** Sujay Yadav

## Features

- User authentication and authorization
- Product catalog with search and filtering
- Shopping cart functionality
- Order management
- Admin dashboard
- Payment integration (Stripe)
- Responsive design with CSS3

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: EJS templates with Tailwind CSS
- **Validation**: Joi schema validation
- **Security**: bcryptjs for password hashing, rate limiting

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd yadav-collection
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ecommerce
SESSION_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
NODE_ENV=development
```

4. Seed the database (optional):
```bash
npm run seed
```

## Running the Application

### Development Mode
```bash
npm run dev
```
This starts the server with nodemon for auto-reloading.

### Production Mode
```bash
npm start
```

## Deployment

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Using Docker
```bash
# Build the Docker image
docker build -t ecommerce-app .

# Run the container
docker run -p 3000:3000 ecommerce-app
```

### Environment Variables
Make sure to set up your environment variables for production:
- `NODE_ENV=production`
- `MONGODB_URI` - Your MongoDB connection string
- `SESSION_SECRET` - Secure session secret
- `JWT_SECRET` - Secure JWT secret
- `CLIENT_URL` - Your domain URL
- `DOMAIN` - Your domain for cookies

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project Structure

```
yadav-collection/
├── config/          # Database configuration
├── middleware/      # Express middleware
├── models/          # MongoDB models
├── public/          # Static files (CSS, JS, images)
├── routes/          # Express routes
├── scripts/         # Database seeding and utilities
├── utils/           # Helper functions
├── views/           # EJS templates
└── server.js        # Main application file
```

## API Endpoints

### Products
- `GET /products/api` - Get all products with filtering
- `GET /products/api/:id` - Get single product
- `POST /products/api` - Create product (admin only)
- `PUT /products/api/:id` - Update product (admin only)
- `DELETE /products/api/:id` - Delete product (admin only)

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

## Recent Changes

### Removed Tailwind CSS
- Replaced Tailwind CSS with regular CSS3
- Removed Tailwind dependencies and build scripts
- Created custom CSS classes for all styling needs
- Improved performance and reduced bundle size

### JavaScript Fixes
- Added null checks for DOM elements to prevent errors
- Fixed API endpoint URLs to match the correct route structure
- Improved error handling and logging

### Template Issues
- Ensured all routes pass the `title` variable to templates
- Fixed template rendering errors

## CSS Classes

The application uses custom CSS3 classes:

### Layout
- `.container` - Main container with max-width
- `.grid` - CSS Grid layout
- `.grid-cols-1/2/3/4` - Grid columns
- `.flex` - Flexbox layout

### Components
- `.btn` - Button base class
- `.btn-primary` - Primary button (blue)
- `.btn-secondary` - Secondary button (gray)
- `.btn-outline` - Outline button
- `.product-card` - Product card styling
- `.form-input` - Form input styling

### Utilities
- `.text-center/left/right` - Text alignment
- `.mb-4/8` - Margin bottom
- `.mt-4/8` - Margin top
- `.p-4/6/8` - Padding
- `.gap-4/6/8` - Gap spacing

## Troubleshooting

### Common Issues

1. **"Cannot read properties of null" errors**
   - These are now handled with null checks
   - Check browser console for specific element issues

2. **API response errors**
   - Ensure MongoDB is running
   - Check API endpoint URLs in JavaScript files

3. **CSS not loading**
   - Verify the CSS file exists at `/public/CSS/style.css`
   - Check browser console for 404 errors

4. **Database connection issues**
   - Verify MongoDB is running
   - Check MONGODB_URI in .env file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License. 