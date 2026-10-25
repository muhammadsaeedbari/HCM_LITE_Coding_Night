
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2', roles: ['admin', 'hr', 'employee'] },
  { to: '/employees', label: 'Employees', icon: 'bi-people', roles: ['admin', 'hr', 'employee'] },
  { to: '/departments', label: 'Departments', icon: 'bi-diagram-3', roles: ['admin', 'hr', 'employee'] },
  { to: '/designations', label: 'Designations', icon: 'bi-person-badge', roles: ['admin', 'hr', 'employee'] },
  { to: '/attendance', label: 'Attendance', icon: 'bi-calendar-check', roles: ['admin', 'hr', 'employee'] },
  { to: '/leaves', label: 'Leaves', icon: 'bi-calendar2-week', roles: ['admin', 'hr', 'employee'] },
  { to: '/payroll', label: 'Payroll', icon: 'bi-cash-stack', roles: ['admin', 'hr', 'employee'] }
];

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');

  return (
    <aside className="bg-white border-end h-100 p-3">
      <div className="fw-bold text-primary fs-5 mb-4">HCM Lite</div>
      <div className="small text-secondary mb-2">WORKSPACE</div>
      <nav className="nav nav-pills flex-column gap-1">
        {links.filter(link => link.roles.includes(user.role)).map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : 'text-dark'}`}>
            <i className={`bi ${link.icon} me-2`} />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <hr />
      <div className="small text-secondary">Signed in as</div>
      <div className="fw-semibold text-break">{user.name || 'User'}</div>
      <span className="badge text-bg-secondary mt-1">{user.role || 'unknown'}</span>
    </aside>
  );
}
