

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api.js';

export default function InitialSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await API.post('/setup/initial-admin', form);
      setSuccess(data.message || 'Setup completed successfully.');

      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Setup failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
      <div className="card border-0 shadow p-4 p-md-5" style={{ maxWidth: 520, width: '100%' }}>
        <h2 className="fw-bold text-primary text-center">HCM Lite</h2>
        <h4 className="text-center mt-3">Company Setup</h4>
        <p className="text-secondary text-center">
          Create your company and first administrator account.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'companyName', label: 'Company Name', type: 'text' },
            { name: 'name', label: 'Administrator Name', type: 'text' },
            { name: 'email', label: 'Administrator Email', type: 'email' },
            { name: 'password', label: 'Password (minimum 8 characters)', type: 'password' }
          ].map((field) => (
            <div className="mb-3" key={field.name}>
              <label className="form-label" htmlFor={field.name}>
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                className="form-control"
                value={form[field.name]}
                onChange={handleChange}
                minLength={field.name === 'password' ? 8 : undefined}
                maxLength={field.name === 'password' ? 72 : undefined}
                autoComplete={field.name === 'password' ? 'new-password' : 'off'}
                required
              />
            </div>
          ))}

          <button className="btn btn-primary w-100 btn-lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Admin Account'}
          </button>
        </form>

        <p className="text-center mt-3 mb-0">
          Already set up? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}


