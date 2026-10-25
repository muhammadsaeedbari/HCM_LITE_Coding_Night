

import { createSlice } from '@reduxjs/toolkit';

const savedUser = (() => {
  try {
    const user = localStorage.getItem('hcm_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
})();

const initialState = {
  user: savedUser,
  token: localStorage.getItem('hcm_token') || null,
  isAuthenticated: Boolean(localStorage.getItem('hcm_token') && savedUser),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    loginSuccess: (state, action) => {
      const { user, token } = action.payload;

      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;

      localStorage.setItem('hcm_user', JSON.stringify(user));
      localStorage.setItem('hcm_token', token);
    },

    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Login failed.';
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;

      localStorage.removeItem('hcm_user');
      localStorage.removeItem('hcm_token');
    },

    clearAuthError: (state) => {
      state.error = null;
    },

    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };

      localStorage.setItem('hcm_user', JSON.stringify(state.user));
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearAuthError,
  updateUser
} = authSlice.actions;

export default authSlice.reducer;


