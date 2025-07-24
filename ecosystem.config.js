module.exports = {
  apps: [
    {
      name: 'ecommerce-app',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 9000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 9000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'public/uploads'],
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      shutdown_with_message: true
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/ecommerce-project.git',
      path: '/var/www/ecommerce',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 