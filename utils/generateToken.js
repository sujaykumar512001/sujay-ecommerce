const jwt = require('jsonwebtoken');
const CONSTANTS = require('../config/constants');

/**
 * Generate JWT token for user authentication
 * @param {string} userId - User ID to encode in token
 * @param {string} role - User role (optional)
 * @returns {string} JWT token
 */
const generateToken = (userId, role = 'user') => {
  try {
    const payload = {
      id: userId,
      role: role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (CONSTANTS.JWT_EXPIRES_IN || 24 * 60 * 60) // 24 hours default
    };

    return jwt.sign(payload, CONSTANTS.JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, CONSTANTS.JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
};

/**
 * Decode JWT token without verification (for reading only)
 * @param {string} token - JWT token to decode
 * @returns {object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error);
    throw new Error('Invalid token format');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
}; 