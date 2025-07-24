const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9000,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received successfully');
    console.log(`Content length: ${data.length} characters`);
    
    // Check for error messages
    if (data.includes('500 - Server Error')) {
      console.log('❌ Server Error detected');
      if (data.includes('featuredProducts is not defined')) {
        console.log('❌ featuredProducts variable error found');
      }
    } else if (data.includes('Yadav Collection')) {
      console.log('✅ Home page loaded successfully');
      if (data.includes('featuredProducts')) {
        console.log('✅ featuredProducts variable is present');
      } else {
        console.log('❌ featuredProducts variable is missing');
      }
    } else if (data.includes('404 - Page Not Found')) {
      console.log('❌ 404 Not Found');
    } else {
      console.log('❌ Unexpected response');
    }
    
    // Show first 500 characters of response for debugging
    console.log('\nFirst 500 characters of response:');
    console.log(data.substring(0, 500));
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
});

req.on('timeout', () => {
  console.error('Request timeout');
  req.destroy();
});

req.end(); 