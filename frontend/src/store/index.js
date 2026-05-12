import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import authReducer from './slices/authSlice.js'
import userReducer from './slices/userSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Ignore non-serializable values warning for localStorage
    })
})

// Export hooks for typed usage
export const useAppDispatch = () => useDispatch()
export const useAppSelector = useSelector
