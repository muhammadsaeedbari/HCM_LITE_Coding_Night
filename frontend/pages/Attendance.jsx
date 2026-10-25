
import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canSelectEmployee = ['admin', 'hr'].includes(user.role);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const requests = [API.get('/attendance')];
      if (canSelectEmployee) requests.push(API.get('/organization/employees'));

      const results = await Promise.all(requests);
      setRecords(results[0].data.attendance || results[0].data.records || []);
      if (canSelectEmployee) {
        setEmployees(results[1].data.employees || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load attendance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function markAttendance(action) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = canSelectEmployee && employeeId ? { employeeId } : {};
      await API.post(`/attendance/${action}`, payload);
      setNotice(action === 'check-in' ? 'Check-in recorded.' : 'Check-out recorded.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Attendance action failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="mb-4">
        <h2 className="fw-bold">Attendance</h2>
        <p className="text-secondary mb-0">Daily attendance and working hours</p>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          {canSelectEmployee && (
            <div className="mb-3" style={{ maxWidth: 400 }}>
              <label htmlFor="employeeId" className="form-label">Employee (for HR/Admin)</label>
              <select id="employeeId" className="form-select" value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} ({employee.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-success" disabled={busy || (canSelectEmployee && !employeeId)}
              onClick={() => markAttendance('check-in')}>
              {busy ? 'Please wait...' : 'Check In'}
            </button>
            <button className="btn btn-outline-primary" disabled={busy || (canSelectEmployee && !employeeId)}
              onClick={() => markAttendance('check-out')}>
              Check Out
            </button>
            <button className="btn btn-outline-secondary" onClick={loadData}>Refresh Records</button>
          </div>
          {canSelectEmployee && (
            <small className="text-secondary d-block mt-2">
              Select an employee before recording attendance as HR/Admin.
            </small>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">Attendance Records</div>
        {loading ? <Loading text="Loading attendance..." /> : (
          <DataTable
            rows={records}
            columns={[
              { key: 'employeeId', label: 'Employee', render: (r) => r.employeeId?.firstName ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : r.employeeId?.employeeCode || '—' },
              { key: 'date', label: 'Date' },
              { key: 'checkIn', label: 'Check In', render: (r) => r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—' },
              { key: 'checkOut', label: 'Check Out', render: (r) => r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—' },
              { key: 'status', label: 'Status', render: (r) => <span className="badge text-bg-info">{r.status}</span> }
            ]}
          />
        )}
      </div>
    </main>
  );
}


