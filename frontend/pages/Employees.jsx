import { useEffect, useMemo, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

const emptyForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  departmentId: '',
  designationId: '',
  dateOfJoining: '',
  employmentType: 'full-time',
  basicSalary: '',
  status: 'active',
  address: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canManage = ['admin', 'hr'].includes(user.role);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [employeeRes, departmentRes, designationRes] = await Promise.all([
        API.get('/organization/employees'),
        API.get('/organization/departments'),
        API.get('/organization/designations'),
      ]);
      setEmployees(
        employeeRes.data.employees || employeeRes.data.data || []
      );
      setDepartments(
        departmentRes.data.departments || departmentRes.data.data || []
      );
      setDesignations(
        designationRes.data.designations || designationRes.data.data || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load employees.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const availableDesignations = designations.filter(
    (item) =>
      String(item.departmentId?._id || item.departmentId) === form.departmentId
  );

  function validateForm() {
    const errs = {};
    if (!form.employeeCode.trim()) errs.employeeCode = 'Employee code is required.';
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';

    const emailTrimmed = form.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      errs.email = 'Valid email is required.';
    } else {
      const emailTaken = employees.some(
        (emp) =>
          emp.email?.toLowerCase() === emailTrimmed && emp._id !== editingId
      );
      if (emailTaken) {
        errs.email = 'Email is already used by another employee.';
      }
    }

    if (!editingId && form.password && form.password.trim().length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!form.departmentId) errs.departmentId = 'Select a department.';
    if (!form.designationId) errs.designationId = 'Select a designation.';
    if (!form.dateOfJoining) errs.dateOfJoining = 'Joining date is required.';

    const sal = Number(form.basicSalary);
    if (!form.basicSalary || !Number.isFinite(sal) || sal <= 0) {
      errs.basicSalary = 'Salary must be greater than 0.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        ...form,
        basicSalary: Number(form.basicSalary),
      };
      if (!payload.password?.trim()) {
        delete payload.password;
      }

      if (editingId) {
        await API.patch(`/organization/employees/${editingId}`, payload);
        setNotice('Employee updated successfully.');
      } else {
        const { data } = await API.post('/organization/employees', payload);
        setNotice(
          data.message ||
            'Employee and login account created (default password: Employee@123 if left blank).'
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      setFieldErrors({});
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to save employee.'
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(emp) {
    setEditingId(emp._id);
    setFieldErrors({});
    setForm({
      employeeCode: emp.employeeCode || '',
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      password: '',
      phone: emp.phone || '',
      departmentId: String(emp.departmentId?._id || emp.departmentId || ''),
      designationId: String(emp.designationId?._id || emp.designationId || ''),
      dateOfJoining: emp.dateOfJoining
        ? new Date(emp.dateOfJoining).toISOString().slice(0, 10)
        : '',
      employmentType: emp.employmentType || 'full-time',
      basicSalary: emp.basicSalary ?? '',
      status: emp.status || 'active',
      address: emp.address || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(emp) {
    if (
      !window.confirm(
        `Delete employee ${emp.firstName} ${emp.lastName} (${emp.email}) and their login account?`
      )
    ) {
      return;
    }
    setError('');
    setNotice('');
    try {
      await API.delete(`/organization/employees/${emp._id}`);
      setNotice('Employee deleted.');
      if (editingId === emp._id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to delete employee.'
      );
    }
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.employeeCode || '').toLowerCase().includes(q);

      const empDeptId = String(emp.departmentId?._id || emp.departmentId || '');
      const matchesDept = !deptFilter || empDeptId === deptFilter;

      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, deptFilter]);

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Employees</h2>
          <p className="text-secondary mb-0">
            Add employees (automatically creates their login), edit, delete, search &amp; filter
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={loadData}>
          Refresh
        </button>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold py-3 d-flex justify-content-between align-items-center">
            <span>{editingId ? 'Edit Employee' : 'Add Employee (Creates Login)'}</span>
            {editingId && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setFieldErrors({});
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                {[
                  ['employeeCode', 'Employee Code *', 'text', 'EMP-001'],
                  ['firstName', 'First Name *', 'text', 'Ali'],
                  ['lastName', 'Last Name *', 'text', 'Khan'],
                  ['email', 'Login Email *', 'email', 'ali@company.com'],
                  [
                    'password',
                    editingId
                      ? 'New Password (optional)'
                      : 'Login Password (default: Employee@123)',
                    'password',
                    'Minimum 6 chars',
                  ],
                  ['phone', 'Phone', 'tel', '+92...'],
                  ['dateOfJoining', 'Date of Joining *', 'date', ''],
                  ['basicSalary', 'Monthly Salary (> 0) *', 'number', '50000'],
                  ['address', 'Address', 'text', 'City, Country'],
                ].map(([name, label, type, placeholder]) => (
                  <div className="col-12 col-md-6 col-lg-4" key={name}>
                    <label className="form-label" htmlFor={name}>
                      {label}
                    </label>
                    <input
                      id={name}
                      name={name}
                      type={type}
                      placeholder={placeholder}
                      className={`form-control ${
                        fieldErrors[name] ? 'is-invalid' : ''
                      }`}
                      value={form[name]}
                      onChange={(e) => {
                        setForm({ ...form, [name]: e.target.value });
                        if (fieldErrors[name]) {
                          setFieldErrors({ ...fieldErrors, [name]: '' });
                        }
                      }}
                      min={type === 'number' ? '1' : undefined}
                    />
                    {fieldErrors[name] && (
                      <div className="invalid-feedback">{fieldErrors[name]}</div>
                    )}
                  </div>
                ))}

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="departmentId">
                    Department *
                  </label>
                  <select
                    id="departmentId"
                    className={`form-select ${
                      fieldErrors.departmentId ? 'is-invalid' : ''
                    }`}
                    value={form.departmentId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        departmentId: e.target.value,
                        designationId: '',
                      })
                    }
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.departmentId && (
                    <div className="invalid-feedback">
                      {fieldErrors.departmentId}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="designationId">
                    Designation *
                  </label>
                  <select
                    id="designationId"
                    className={`form-select ${
                      fieldErrors.designationId ? 'is-invalid' : ''
                    }`}
                    value={form.designationId}
                    onChange={(e) =>
                      setForm({ ...form, designationId: e.target.value })
                    }
                  >
                    <option value="">Select designation</option>
                    {availableDesignations.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.designationId && (
                    <div className="invalid-feedback">
                      {fieldErrors.designationId}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-6 col-lg-2">
                  <label className="form-label" htmlFor="employmentType">
                    Employment Type
                  </label>
                  <select
                    id="employmentType"
                    className="form-select"
                    value={form.employmentType}
                    onChange={(e) =>
                      setForm({ ...form, employmentType: e.target.value })
                    }
                  >
                    {['full-time', 'part-time', 'contract', 'intern'].map(
                      (type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {editingId && (
                  <div className="col-12 col-md-6 col-lg-2">
                    <label className="form-label" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      className="form-select"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      {['active', 'inactive', 'terminated'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button className="btn btn-primary mt-3" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : editingId
                  ? 'Update Employee'
                  : 'Create Employee & Login'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search and Department Filter */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <input
                type="search"
                className="form-control"
                placeholder="Search by employee name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2 text-md-end">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('');
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">
          Employee Records ({filteredEmployees.length})
        </div>
        {loading ? (
          <Loading text="Loading employees..." />
        ) : (
          <DataTable
            rows={filteredEmployees}
            columns={[
              { key: 'employeeCode', label: 'Code' },
              {
                key: 'firstName',
                label: 'Name',
                render: (r) => `${r.firstName} ${r.lastName}`,
              },
              { key: 'email', label: 'Login Email' },
              {
                key: 'departmentId',
                label: 'Department',
                render: (r) => r.departmentId?.name || '—',
              },
              {
                key: 'designationId',
                label: 'Designation',
                render: (r) => r.designationId?.title || '—',
              },
              {
                key: 'basicSalary',
                label: 'Salary',
                render: (r) =>
                  r.basicSalary !== undefined
                    ? Number(r.basicSalary).toLocaleString()
                    : '—',
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <span
                    className={`badge ${
                      r.status === 'active'
                        ? 'text-bg-success'
                        : 'text-bg-secondary'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
              ...(canManage
                ? [
                    {
                      key: 'actions',
                      label: 'Actions',
                      render: (r) => (
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEdit(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(r)}
                          >
                            Delete
                          </button>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>
    </main>
  );
}
