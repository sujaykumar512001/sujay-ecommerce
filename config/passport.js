const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Passport Configuration for local strategy with login attempt tracking and status checks
 */
class PassportConfig {
  constructor() {
    this.loginAttempts = new Map();
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION) || 15 * 60 * 1000;
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    this.config = {
      usernameField: process.env.AUTH_USERNAME_FIELD || 'email',
      passwordField: process.env.AUTH_PASSWORD_FIELD || 'password',
      errorMessages: {
        invalidEmail: process.env.AUTH_ERROR_INVALID_EMAIL || 'Invalid email format',
        emailNotRegistered: process.env.AUTH_ERROR_EMAIL_NOT_REGISTERED || 'Email not found',
        invalidPassword: process.env.AUTH_ERROR_INVALID_PASSWORD || 'Invalid password',
        accountLocked: process.env.AUTH_ERROR_ACCOUNT_LOCKED || 'Too many failed attempts, account temporarily locked',
        accountInactive: process.env.AUTH_ERROR_ACCOUNT_INACTIVE || 'Account is inactive',
        accountNotVerified: process.env.AUTH_ERROR_ACCOUNT_NOT_VERIFIED || 'Email not verified',
        genericError: process.env.AUTH_ERROR_GENERIC || 'Authentication failed'
      },
      security: {
        requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
        requireAccountActivation: process.env.AUTH_REQUIRE_ACCOUNT_ACTIVATION === 'true'
      }
    };
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isUserLocked(email) {
    const attempt = this.loginAttempts.get(email);
    if (!attempt) return false;

    const { count, lastAttempt } = attempt;
    if (Date.now() - lastAttempt > this.lockoutDuration) {
      this.loginAttempts.delete(email);
      return false;
    }

    return count >= this.maxLoginAttempts;
  }

  recordFailedAttempt(email) {
    const attempt = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempt.count++;
    attempt.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempt);

    console.warn(`⚠️ Login attempt ${attempt.count}/${this.maxLoginAttempts} for: ${email}`);
  }

  clearFailedAttempts(email) {
    this.loginAttempts.delete(email);
  }

  async checkAccountStatus(user) {
    if (this.config.security.requireAccountActivation && user.status !== 'active') {
      return { valid: false, message: this.config.errorMessages.accountInactive };
    }
    if (this.config.security.requireEmailVerification && !user.emailVerified) {
      return { valid: false, message: this.config.errorMessages.accountNotVerified };
    }
    return { valid: true };
  }

  logAuthEvent(email, event, success, details = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      email,
      event,
      success,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      reason: details.reason || null
    };

    const status = success ? '✅' : '❌';
    const msg = `${status} Auth ${event} - ${email} - ${logData.reason || ''}`;
    console[success ? 'log' : 'warn'](msg);

    // Future: Log to file or monitoring service in production
  }

  configure(passport) {
    passport.use(
      new LocalStrategy(
        {
          usernameField: this.config.usernameField,
          passwordField: this.config.passwordField,
          passReqToCallback: true
        },
        async (req, email, password, done) => {
          try {
            if (!email || !password || !this.validateEmail(email)) {
              return done(null, false, { message: this.config.errorMessages.invalidEmail });
            }

            if (this.isUserLocked(email)) {
              return done(null, false, { message: this.config.errorMessages.accountLocked });
            }

            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            if (!user) {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, {
                reason: 'user_not_found',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { message: this.config.errorMessages.emailNotRegistered });
            }

            const status = await this.checkAccountStatus(user);
            if (!status.valid) {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, {
                reason: 'account_invalid',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { message: status.message });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
              this.recordFailedAttempt(email);
              this.logAuthEvent(email, 'login', false, {
                reason: 'invalid_password',
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              return done(null, false, { message: this.config.errorMessages.invalidPassword });
            }

            this.clearFailedAttempts(email);
            user.lastLogin = new Date();
            await user.save();

            this.logAuthEvent(email, 'login', true, {
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });

            return done(null, user);
          } catch (err) {
            console.error('❌ Auth system error:', err.message);
            this.logAuthEvent(email, 'login', false, {
              reason: 'system_error',
              error: err.message,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });
            return done(null, false, { message: this.config.errorMessages.genericError });
          }
        }
      )
    );

    passport.serializeUser((user, done) => done(null, user.id));

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id).select('-password');
        done(null, user || false);
      } catch (err) {
        console.error('❌ Deserialization error:', err.message);
        done(err, null);
      }
    });

    return this;
  }

  getAuthStats() {
    let totalFailedAttempts = 0;
    let lockedAccounts = 0;

    for (const [email, attempts] of this.loginAttempts.entries()) {
      totalFailedAttempts += attempts.count;
      if (this.isUserLocked(email)) lockedAccounts++;
    }

    return {
      totalFailedAttempts,
      lockedAccounts,
      activeAttempts: Array.from(this.loginAttempts.entries())
    };
  }

  clearAllFailedAttempts() {
    this.loginAttempts.clear();
    // Cleared all failed login attempts
  }
}

const passportConfig = new PassportConfig();

// Main export for passport setup
module.exports = (passport) => passportConfig.configure(passport);

// Additional export for monitoring/admin utilities
module.exports.config = passportConfig;
