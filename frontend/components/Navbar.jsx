
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice.js';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <nav className="navbar bg-white border-bottom px-3 px-md-4 py-3">
      <span className="navbar-brand fw-bold mb-0">HR Management</span>
      <div className="ms-auto d-flex align-items-center gap-3">
        <span className="text-secondary small d-none d-sm-inline">
          {user?.name} · {user?.role}
        </span>
        <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-1" />
          Logout
        </button>
      </div>
    </nav>
  );
}
