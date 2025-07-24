const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Authentication Configuration
 * Handles user authentication with security features
 */
class PassportConfig {
  constructor() {
    this.config = this.getConfig();
    this.loginAttempts = new Map(); // Track failed login attempts
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 15 * 60 * 1000; // 15 minutes
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  /**
   * Get configuration from environment variables
   */
  getConfig() {
    return {
      usernameField: process.env.AUTH_USERNAME_FIELD || 'email',
      passwordField: process.env.AUTH_PASSWORD_FIELD || 'password',
      errorMessages: {
        invalidEmail: process.env.AUTH_ERROR_INVALID_EMAIL || 'Please provide a valid email address',
        emailNotRegistered: process.env.AUTH_ERROR_EMAIL_NOT_REGISTERED || 'Email address not found',
        invalidPassword: process.env.AUTH_ERROR_INVALID_PASSWORD || 'Invalid password',
        accountLocked: process.env.AUTH_ERROR_ACCOUNT_LOCKED || 'Account temporarily locked due to too many failed attempts',
        accountInactive: process.env.AUTH_ERROR_ACCOUNT_INACTIVE || 'Account is not active',
        accountNotVerified: process.env.AUTH_ERROR_ACCOUNT_NOT_VERIFIED || 'Please verify your email address',
        genericError: process.env.AUTH_ERROR_GENERIC || 'Authentication failed',
        tooManyAttempts: process.env.AUTH_ERROR_TOO_MANY_ATTEMPTS || 'Too many failed attempts. Please try again later'
      },
      security: {
        requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
        requireAccountActivation: process.env.AUTH_REQUIRE_ACCOUNT_ACTIVATION === 'true',
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 15 * 60 * 1000,
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000 // 24 hours
      }
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if user is locked out
   */
  isUserLocked(email) {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;

    const { count, lastAttempt } = attempts;
    const timeSinceLastAttempt = Date.now() - lastAttempt;

    // Reset if lockout period has passed
    if (timeSinceLastAttempt > this.lockoutDuration) {
      this.loginAttempts.delete(email);
      return false;
    }

    return count >= this.maxLoginAttempts;
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(email) {
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempts);

    // Log failed attempt
    console.warn(`⚠️ Failed login attempt for email: ${email} (attempt ${attempts.count}/${this.maxLoginAttempts})`);
  }

  /**
   * Clear failed attempts for successful login
   */
  clearFailedAttempts(email) {
    this.loginAttempts.delete(email);
  }

  /**
   * Check account status
   */
  async checkAccountStatus(user) {
    // Check if account is active
    if (this.config.security.requireAccountActivation && user.status !== 'active') {
      return { valid: false, message: this.config.errorMessages.accountInactive };
    }

    // Check if email is verified
    if (this.config.security.requireEmailVerification && !user.emailVerified) {
      return { valid: false, message: this.config.errorMessages.accountNotVerified };
    }

    return { valid: true };
  }

  /**
   * Log authentication events
   */
  logAuthEvent(email, event, success, details = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      email: email,
      event: event,
      success: success,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      ...details
    };

    if (success) {
      console.log(`✅ Authentication success: ${email} - ${event}`);
    } else {
      console.warn(`❌ Authentication failure: ${email} - ${event} - ${details.reason || 'unknown'}`);
    }

    // In production, you might want to log to a file or database
    if (process.env.NODE_ENV === 'production') {
      // Add production logging here
    }
  }

  /**
   * Configure Passport strategies
   */
  configure(passport) {
    // Local Strategy
    passport.use(
      new LocalStrategy(
        { 
          usernameField: this.config.usernameField,
          passwordField: this.config.passwordField,
          passReqToCallback: true // Allow access to request object
        }, 
        async (req, email, password, done) => {
          try {
            // Input validation
            if (!email || !password) {
              return done(null, false, { 
                message: this.config.errorMessages.genericError 
              });
            }

            // Validate email format
            if (!this.validateEmail(email)) {
              return done(null, false, { 
                message: this.config.errorMessages.invalidEmail 
              });
            }

            // Check if user is locked out
            if (this.isUserLocked(email)) {
              return done(null, false, { 
                message: this.config.errorMessages.accountLocked 
              });
            }

            // Find user with password field
            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            
            if (!user) {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, { 
                reason: 'user_not_found',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { 
                message: this.config.errorMessages.emailNotRegistered 
              });
            }

            // Check account status
            const statusCheck = await this.checkAccountStatus(user);
            if (!statusCheck.valid) {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, { 
                reason: 'account_status_invalid',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { 
                message: statusCheck.message 
              });
            }

            // Verify password
            if (!user.password) {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, { 
                reason: 'no_password_set',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { 
                message: this.config.errorMessages.invalidPassword 
              });
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
              // Clear failed attempts on successful login
              this.clearFailedAttempts(email);
              
              // Update last login
              user.lastLogin = new Date();
              await user.save();
              
              this.logAuthEvent(email, 'login', true, { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              
              return done(null, user);
            } else {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, { 
                reason: 'invalid_password',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { 
                message: this.config.errorMessages.invalidPassword 
              });
            }
          } catch (err) {
            console.error('❌ Authentication error:', err.message);
            this.logAuthEvent(email, 'login', false, { 
              reason: 'system_error',
              error: err.message,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });
            return done(null, false, { 
              message: this.config.errorMessages.genericError 
            });
          }
        }
      )
    );

    // Serialize user for session
    passport.serializeUser((user, done) => {
      try {
        done(null, user.id);
      } catch (err) {
        console.error('❌ Serialization error:', err.message);
        done(err);
      }
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id).select('-password');
        if (!user) {
          return done(null, false);
        }
        done(null, user);
      } catch (err) {
        console.error('❌ Deserialization error:', err.message);
        done(err, null);
      }
    });

    return this;
  }

  /**
   * Get authentication statistics
   */
  getAuthStats() {
    const stats = {
      totalFailedAttempts: 0,
      lockedAccounts: 0,
      activeAttempts: new Map()
    };

    for (const [email, attempts] of this.loginAttempts.entries()) {
      stats.totalFailedAttempts += attempts.count;
      if (this.isUserLocked(email)) {
        stats.lockedAccounts++;
      }
      stats.activeAttempts.set(email, attempts);
    }

    return stats;
  }

  /**
   * Clear all failed attempts (admin function)
   */
  clearAllFailedAttempts() {
    this.loginAttempts.clear();
    console.log('✅ Cleared all failed login attempts');
  }
}

// Create and export instance
const passportConfig = new PassportConfig();

// Export the configuration function
module.exports = function(passport) {
  return passportConfig.configure(passport);
};

// Export the config instance for additional functionality
module.exports.config = passportConfig; 