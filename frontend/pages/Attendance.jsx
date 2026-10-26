import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [dateFilter, setDateFilter] = useState('');
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
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (canSelectEmployee && employeeId) params.employeeId = employeeId;

      const requests = [API.get('/attendance', { params })];
      if (canSelectEmployee) requests.push(API.get('/organization/employees'));

      const results = await Promise.all(requests);
      setRecords(
        results[0].data.attendance ||
          results[0].data.records ||
          results[0].data.data ||
          []
      );
      if (canSelectEmployee) {
        setEmployees(
          results[1].data.employees || results[1].data.data || []
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load attendance.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  async function markAttendance(action) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = canSelectEmployee && employeeId ? { employeeId } : {};
      const { data } = await API.post(`/attendance/${action}`, payload);
      setNotice(
        data.message ||
          (action === 'check-in' ? 'Check-in recorded.' : 'Check-out recorded.')
      );
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Attendance action failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  function exportToCSV() {
    if (!records.length) return;
    const headers = [
      'Employee Code',
      'Employee Name',
      'Date',
      'Check In',
      'Check Out',
      'Work Hours',
      'Status',
    ];
    const csvRows = [
      headers.join(','),
      ...records.map((r) => {
        const code = r.employeeId?.employeeCode || '';
        const name = r.employeeId?.firstName
          ? `${r.employeeId.firstName} ${r.employeeId.lastName}`
          : '';
        const cin = r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '';
        const cout = r.checkOut
          ? new Date(r.checkOut).toLocaleTimeString()
          : '';
        const hrs = r.workHours ?? '';
        return [code, `"${name}"`, r.date, `"${cin}"`, `"${cout}"`, hrs, r.status].join(
          ','
        );
      }),
    ];

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold">Attendance</h2>
          <p className="text-secondary mb-0">
            Daily check-in &amp; check-out (auto-marks Present, Late, or Half-Day based on company settings)
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={exportToCSV}
            disabled={!records.length}
          >
            <i className="bi bi-download me-1" />
            Export CSV
          </button>
          <button className="btn btn-outline-primary" onClick={loadData}>
            Refresh
          </button>
        </div>
      </div>

      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            {canSelectEmployee && (
              <div className="col-12 col-md-4">
                <label htmlFor="employeeId" className="form-label">
                  Employee (for HR/Admin)
                </label>
                <select
                  id="employeeId"
                  className="form-select"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
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

            <div className="col-12 col-md-3">
              <label htmlFor="dateFilter" className="form-label">
                Filter by Date
              </label>
              <input
                id="dateFilter"
                type="date"
                className="form-control"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-5 d-flex flex-wrap gap-2">
              <button
                className="btn btn-success"
                disabled={busy || (canSelectEmployee && !employeeId)}
                onClick={() => markAttendance('check-in')}
              >
                <i className="bi bi-box-arrow-in-right me-1" />
                {busy ? 'Please wait...' : 'Check In'}
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={busy || (canSelectEmployee && !employeeId)}
                onClick={() => markAttendance('check-out')}
              >
                <i className="bi bi-box-arrow-right me-1" />
                Check Out
              </button>
              {dateFilter && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setDateFilter('')}
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
          {canSelectEmployee && (
            <small className="text-secondary d-block mt-2">
              Select an employee above to record check-in/check-out on their behalf, or filter records.
            </small>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">
          Attendance Records ({records.length})
        </div>
        {loading ? (
          <Loading text="Loading attendance..." />
        ) : (
          <DataTable
            rows={records}
            columns={[
              {
                key: 'employeeId',
                label: 'Employee',
                render: (r) =>
                  r.employeeId?.firstName
                    ? `${r.employeeId.firstName} ${r.employeeId.lastName} (${r.employeeId.employeeCode})`
                    : r.employeeId?.employeeCode || '—',
              },
              { key: 'date', label: 'Date' },
              {
                key: 'checkIn',
                label: 'Check In',
                render: (r) =>
                  r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—',
              },
              {
                key: 'checkOut',
                label: 'Check Out',
                render: (r) =>
                  r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—',
              },
              {
                key: 'workHours',
                label: 'Work Hours',
                render: (r) =>
                  r.workHours ? `${r.workHours} hrs` : r.checkOut ? '0 hrs' : '—',
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <span
                    className={`badge ${
                      r.status === 'present'
                        ? 'text-bg-success'
                        : r.status === 'late'
                        ? 'text-bg-warning'
                        : r.status === 'half-day'
                        ? 'text-bg-info'
                        : 'text-bg-danger'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>
    </main>
  );
}
