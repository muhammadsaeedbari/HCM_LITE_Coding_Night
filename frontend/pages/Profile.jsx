import { useState } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Profile() {
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await API.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setNotice(data.message || 'Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to change password.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="mb-4">
        <h2 className="fw-bold">My Profile &amp; Security</h2>
        <p className="text-secondary mb-0">
          View your account details and change your login password
        </p>
      </div>

      <ErrorMessage message={error} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="row g-4">
        <div className="col-12 col-md-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold py-3">
              Account Details
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="text-secondary small">Full Name</div>
                <div className="fw-semibold fs-5">{user?.name || '—'}</div>
              </div>
              <div className="mb-3">
                <div className="text-secondary small">Email Address</div>
                <div className="fw-semibold">{user?.email || '—'}</div>
              </div>
              <div className="mb-0">
                <div className="text-secondary small">Role</div>
                <span className="badge text-bg-primary text-uppercase">
                  {user?.role || 'employee'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold py-3">
              Change Password
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="form-control"
                    value={form.currentPassword}
                    onChange={(e) =>
                      setForm({ ...form, currentPassword: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="newPassword">
                    New Password (min 6 characters)
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="form-control"
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm({ ...form, newPassword: e.target.value })
                    }
                    minLength={6}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-control"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    minLength={6}
                    required
                  />
                </div>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
