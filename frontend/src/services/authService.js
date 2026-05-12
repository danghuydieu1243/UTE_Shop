import api from './api'

export const authService = {
  // Register new user
  register(data) {
    return api.post('/auth/register', data)
  },

  // Verify email with OTP
  verifyEmail(data) {
    return api.post('/auth/verify-email', data)
  },

  // Request password reset OTP
  forgotPassword(email) {
    return api.post('/auth/forgot-password', { email })
  },

  // Reset password with OTP
  resetPassword(data) {
    return api.post('/auth/reset-password', data)
  },

  // Login user
  login(credentials) {
    return api.post('/auth/login', credentials)
  }
}
