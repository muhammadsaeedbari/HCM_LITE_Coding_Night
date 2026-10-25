
import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Payroll() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employeeId: '',
    period: new Date().toISOString().slice(0, 7),
    allowances: 0,
    deductions: 0
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canManage = ['admin', 'hr'].includes(user.role);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const requests = [API.get('/payroll')];
      if (canManage) requests.push(API.get('/organization/employees'));
      const result = await Promise.all(requests);
      setRows(result[0].data.payrolls || []);
      if (canManage) setEmployees(result[1].data.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load payroll.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function createPayroll(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await API.post('/payroll', {
        ...form,
        allowances: Number(form.allowances),
        deductions: Number(form.deductions)
      });
      setNotice('Payroll record created.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create payroll.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id, status) {
    setError('');
    try {
      await API.patch(`/payroll/${id}/status`, { status });
      setNotice(`Payroll marked ${status}.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update payroll.');
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <h2 className="fw-bold">Payroll</h2>
      <p className="text-secondary">Payroll records and payment status</p>
      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && <form className="card border-0 shadow-sm p-3 mb-4" onSubmit={createPayroll}>
        <h5>Create Payroll</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Employee</label>
            <select className="form-select" required value={form.employeeId}
              onChange={e => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>)}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Period</label>
            <input type="month" className="form-control" required value={form.period}
              onChange={e => setForm({ ...form, period: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Allowances</label>
            <input type="number" min="0" className="form-control" value={form.allowances}
              onChange={e => setForm({ ...form, allowances: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Deductions</label>
            <input type="number" min="0" className="form-control" value={form.deductions}
              onChange={e => setForm({ ...form, deductions: e.target.value })} />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-primary w-100" disabled={busy}>
              {busy ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      </form>}

      <div className="card border-0 shadow-sm">
        {loading ? <Loading /> : <DataTable rows={rows} columns={[
          { key: 'employeeId', label: 'Employee', render: r => r.employeeId?.firstName ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : r.employeeId?.employeeCode || '—' },
          { key: 'period', label: 'Period' },
          { key: 'basicSalary', label: 'Basic', render: r => Number(r.basicSalary).toLocaleString() },
          { key: 'grossSalary', label: 'Gross', render: r => Number(r.grossSalary).toLocaleString() },
          { key: 'netSalary', label: 'Net', render: r => Number(r.netSalary).toLocaleString() },
          { key: 'status', label: 'Status' },
          ...(canManage ? [{ key: 'actions', label: 'Actions', render: r =>
            r.status === 'draft'
              ? <button className="btn btn-sm btn-primary" onClick={() => updateStatus(r._id, 'approved')}>Approve</button>
              : r.status === 'approved'
                ? <button className="btn btn-sm btn-success" onClick={() => updateStatus(r._id, 'paid')}>Mark Paid</button>
                : '—'
          }] : [])
        ]} />}
      </div>
    </main>
  );
}
