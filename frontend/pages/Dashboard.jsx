
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const modules = [
  { title: 'Employees', description: 'Manage employee records.', path: '/employees', icon: 'bi-people' },
  { title: 'Departments', description: 'Organize company departments.', path: '/departments', icon: 'bi-diagram-3' },
  { title: 'Designations', description: 'Manage job titles and roles.', path: '/designations', icon: 'bi-person-badge' },
  { title: 'Attendance', description: 'Track check-ins and check-outs.', path: '/attendance', icon: 'bi-calendar-check' },
  { title: 'Leaves', description: 'Submit and review leave requests.', path: '/leaves', icon: 'bi-calendar2-week' },
  { title: 'Payroll', description: 'Manage payroll records and payments.', path: '/payroll', icon: 'bi-wallet2' }
];

function Dashboard() {
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Dashboard</h2>
        <p className="text-secondary mb-0">
          Welcome{user?.name ? `, ${user.name}` : ''}. Manage your HR activities.
        </p>
      </div>

      <div className="row g-3">
        {modules.map((module) => (
          <div className="col-12 col-sm-6 col-xl-4" key={module.path}>
            <Link to={module.path} className="module-link">
              <div className="card module-card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="module-icon mb-3">
                    <i className={`bi ${module.icon}`} aria-hidden="true"></i>
                  </div>
                  <h5 className="fw-semibold">{module.title}</h5>
                  <p className="text-secondary mb-3">{module.description}</p>
                  <span className="text-primary fw-semibold">
                    Open module <i className="bi bi-arrow-right"></i>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
