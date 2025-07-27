/**
 * Health Check Script
 * Used by Docker and deployment platforms to verify application health
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 9000,
  path: '/health',
  method: 'GET',
  timeout: 3000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.log(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('Health check failed:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('Health check timed out');
  request.destroy();
  process.exit(1);
});

request.end(); 