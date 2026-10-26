import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

const links = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'bi-speedometer2',
    roles: ['admin', 'hr', 'employee'],
  },
  {
    to: '/employees',
    label: 'Employees',
    icon: 'bi-people',
    roles: ['admin', 'hr'],
  },
  {
    to: '/departments',
    label: 'Departments',
    icon: 'bi-diagram-3',
    roles: ['admin', 'hr'],
  },
  {
    to: '/designations',
    label: 'Designations',
    icon: 'bi-person-badge',
    roles: ['admin', 'hr'],
  },
  {
    to: '/attendance',
    label: 'Attendance',
    icon: 'bi-calendar-check',
    roles: ['admin', 'hr', 'employee'],
  },
  {
    to: '/leaves',
    label: 'Leaves',
    icon: 'bi-calendar2-week',
    roles: ['admin', 'hr', 'employee'],
  },
  {
    to: '/payroll',
    label: 'Payslips',
    icon: 'bi-cash-stack',
    roles: ['admin', 'hr', 'employee'],
  },
  {
    to: '/announcements',
    label: 'Announcements',
    icon: 'bi-megaphone',
    roles: ['admin', 'hr', 'employee'],
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'bi-gear',
    roles: ['admin', 'hr'],
  },
  {
    to: '/profile',
    label: 'Password & Profile',
    icon: 'bi-person-lock',
    roles: ['admin', 'hr', 'employee'],
  },
];

export default function Sidebar() {
  const reduxUser = useSelector((state) => state.auth.user);
  const user =
    reduxUser || JSON.parse(localStorage.getItem('hcm_user') || '{}');

  return (
    <aside
      className="bg-white border-end p-3 no-print"
      style={{ minWidth: 230 }}
    >
      <div className="fw-bold text-primary fs-5 mb-4">HCM Lite</div>
      <div className="small text-secondary mb-2">WORKSPACE</div>
      <nav className="nav nav-pills flex-wrap flex-md-column gap-1">
        {links
          .filter((link) => link.roles.includes(user.role || 'employee'))
          .map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : 'text-dark'}`
              }
            >
              <i className={`bi ${link.icon} me-2`} />
              {link.label}
            </NavLink>
          ))}
      </nav>
      <hr className="d-none d-md-block" />
      <div className="d-none d-md-block">
        <div className="small text-secondary">Signed in as</div>
        <div className="fw-semibold text-break">{user.name || 'User'}</div>
        <span className="badge text-bg-secondary mt-1 text-uppercase">
          {user.role || 'employee'}
        </span>
      </div>
    </aside>
  );
}
