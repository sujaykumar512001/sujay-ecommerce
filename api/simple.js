module.exports = (req, res) => {
  res.json({
    message: 'Simple test successful!',
    timestamp: new Date().toISOString()
  });
}; 