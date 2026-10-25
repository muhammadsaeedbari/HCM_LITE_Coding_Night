

import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

const emptyForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  departmentId: '',
  designationId: '',
  dateOfJoining: '',
  employmentType: 'full-time',
  basicSalary: '',
  address: ''
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [form, setForm] = useState(emptyForm);
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
        API.get('/organization/designations')
      ]);
      setEmployees(employeeRes.data.employees || []);
      setDepartments(departmentRes.data.departments || []);
      setDesignations(designationRes.data.designations || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load employees.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const availableDesignations = designations.filter(
    (item) => String(item.departmentId?._id || item.departmentId) === form.departmentId
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      await API.post('/organization/employees', {
        ...form,
        basicSalary: Number(form.basicSalary)
      });
      setForm(emptyForm);
      setNotice('Employee created successfully.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create employee.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Employees</h2>
          <p className="text-secondary mb-0">Employee directory and records</p>
        </div>
        <button className="btn btn-outline-primary" onClick={loadData}>Refresh</button>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-semibold py-3">Add Employee</div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {[
                  ['employeeCode', 'Employee Code', 'text'],
                  ['firstName', 'First Name', 'text'],
                  ['lastName', 'Last Name', 'text'],
                  ['email', 'Email', 'email'],
                  ['phone', 'Phone', 'tel'],
                  ['dateOfJoining', 'Date of Joining', 'date'],
                  ['basicSalary', 'Basic Salary', 'number'],
                  ['address', 'Address', 'text']
                ].map(([name, label, type]) => (
                  <div className="col-12 col-md-6 col-lg-4" key={name}>
                    <label className="form-label" htmlFor={name}>{label}</label>
                    <input
                      id={name}
                      name={name}
                      type={type}
                      className="form-control"
                      value={form[name]}
                      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                      min={type === 'number' ? '0' : undefined}
                      required={!['phone', 'address'].includes(name)}
                    />
                  </div>
                ))}

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="departmentId">Department</label>
                  <select
                    id="departmentId"
                    className="form-select"
                    value={form.departmentId}
                    onChange={(e) => setForm({
                      ...form,
                      departmentId: e.target.value,
                      designationId: ''
                    })}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="designationId">Designation</label>
                  <select
                    id="designationId"
                    className="form-select"
                    value={form.designationId}
                    onChange={(e) => setForm({ ...form, designationId: e.target.value })}
                    required
                  >
                    <option value="">Select designation</option>
                    {availableDesignations.map((d) => (
                      <option key={d._id} value={d._id}>{d.title}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="employmentType">Employment Type</label>
                  <select
                    id="employmentType"
                    className="form-select"
                    value={form.employmentType}
                    onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                  >
                    {['full-time', 'part-time', 'contract', 'intern'].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="btn btn-primary mt-3" disabled={saving}>
                {saving ? 'Saving...' : 'Create Employee'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">
          Employee Records ({employees.length})
        </div>
        {loading ? <Loading text="Loading employees..." /> : (
          <DataTable
            rows={employees}
            columns={[
              { key: 'employeeCode', label: 'Code' },
              { key: 'firstName', label: 'Name', render: (r) => `${r.firstName} ${r.lastName}` },
              { key: 'email', label: 'Email' },
              { key: 'departmentId', label: 'Department', render: (r) => r.departmentId?.name || '—' },
              { key: 'designationId', label: 'Designation', render: (r) => r.designationId?.title || '—' },
              { key: 'status', label: 'Status', render: (r) => <span className="badge text-bg-success">{r.status}</span> }
            ]}
          />
        )}
      </div>
    </main>
  );
}

