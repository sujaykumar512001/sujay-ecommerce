# =============================================================================
# E-COMMERCE APPLICATION DOCKERFILE
# Multi-stage build for production deployment
# =============================================================================

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build assets (if needed)
RUN pnpm run build || echo "No build script found"

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app ./

# Create necessary directories
RUN mkdir -p logs uploads cache && \
    chown -R nodejs:nodejs logs uploads cache

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9000

# Start the application
CMD ["node", "server.js"] 