const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailSender');
const generateOTP = require('../utils/otpGenerator');

class EmailService {
  /**
   * Send email verification OTP
   */
  static async sendVerificationOTP(email) {
    try {
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes

      await sendVerificationEmail(email, otp);

      return {
        otp,
        expiresAt
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send password reset OTP
   */
  static async sendPasswordResetOTP(email) {
    try {
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes

      await sendPasswordResetEmail(email, otp);

      return {
        otp,
        expiresAt
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = EmailService;
