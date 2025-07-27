const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Root index.js test successful!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test successful!',
    timestamp: new Date().toISOString()
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app; 