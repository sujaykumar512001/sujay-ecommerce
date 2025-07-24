const nodemailer = require('nodemailer');
const CONSTANTS = require('../config/constants');

// Email templates
const emailTemplates = {
  welcome: (firstName) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Our E-commerce Store!</h2>
      <p>Hello ${firstName},</p>
      <p>Thank you for registering with us. We're excited to have you as part of our community!</p>
      <p>You can now:</p>
      <ul>
        <li>Browse our products</li>
        <li>Add items to your cart</li>
        <li>Track your orders</li>
        <li>Manage your profile</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The E-commerce Team</p>
    </div>
  `,
  
  passwordReset: (firstName, resetLink) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello ${firstName},</p>
      <p>We received a request to reset your password. Click the link below to create a new password:</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>The E-commerce Team</p>
    </div>
  `,
  
  orderConfirmation: (firstName, orderNumber, orderDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Confirmation</h2>
      <p>Hello ${firstName},</p>
      <p>Thank you for your order! Your order number is: <strong>${orderNumber}</strong></p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
        <h3>Order Details:</h3>
        ${orderDetails}
      </div>
      <p>We'll send you updates on your order status.</p>
      <p>Best regards,<br>The E-commerce Team</p>
    </div>
  `,
  
  orderShipped: (firstName, orderNumber, trackingNumber) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your Order Has Been Shipped!</h2>
      <p>Hello ${firstName},</p>
      <p>Great news! Your order #${orderNumber} has been shipped.</p>
      <p>Tracking Number: <strong>${trackingNumber}</strong></p>
      <p>You can track your package using the tracking number above.</p>
      <p>Best regards,<br>The E-commerce Team</p>
    </div>
  `
};

/**
 * Create email transporter
 * @returns {object} Nodemailer transporter
 */
const createTransporter = () => {
  const emailConfig = {
    host: CONSTANTS.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: CONSTANTS.EMAIL_PORT || process.env.EMAIL_PORT || 587,
    secure: CONSTANTS.EMAIL_SECURE || process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user: CONSTANTS.EMAIL_USER || process.env.EMAIL_USER,
      pass: CONSTANTS.EMAIL_PASS || process.env.EMAIL_PASS
    }
  };

  return nodemailer.createTransporter(emailConfig);
};

/**
 * Send email
 * @param {object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email text content (optional)
 * @returns {Promise} Email send result
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: CONSTANTS.EMAIL_FROM || process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @returns {Promise} Email send result
 */
const sendWelcomeEmail = async (email, firstName) => {
  return sendEmail({
    email,
    subject: 'Welcome to Our E-commerce Store!',
    html: emailTemplates.welcome(firstName)
  });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} resetLink - Password reset link
 * @returns {Promise} Email send result
 */
const sendPasswordResetEmail = async (email, firstName, resetLink) => {
  return sendEmail({
    email,
    subject: 'Password Reset Request',
    html: emailTemplates.passwordReset(firstName, resetLink)
  });
};

/**
 * Send order confirmation email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} orderNumber - Order number
 * @param {string} orderDetails - Order details HTML
 * @returns {Promise} Email send result
 */
const sendOrderConfirmationEmail = async (email, firstName, orderNumber, orderDetails) => {
  return sendEmail({
    email,
    subject: `Order Confirmation - #${orderNumber}`,
    html: emailTemplates.orderConfirmation(firstName, orderNumber, orderDetails)
  });
};

/**
 * Send order shipped email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} orderNumber - Order number
 * @param {string} trackingNumber - Tracking number
 * @returns {Promise} Email send result
 */
const sendOrderShippedEmail = async (email, firstName, orderNumber, trackingNumber) => {
  return sendEmail({
    email,
    subject: `Your Order #${orderNumber} Has Been Shipped!`,
    html: emailTemplates.orderShipped(firstName, orderNumber, trackingNumber)
  });
};

module.exports = {
  sendEmail,
  emailTemplates,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail
}; 