#!/bin/bash

# =============================================================================
# E-COMMERCE APPLICATION DEPLOYMENT SCRIPT
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ecommerce-api"
DEPLOY_ENV=${1:-production}
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root"
   exit 1
fi

# Create necessary directories
mkdir -p $BACKUP_DIR $LOG_DIR

log_info "Starting deployment for environment: $DEPLOY_ENV"

# Step 1: Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if .env file exists
if [ ! -f .env ]; then
    log_error ".env file not found. Please create one from env.example"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed. Please install it first: npm install -g pm2"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    log_error "pnpm is not installed. Please install it first: npm install -g pnpm"
    exit 1
fi

log_success "Pre-deployment checks passed"

# Step 2: Backup current deployment
log_info "Creating backup of current deployment..."

if pm2 list | grep -q $APP_NAME; then
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf $BACKUP_FILE --exclude=node_modules --exclude=logs --exclude=uploads .
    log_success "Backup created: $BACKUP_FILE"
else
    log_warning "No running application found to backup"
fi

# Step 3: Install dependencies
log_info "Installing dependencies..."
pnpm install --frozen-lockfile

if [ "$DEPLOY_ENV" = "production" ]; then
    pnpm install --frozen-lockfile --prod
fi

log_success "Dependencies installed"

# Step 4: Run tests (if available)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    log_info "Running tests..."
    if pnpm test; then
        log_success "Tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
fi

# Step 5: Build assets (if needed)
if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
    log_info "Building assets..."
    if pnpm run build; then
        log_success "Assets built successfully"
    else
        log_error "Asset build failed"
        exit 1
    fi
fi

# Step 6: Stop current application
log_info "Stopping current application..."
if pm2 list | grep -q $APP_NAME; then
    pm2 stop $APP_NAME
    pm2 delete $APP_NAME
    log_success "Application stopped"
else
    log_warning "No running application found"
fi

# Step 7: Start application with PM2
log_info "Starting application with PM2..."
pm2 start ecosystem.config.js --env $DEPLOY_ENV

# Step 8: Save PM2 configuration
pm2 save

# Step 9: Setup PM2 startup script
pm2 startup

log_success "PM2 startup script configured"

# Step 10: Health check
log_info "Performing health check..."
sleep 5

HEALTH_CHECK_URL="http://localhost:$(grep PORT .env | cut -d '=' -f2 || echo '9000')/health"

if curl -f -s $HEALTH_CHECK_URL > /dev/null; then
    log_success "Health check passed"
else
    log_error "Health check failed"
    log_info "Application logs:"
    pm2 logs $APP_NAME --lines 20
    exit 1
fi

# Step 11: Cleanup old backups (keep last 5)
log_info "Cleaning up old backups..."
ls -t $BACKUP_DIR/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm

# Step 12: Final status
log_info "Deployment completed successfully!"
log_info "Application status:"
pm2 status

log_info "Recent logs:"
pm2 logs $APP_NAME --lines 10

log_success "Deployment to $DEPLOY_ENV completed successfully!" 