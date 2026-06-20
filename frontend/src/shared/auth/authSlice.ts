import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types/auth';
import { storage } from './storage';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}

const initialState: AuthState = {
  accessToken: storage.getAccess(),
  refreshToken: storage.getRefresh(),
  user: storage.getUser(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; user: User }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      storage.set(action.payload.accessToken, action.payload.refreshToken, action.payload.user);
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      storage.setTokens(action.payload.accessToken, action.payload.refreshToken);
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      storage.clear();
    },
  },
});

export const { setCredentials, setTokens, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
