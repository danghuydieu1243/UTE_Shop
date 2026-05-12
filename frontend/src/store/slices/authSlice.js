import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/authService'
import { storage } from '../../utils/storage'

// Initialize auth state from localStorage
const initializeAuth = () => {
  const token = storage.getToken()
  const user = storage.getUser()
  return {
    token,
    user,
    isAuthenticated: !!token && !!user
  }
}

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      const { token, user } = response.data.data

      // Persist to localStorage
      storage.setToken(token)
      storage.setUser(user)

      return { token, user }
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Đăng nhập thất bại',
        statusCode: error.statusCode || 500
      })
    }
  }
)

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData)
      const { user } = response.data.data

      // Store user info but no token yet (email verification required)
      storage.setUser(user)

      return { user }
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Đăng ký thất bại',
        statusCode: error.statusCode || 500,
        errors: error.errors
      })
    }
  }
)

export const verifyEmailAsync = createAsyncThunk(
  'auth/verify-email',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail(data)
      return response.data.data
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Xác thực email thất bại',
        statusCode: error.statusCode || 500
      })
    }
  }
)

export const forgotPasswordAsync = createAsyncThunk(
  'auth/forgot-password',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authService.forgotPassword(email)
      return response.data.data
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Yêu cầu đặt lại mật khẩu thất bại',
        statusCode: error.statusCode || 500
      })
    }
  }
)

export const resetPasswordAsync = createAsyncThunk(
  'auth/reset-password',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(data)
      return response.data.data
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Đặt lại mật khẩu thất bại',
        statusCode: error.statusCode || 500
      })
    }
  }
)

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  ...initializeAuth() // Load from localStorage on init
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      state.isAuthenticated = false
      state.error = null
      storage.clearAuthData()
    },
    clearError(state) {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Đăng nhập thất bại'
        storage.clearAuthData()
      })

    // Register
    builder
      .addCase(registerAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.isAuthenticated = false // Not authenticated until email verified
        state.error = null
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Đăng ký thất bại'
      })

    // Verify Email
    builder
      .addCase(verifyEmailAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyEmailAsync.fulfilled, (state) => {
        state.isLoading = false
        if (state.user) {
          state.user.is_verified = true
        }
        storage.clearAuthData() // Force re-login after verification
        state.isAuthenticated = false
      })
      .addCase(verifyEmailAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Xác thực email thất bại'
      })

    // Forgot Password
    builder
      .addCase(forgotPasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forgotPasswordAsync.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(forgotPasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Yêu cầu đặt lại mật khẩu thất bại'
      })

    // Reset Password
    builder
      .addCase(resetPasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPasswordAsync.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(resetPasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Đặt lại mật khẩu thất bại'
      })
  }
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
