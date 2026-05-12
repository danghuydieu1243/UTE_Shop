import api from './api'

export const userService = {
  // Get user profile
  getProfile() {
    return api.get('/user/profile')
  },

  // Update user profile
  updateProfile(data) {
    return api.put('/user/profile', data)
  }
}
