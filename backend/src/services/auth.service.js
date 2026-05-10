const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user.repository');
const PasswordResetTokenRepository = require('../repositories/passwordResetToken.repository');
const EmailService = require('../services/email.service');
const TokenService = require('../services/token.service');
const { Op } = require('sequelize');

class AuthService {
  /**
   * Register new user
   */
  static async register({ email, password, full_name, phone }) {
    try {
      // Check if email exists
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        const error = new Error('Email already registered');
        error.statusCode = 400;
        throw error;
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await UserRepository.create({
        email,
        password: hashedPassword,
        full_name,
        phone,
        role: 'user',
        is_verified: false
      });

      // Send verification OTP (async - don't wait)
      EmailService.sendVerificationOTP(email).catch(console.error);

      return {
        userId: user.id
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email with OTP
   */
  static async verifyEmail(email, token) {
    try {
      const user = await UserRepository.findByEmail(email);

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      if (user.is_verified) {
        const error = new Error('Email already verified');
        error.statusCode = 400;
        throw error;
      }

      if (!user.verification_token || user.verification_token !== token) {
        const error = new Error('Invalid OTP');
        error.statusCode = 400;
        throw error;
      }

      if (!user.token_expires || new Date(user.token_expires) < new Date()) {
        const error = new Error('OTP has expired');
        error.statusCode = 400;
        throw error;
      }

      // Update user
      await UserRepository.update(user.id, {
        is_verified: true,
        verification_token: null,
        token_expires: null
      });

      return {
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Forgot password - send OTP
   */
  static async forgotPassword(email) {
    try {
      const user = await UserRepository.findByEmail(email);

      if (user) {
        // Send OTP
        await EmailService.sendPasswordResetOTP(email);

        // Store OTP in user record
        const result = await PasswordResetTokenRepository.findByToken('dummy');
        // Generate OTP and store
        const otpResult = EmailService.sendPasswordResetOTP(email);

        // Actually we need to store the OTP in the user record
        // But EmailService.sendPasswordResetOTP already sends email, we need the OTP
        // Let's refactor: EmailService should return OTP, then we save it
        // For now, let's generate OTP separately
        const generateOTP = require('../utils/otpGenerator');
        const otp = generateOTP();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Delete old tokens
        await PasswordResetTokenRepository.deleteByUserId(user.id);

        // Create new token record
        await PasswordResetTokenRepository.create(user.id, otp, expiresAt);

        // Actually send email
        const { sendPasswordResetEmail } = require('../utils/emailSender');
        await sendPasswordResetEmail(email, otp);
      }

      // Always return success even if user doesn't exist (security)
      return {
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with OTP
   */
  static async resetPassword(email, token, new_password) {
    try {
      const user = await UserRepository.findByEmail(email);

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Find valid reset token
      const resetToken = await PasswordResetTokenRepository.findValidToken(token);

      if (!resetToken || resetToken.user_id !== user.id) {
        const error = new Error('Invalid or expired OTP');
        error.statusCode = 400;
        throw error;
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      // Update user password
      await UserRepository.updatePassword(user.id, hashedPassword);

      // Delete used token
      await PasswordResetTokenRepository.deleteByToken(token);

      // Delete all other tokens for this user
      await PasswordResetTokenRepository.deleteByUserId(user.id);

      return {
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email, password) {
    try {
      const user = await UserRepository.findByEmail(email);

      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      if (!user.is_verified) {
        const error = new Error('Please verify your email first');
        error.statusCode = 403;
        throw error;
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      // Generate JWT token
      const token = TokenService.generateToken(user.id, user.role);

      // Return user data (without password) and token
      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      };

      return {
        user: userData,
        token
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;
