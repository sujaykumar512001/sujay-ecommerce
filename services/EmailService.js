const nodemailer = require('nodemailer')
const CONSTANTS = require('../config/constants')

/**
 * Email Service - Handles all email operations
 */
class EmailService {
  constructor({ config, loggingService, cacheService }) {
    this.config = config
    this.loggingService = loggingService
    this.cacheService = cacheService
    this.transporter = null
    this.emailConfig = this.getEmailConfig()
    this.validateEmailConfig()
    this.initializeTransporter()
  }

  /**
   * Get email configuration from environment variables
   */
  getEmailConfig() {
    return {
      host: process.env.EMAIL_HOST || this.config?.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || parseInt(this.config?.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true' || this.config?.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER || this.config?.EMAIL_USER,
      pass: process.env.EMAIL_PASS || this.config?.EMAIL_PASS,
      from: process.env.EMAIL_FROM || this.config?.EMAIL_FROM || 'noreply@example.com',
      clientUrl: process.env.CLIENT_URL || this.config?.CLIENT_URL || 'http://localhost:3000',
      timeout: parseInt(process.env.EMAIL_TIMEOUT) || 10000,
      maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY) || 1000,
      maxRecipients: parseInt(process.env.EMAIL_MAX_RECIPIENTS) || 100,
      logging: {
        enabled: process.env.EMAIL_LOGGING_ENABLED !== 'false',
        level: process.env.EMAIL_LOG_LEVEL || 'info'
      }
    }
  }

  /**
   * Validate email configuration
   */
  validateEmailConfig() {
    if (!this.emailConfig.host) {
      throw new Error('EMAIL_HOST is required for email service')
    }
    if (!this.emailConfig.user) {
      throw new Error('EMAIL_USER is required for email service')
    }
    if (!this.emailConfig.pass) {
      throw new Error('EMAIL_PASS is required for email service')
    }
    if (this.emailConfig.port < 1 || this.emailConfig.port > 65535) {
      throw new Error('EMAIL_PORT must be between 1 and 65535')
    }
    if (this.emailConfig.timeout < 1000) {
      throw new Error('EMAIL_TIMEOUT must be at least 1000ms')
    }
  }

  /**
   * Log email events
   */
  log(level, message, data = {}) {
    if (!this.emailConfig.logging.enabled) return

    const logData = {
      timestamp: new Date().toISOString(),
      service: 'EmailService',
      level,
      message,
      ...data
    }

    if (this.loggingService) {
      this.loggingService[level](message, logData)
    } else {
      switch (level) {
        case 'error':
          console.error(`[EMAIL] ${message}`, logData)
          break
        case 'warn':
          console.warn(`[EMAIL] ${message}`, logData)
          break
        case 'info':
          // Email logging handled by service
          break
        case 'debug':
          if (this.emailConfig.logging.level === 'debug') {
            // Email debug logging handled by service
          }
          break
      }
    }
  }

  /**
   * Validate email address
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email address is required')
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email address format')
    }
    
    if (email.length > 254) {
      throw new Error('Email address too long')
    }
  }

  /**
   * Validate email options
   */
  validateEmailOptions(options) {
    const { to, subject, html, text } = options

    if (!to) {
      throw new Error('Recipient email is required')
    }

    if (Array.isArray(to)) {
      if (to.length === 0) {
        throw new Error('At least one recipient is required')
      }
      if (to.length > this.emailConfig.maxRecipients) {
        throw new Error(`Too many recipients. Maximum allowed: ${this.emailConfig.maxRecipients}`)
      }
      to.forEach(email => this.validateEmail(email))
    } else {
      this.validateEmail(to)
    }

    if (!subject || typeof subject !== 'string') {
      throw new Error('Email subject is required')
    }

    if (subject.length > 998) {
      throw new Error('Email subject too long')
    }

    if (!html && !text) {
      throw new Error('Email content (html or text) is required')
    }

    if (html && typeof html !== 'string') {
      throw new Error('HTML content must be a string')
    }

    if (text && typeof text !== 'string') {
      throw new Error('Text content must be a string')
    }
  }

  /**
   * Sanitize email content
   */
  sanitizeEmailContent(content) {
    if (!content || typeof content !== 'string') {
      return content
    }

    // Remove potentially dangerous HTML
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    if (!this.emailConfig.host) {
      this.log('warn', 'Email service not configured - no host provided')
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.user,
          pass: this.emailConfig.pass
        },
        connectionTimeout: this.emailConfig.timeout,
        greetingTimeout: this.emailConfig.timeout,
        socketTimeout: this.emailConfig.timeout
      })

      this.log('info', 'Email transporter initialized', {
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure
      })
    } catch (error) {
      this.log('error', 'Failed to initialize email transporter', {
        error: error.message
      })
      throw error
    }
  }

  /**
   * Send email with retry logic
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Email result
   */
  async sendEmail(options, retries = this.emailConfig.maxRetries) {
    try {
      this.validateEmailOptions(options)
    } catch (error) {
      this.log('error', 'Email validation failed', {
        error: error.message,
        to: options.to
      })
      throw error
    }

    if (!this.transporter) {
      const error = new Error('Email service not configured')
      this.log('error', 'Email service not configured')
      throw error
    }

    const { to, subject, html, text, from } = options

    try {
      const mailOptions = {
        from: from || this.emailConfig.from,
        to,
        subject: this.sanitizeEmailContent(subject),
        html: html ? this.sanitizeEmailContent(html) : undefined,
        text: text ? this.sanitizeEmailContent(text) : undefined
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      this.log('info', 'Email sent successfully', {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        messageId: result.messageId
      })

      return result
    } catch (error) {
      this.log('error', 'Email sending failed', {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        error: error.message,
        retriesLeft: retries
      })

      if (retries > 0 && this.isRetryableError(error)) {
        this.log('info', 'Retrying email send', {
          to: Array.isArray(to) ? to.join(', ') : to,
          retriesLeft: retries - 1
        })

        await this.delay(this.emailConfig.retryDelay)
        return this.sendEmail(options, retries - 1)
      }

      throw error
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNABORTED',
      'ENETUNREACH'
    ]

    return retryableErrors.includes(error.code) || 
           (error.response && error.response.status >= 500)
  }

  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Send welcome email
   * @param {Object} user - User object
   * @returns {Promise<Object>} Email result
   */
  async sendWelcomeEmail(user) {
    if (!user || !user.email) {
      throw new Error('User with email is required')
    }

    const html = `
      <h1>Welcome to ${CONSTANTS.SITE_NAME || 'E-Commerce Store'}!</h1>
      <p>Hi ${user.firstName || user.name || 'there'},</p>
      <p>Thank you for registering with us. We're excited to have you on board!</p>
      <p>Start shopping now: <a href="${this.emailConfig.clientUrl}/listings">Browse Products</a></p>
      <p>Best regards,<br>The ${CONSTANTS.SITE_NAME || 'E-Commerce'} Team</p>
    `

    return this.sendEmail({
      to: user.email,
      subject: CONSTANTS.EMAIL_SUBJECTS?.WELCOME || 'Welcome to E-Commerce Store',
      html
    })
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} Email result
   */
  async sendPasswordResetEmail(user, resetToken) {
    if (!user || !user.email) {
      throw new Error('User with email is required')
    }
    if (!resetToken) {
      throw new Error('Reset token is required')
    }

    const resetUrl = `${this.emailConfig.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`
    
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.firstName || user.name || 'there'},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in ${CONSTANTS.PASSWORD_RESET_EXPIRY || '1 hour'}.</p>
      <p>Best regards,<br>The ${CONSTANTS.SITE_NAME || 'E-Commerce'} Team</p>
    `

    return this.sendEmail({
      to: user.email,
      subject: CONSTANTS.EMAIL_SUBJECTS?.PASSWORD_RESET || 'Password Reset Request',
      html
    })
  }

  /**
   * Send order confirmation email
   * @param {Object} order - Order object
   * @param {Object} user - User object
   * @returns {Promise<Object>} Email result
   */
  async sendOrderConfirmationEmail(order, user) {
    if (!order || !order._id) {
      throw new Error('Order with ID is required')
    }
    if (!user || !user.email) {
      throw new Error('User with email is required')
    }

    const html = `
      <h1>Order Confirmation</h1>
      <p>Hi ${user.firstName || user.name || 'there'},</p>
      <p>Thank you for your order! Your order has been confirmed.</p>
      <h2>Order Details:</h2>
      <p>Order ID: ${order._id}</p>
      <p>Total: $${order.total || 0}</p>
      <p>Status: ${order.status || 'pending'}</p>
      <p><a href="${this.emailConfig.clientUrl}/orders/${order._id}">View Order</a></p>
      <p>Best regards,<br>The ${CONSTANTS.SITE_NAME || 'E-Commerce'} Team</p>
    `

    return this.sendEmail({
      to: user.email,
      subject: `${CONSTANTS.EMAIL_SUBJECTS?.ORDER_CONFIRMATION || 'Order Confirmation'} - #${order._id}`,
      html
    })
  }

  /**
   * Send newsletter email with rate limiting
   * @param {Array} subscribers - Array of subscriber emails
   * @param {Object} newsletter - Newsletter content
   * @returns {Promise<Array>} Email results
   */
  async sendNewsletterEmail(subscribers, newsletter) {
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      throw new Error('Subscribers array is required')
    }
    if (!newsletter || !newsletter.subject || !newsletter.content) {
      throw new Error('Newsletter with subject and content is required')
    }

    if (subscribers.length > this.emailConfig.maxRecipients) {
      throw new Error(`Too many subscribers. Maximum allowed: ${this.emailConfig.maxRecipients}`)
    }

    const results = []
    const batchSize = 10 // Send in batches to avoid overwhelming the server

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (email) => {
        try {
          const result = await this.sendEmail({
            to: email,
            subject: newsletter.subject,
            html: newsletter.content
          })
          return { email, success: true, result }
        } catch (error) {
          return { email, success: false, error: error.message }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults.map(r => r.value || r.reason))

      // Add delay between batches
      if (i + batchSize < subscribers.length) {
        await this.delay(1000)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    this.log('info', 'Newsletter email campaign completed', {
      total: results.length,
      success: successCount,
      failures: failureCount
    })

    return results
  }

  /**
   * Send notification email
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Email result
   */
  async sendNotificationEmail(notification) {
    if (!notification || !notification.user || !notification.user.email) {
      throw new Error('Notification with user email is required')
    }
    if (!notification.title || !notification.message) {
      throw new Error('Notification title and message are required')
    }

    const html = `
      <h1>${this.sanitizeEmailContent(notification.title)}</h1>
      <p>${this.sanitizeEmailContent(notification.message)}</p>
      ${notification.actionUrl ? `<p><a href="${notification.actionUrl}">Take Action</a></p>` : ''}
      <p>Best regards,<br>The ${CONSTANTS.SITE_NAME || 'E-Commerce'} Team</p>
    `

    return this.sendEmail({
      to: notification.user.email,
      subject: notification.title,
      html
    })
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} True if email service is working
   */
  async verifyConnection() {
    if (!this.transporter) {
      this.log('warn', 'Email service not configured')
      return false
    }

    try {
      await this.transporter.verify()
      this.log('info', 'Email service verification successful')
      return true
    } catch (error) {
      this.log('error', 'Email service verification failed', { 
        error: error.message 
      })
      return false
    }
  }

  /**
   * Get email service statistics
   */
  getStats() {
    return {
      configured: !!this.transporter,
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      timeout: this.emailConfig.timeout,
      maxRetries: this.emailConfig.maxRetries,
      maxRecipients: this.emailConfig.maxRecipients,
      logging: {
        enabled: this.emailConfig.logging.enabled,
        level: this.emailConfig.logging.level
      }
    }
  }

  /**
   * Get email templates
   * @returns {Object} Email templates
   */
  getTemplates() {
    return {
      welcome: this.sendWelcomeEmail.bind(this),
      passwordReset: this.sendPasswordResetEmail.bind(this),
      orderConfirmation: this.sendOrderConfirmationEmail.bind(this),
      newsletter: this.sendNewsletterEmail.bind(this),
      notification: this.sendNotificationEmail.bind(this)
    }
  }
}

module.exports = EmailService 