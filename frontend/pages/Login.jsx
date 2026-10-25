

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api.js';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  clearAuthError
} from '../store/authSlice.js';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    dispatch(clearAuthError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());

    try {
      const { data } = await API.post('/auth/login', {
        email: form.email.trim(),
        password: form.password
      });

      dispatch(loginSuccess({
        user: data.user,
        token: data.token
      }));

      navigate('/dashboard', { replace: true });
    } catch (err) {
      dispatch(loginFailure(
        err.response?.data?.message || err.message || 'Login failed.'
      ));
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
      <div className="card border-0 shadow p-4 p-md-5" style={{ maxWidth: 440, width: '100%' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">HCM Lite</h2>
          <p className="text-secondary">Human Capital Management</p>
          <h4 className="mt-4">Welcome Back</h4>
          <p className="text-secondary">Sign in to your account</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-control form-control-lg"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control form-control-lg"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="btn btn-primary btn-lg w-100" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/setup" className="small text-decoration-none">
            First time? Set up your company
          </Link>
        </div>
      </div>
    </div>
  );
}


