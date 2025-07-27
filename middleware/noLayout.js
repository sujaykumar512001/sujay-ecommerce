// Middleware to disable layout for specific routes
const disableLayout = (req, res, next) => {
  // Store original layout setting
  req.originalLayout = res.locals.layout;
  
  // Disable layout
  res.locals.layout = false;
  
  next();
};

module.exports = disableLayout; 