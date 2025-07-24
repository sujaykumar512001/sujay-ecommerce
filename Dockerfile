# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create uploads directory
RUN mkdir -p public/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9000

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"] 