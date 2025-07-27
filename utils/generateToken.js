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
    // Parse JWT expiration time
    let expiresIn = CONSTANTS.JWT_EXPIRES_IN || '24h';
    
    // If expiresIn is a string like '7d', '24h', etc., use it directly
    // If it's a number, convert to seconds
    let expTime;
    if (typeof expiresIn === 'string') {
      // Use the string format directly with jwt.sign
      expTime = expiresIn;
    } else {
      // Convert number to seconds and add to current time
      expTime = Math.floor(Date.now() / 1000) + (expiresIn || 24 * 60 * 60);
    }

    const payload = {
      id: userId,
      role: role,
      iat: Math.floor(Date.now() / 1000)
    };

    // If expTime is a number, add it to payload
    if (typeof expTime === 'number') {
      payload.exp = expTime;
    }

    return jwt.sign(payload, CONSTANTS.JWT_SECRET || process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })(), {
      expiresIn: typeof expTime === 'string' ? expTime : undefined
    });
  } catch (error) {
    // Token generation error - logged by service
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
    return jwt.verify(token, CONSTANTS.JWT_SECRET || process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })());
  } catch (error) {
    // Token verification error - logged by service
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
    // Token decode error - logged by service
    throw new Error('Invalid token format');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
}; 