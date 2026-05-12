import api from './api'

export const adminService = {
  // Get admin profile
  getProfile() {
    return api.get('/admin/profile')
  }
}
