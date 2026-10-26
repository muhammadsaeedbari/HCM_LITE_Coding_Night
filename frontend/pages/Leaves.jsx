import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

const initialForm = {
  leaveType: 'annual',
  startDate: '',
  endDate: '',
  reason: '',
};

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState({
    quota: 20,
    usedDays: 0,
    pendingDays: 0,
    remainingDays: 20,
  });
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
      const resData = results[0].data;
      setLeaves(resData.leaves || resData.data || []);
      setBalance({
        quota: resData.quota ?? 20,
        usedDays: resData.usedDays ?? 0,
        pendingDays: resData.pendingDays ?? 0,
        remainingDays: resData.remainingDays ?? 20,
      });
      if (canReview) {
        setEmployees(
          results[1].data.employees || results[1].data.data || []
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load leave records.'
      );
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
      const { data } = await API.post('/leaves', payload);
      setForm(initialForm);
      setEmployeeId('');
      setNotice(data.message || 'Leave request submitted.');
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to submit leave request.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function reviewLeave(id, status) {
    const reviewNote =
      window.prompt(`Add comment for ${status} leave request:`) || '';
    setError('');
    setNotice('');
    try {
      await API.patch(`/leaves/${id}/review`, { status, reviewNote });
      setNotice(`Leave ${status}.`);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to review leave.'
      );
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Leave Management</h2>
          <p className="text-secondary mb-0">
            Apply for leave (weekends skipped automatically, checked against yearly quota) &amp; review requests
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={loadData}>
          Refresh
        </button>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {!canReview && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="small text-secondary">Yearly Quota</div>
                <div className="fs-3 fw-bold text-primary">
                  {balance.quota} days
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="small text-secondary">Approved Used</div>
                <div className="fs-3 fw-bold text-danger">
                  {balance.usedDays} days
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="small text-secondary">Pending Approval</div>
                <div className="fs-3 fw-bold text-warning">
                  {balance.pendingDays} days
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="small text-secondary">Remaining Balance</div>
                <div className="fs-3 fw-bold text-success">
                  {balance.remainingDays} days
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form className="card border-0 shadow-sm mb-4" onSubmit={submitLeave}>
        <div className="card-body p-4">
          <h5 className="mb-3">Apply for Leave</h5>
          {canReview && (
            <div className="mb-3">
              <label htmlFor="leaveEmployee" className="form-label">
                Select Employee *
              </label>
              <select
                id="leaveEmployee"
                className="form-select"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} (
                    {employee.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label htmlFor="leaveType" className="form-label">
                Leave Type
              </label>
              <select
                id="leaveType"
                className="form-select"
                value={form.leaveType}
                onChange={(e) =>
                  setForm({ ...form, leaveType: e.target.value })
                }
              >
                {['annual', 'sick', 'casual', 'unpaid'].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="startDate" className="form-label">
                From Date
              </label>
              <input
                id="startDate"
                type="date"
                className="form-control"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                required
              />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="endDate" className="form-label">
                To Date
              </label>
              <input
                id="endDate"
                type="date"
                className="form-control"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
            <div className="col-12 col-md-3">
              <label htmlFor="reason" className="form-label">
                Reason
              </label>
              <input
                id="reason"
                className="form-control"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                maxLength={1000}
                required
              />
            </div>
          </div>
          <button className="btn btn-primary mt-3" disabled={busy}>
            {busy ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </div>
      </form>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">
          Leave Requests ({leaves.length})
        </div>
        {loading ? (
          <Loading text="Loading leave requests..." />
        ) : (
          <DataTable
            rows={leaves}
            columns={[
              {
                key: 'employeeId',
                label: 'Employee',
                render: (r) =>
                  r.employeeId?.firstName
                    ? `${r.employeeId.firstName} ${r.employeeId.lastName}`
                    : r.employeeId?.employeeCode || '—',
              },
              { key: 'leaveType', label: 'Type' },
              {
                key: 'startDate',
                label: 'From',
                render: (r) => new Date(r.startDate).toLocaleDateString(),
              },
              {
                key: 'endDate',
                label: 'To',
                render: (r) => new Date(r.endDate).toLocaleDateString(),
              },
              {
                key: 'days',
                label: 'Working Days',
                render: (r) => `${r.days || 1} day(s)`,
              },
              { key: 'reason', label: 'Reason' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <span
                    className={`badge ${
                      r.status === 'approved'
                        ? 'text-bg-success'
                        : r.status === 'rejected'
                        ? 'text-bg-danger'
                        : 'text-bg-warning'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
              {
                key: 'reviewNote',
                label: 'Admin Comment',
                render: (r) => r.reviewNote || '—',
              },
              ...(canReview
                ? [
                    {
                      key: 'actions',
                      label: 'Actions',
                      render: (r) =>
                        r.status === 'pending' ? (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => reviewLeave(r._id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => reviewLeave(r._id, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          '—'
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
