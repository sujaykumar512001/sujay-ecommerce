module.exports = {
  apps: [
    {
      name: 'ecommerce-api',
      script: 'server.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 9000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 9000
      },
      // Performance settings
      max_memory_restart: process.env.PM2_MEMORY_LIMIT || '512M',
      node_args: '--max-old-space-size=512',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Watch settings (development only)
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: [
        'node_modules',
        'logs',
        'public',
        'uploads',
        '.git'
      ],
      
      // Environment variables
      env_file: '.env',
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen timeout
      listen_timeout: 8000,
      
      // Source map support
      source_map_support: true,
      
      // Metrics
      pmx: true,
      
      // Cron jobs (if needed)
      cron_restart: '0 2 * * *', // Restart at 2 AM daily
      
      // Merge logs
      merge_logs: true,
      
      // Disable source map
      disable_source_map_support: false,
      
      // Enable PM2 monitoring
      pmx_module: true,
      
      // Auto restart on file change (development)
      autorestart: true,
      
      // Wait for ready signal
      wait_ready: true,
      
      // Send ready signal
      listen_timeout: 8000,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Error handling
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      
      // Log rotation
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Metrics
      pmx: true,
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Environment specific settings
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 9000,
        PM2_MEMORY_LIMIT: '1G',
        PM2_INSTANCES: 'max'
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: process.env.PORT || 9000,
        PM2_MEMORY_LIMIT: '512M',
        PM2_INSTANCES: 2
      },
      
      env_development: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 9000,
        PM2_MEMORY_LIMIT: '256M',
        PM2_INSTANCES: 1,
        watch: true
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/ecommerce-project.git',
      path: '/var/www/ecommerce',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'deploy',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/ecommerce-project.git',
      path: '/var/www/ecommerce-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
}; 