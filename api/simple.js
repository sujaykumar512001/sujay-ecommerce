const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'Simple test successful!',
    timestamp: new Date().toISOString()
  });
});

module.exports = app; 