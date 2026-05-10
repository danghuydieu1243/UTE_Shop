const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass
  }
});

/**
 * Send verification OTP email
 */
const sendVerificationEmail = async (email, otp) => {
  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: 'UTEShop - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to UTEShop!</h2>
        <p>Thank you for registering. Please verify your email address using the OTP below:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">UTEShop E-commerce Platform</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send password reset OTP email
 */
const sendPasswordResetEmail = async (email, otp) => {
  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: 'UTEShop - Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Use the OTP below to set a new password:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #dc3545; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you did not request this password reset, please ignore this email and make sure your account is secure.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">UTEShop E-commerce Platform</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
