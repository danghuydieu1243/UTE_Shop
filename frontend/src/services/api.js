import axios from 'axios'
import { storage } from '../utils/storage'

// Get base URL from environment
const baseURL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1`

// Create axios instance
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = storage.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, message } = error

    // Network error (no response from server)
    if (!response) {
      console.error('Network error:', message)
      return Promise.reject({
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
        statusCode: 0
      })
    }

    // Unauthorized (401) or Forbidden (403) - token issues
    if (response.status === 401 || response.status === 403) {
      storage.clearAuthData()
      window.location.href = '/login?session=expired'
      return Promise.reject(response.data || {
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        statusCode: response.status
      })
    }

    // Other errors - pass through backend error format
    if (response.data) {
      return Promise.reject(response.data)
    }

    return Promise.reject({
      success: false,
      message: `Lỗi server: ${response.status}`,
      statusCode: response.status
    })
  }
)

export default api
