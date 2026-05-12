import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { userService } from '../../services/userService'

export const getProfileAsync = createAsyncThunk(
  'user/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getProfile()
      return response.data.data
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Lấy thông tin người dùng thất bại',
        statusCode: error.statusCode || 500
      })
    }
  }
)

export const updateProfileAsync = createAsyncThunk(
  'user/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      const response = await userService.updateProfile(data)
      return response.data.data
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Cập nhật thông tin thất bại',
        statusCode: error.statusCode || 500,
        errors: error.errors
      })
    }
  }
)

const initialState = {
  profile: null,
  isLoading: false,
  error: null
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearProfile(state) {
      state.profile = null
      state.error = null
    },
    clearError(state) {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Get Profile
    builder
      .addCase(getProfileAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(getProfileAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.profile = action.payload.user || action.payload
        state.error = null
      })
      .addCase(getProfileAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Lấy thông tin người dùng thất bại'
      })

    // Update Profile
    builder
      .addCase(updateProfileAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfileAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.profile = action.payload.user || action.payload
        state.error = null
      })
      .addCase(updateProfileAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload?.message || 'Cập nhật thông tin thất bại'
      })
  }
})

export const { clearProfile, clearError } = userSlice.actions
export default userSlice.reducer
