import { createSelector } from '@reduxjs/toolkit'

// Auth selectors
export const selectAuthState = (state) => state.auth

export const selectToken = createSelector(selectAuthState, (auth) => auth.token)

export const selectUser = createSelector(selectAuthState, (auth) => auth.user)

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (auth) => auth.isAuthenticated
)

export const selectAuthLoading = createSelector(selectAuthState, (auth) => auth.isLoading)

export const selectAuthError = createSelector(selectAuthState, (auth) => auth.error)

// User selectors
export const selectUserState = (state) => state.user

export const selectProfile = createSelector(selectUserState, (user) => user.profile)

export const selectUserLoading = createSelector(selectUserState, (user) => user.isLoading)

export const selectUserError = createSelector(selectUserState, (user) => user.error)
