import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice.js';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <nav className="navbar bg-white border-bottom px-3 px-md-4 py-3 no-print">
      <Link to="/dashboard" className="navbar-brand fw-bold mb-0 text-primary">
        HCM Lite
      </Link>
      <div className="ms-auto d-flex align-items-center gap-3">
        <Link
          to="/profile"
          className="text-secondary small text-decoration-none d-none d-sm-inline"
        >
          <i className="bi bi-person-circle me-1" />
          {user?.name} · <span className="text-uppercase">{user?.role}</span>
        </Link>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right me-1" />
          Logout
        </button>
      </div>
    </nav>
  );
}
