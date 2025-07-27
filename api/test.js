module.exports = (req, res) => {
  try {
    res.status(200).json({
      message: 'Minimal test successful!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}; 