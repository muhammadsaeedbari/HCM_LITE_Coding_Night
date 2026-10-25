

import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

const initialForm = {
  leaveType: 'annual',
  startDate: '',
  endDate: '',
  reason: ''
};

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canReview = ['admin', 'hr'].includes(user.role);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const requests = [API.get('/leaves')];
      if (canReview) requests.push(API.get('/organization/employees'));

      const results = await Promise.all(requests);
      setLeaves(results[0].data.leaves || []);
      if (canReview) setEmployees(results[1].data.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load leave records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submitLeave(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...form };
      if (canReview && employeeId) payload.employeeId = employeeId;
      await API.post('/leaves', payload);
      setForm(initialForm);
      setEmployeeId('');
      setNotice('Leave request submitted.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to submit leave request.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewLeave(id, status) {
    const reviewNote = window.prompt(`Optional note for ${status}:`) || '';
    setError('');
    setNotice('');
    try {
      await API.patch(`/leaves/${id}/review`, { status, reviewNote });
      setNotice(`Leave ${status}.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to review leave.');
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="mb-4">
        <h2 className="fw-bold">Leave Management</h2>
        <p className="text-secondary mb-0">Apply for leave and manage requests</p>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <form className="card border-0 shadow-sm mb-4" onSubmit={submitLeave}>
        <div className="card-body p-4">
          <h5 className="mb-3">Apply for Leave</h5>
          {canReview && (
            <div className="mb-3">
              <label htmlFor="leaveEmployee" className="form-label">Employee (optional)</label>
              <select id="leaveEmployee" className="form-select" value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Use my own profile if available</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} ({employee.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label htmlFor="leaveType" className="form-label">Leave Type</label>
              <select id="leaveType" className="form-select" value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                {['annual', 'sick', 'casual', 'unpaid'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="startDate" className="form-label">Start Date</label>
              <input id="startDate" type="date" className="form-control" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="endDate" className="form-label">End Date</label>
              <input id="endDate" type="date" className="form-control" value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="reason" className="form-label">Reason</label>
              <input id="reason" className="form-control" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                maxLength={1000} required />
            </div>
          </div>
          <button className="btn btn-primary mt-3" disabled={busy}>
            {busy ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">Leave Requests</div>
        {loading ? <Loading text="Loading leave requests..." /> : (
          <DataTable
            rows={leaves}
            columns={[
              { key: 'employeeId', label: 'Employee', render: (r) => r.employeeId?.firstName ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : r.employeeId?.employeeCode || '—' },
              { key: 'leaveType', label: 'Type' },
              { key: 'startDate', label: 'Start', render: (r) => new Date(r.startDate).toLocaleDateString() },
              { key: 'endDate', label: 'End', render: (r) => new Date(r.endDate).toLocaleDateString() },
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status', render: (r) => <span className={`badge ${r.status === 'approved' ? 'text-bg-success' : r.status === 'rejected' ? 'text-bg-danger' : 'text-bg-warning'}`}>{r.status}</span> },
              ...(canReview ? [{
                key: 'actions',
                label: 'Actions',
                render: (r) => r.status === 'pending' ? (
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-success" onClick={() => reviewLeave(r._id, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => reviewLeave(r._id, 'rejected')}>Reject</button>
                  </div>
                ) : '—'
              }] : [])
            ]}
          />
        )}
      </div>
    </main>
  );
}

