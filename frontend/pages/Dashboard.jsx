import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import SmartHelper from '../components/SmartHelper.jsx';

export default function Dashboard() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'employee';
  const isAdmin = ['admin', 'hr'].includes(role);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/dashboard/summary');
      setSummary(data);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Unable to load dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  async function handleAttendance(action) {
    setBusyAction(true);
    setError('');
    setNotice('');
    try {
      const { data } = await API.post(`/attendance/${action}`, {});
      setNotice(
        data.message ||
          (action === 'check-in' ? 'Checked in!' : 'Checked out!')
      );
      await loadSummary();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Attendance action failed.'
      );
    } finally {
      setBusyAction(false);
    }
  }

  async function handleQuickReviewLeave(id, status) {
    const reviewNote = window.prompt(`Add comment for ${status} leave:`) || '';
    setError('');
    setNotice('');
    try {
      await API.patch(`/leaves/${id}/review`, { status, reviewNote });
      setNotice(`Leave request ${status}.`);
      await loadSummary();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Unable to review leave.'
      );
    }
  }

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1">
            {isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}
          </h2>
          <p className="text-secondary mb-0">
            Welcome{user?.name ? `, ${user.name}` : ''} ·{' '}
            {summary?.company?.name || 'HCM Lite'} (Office Start:{' '}
            {summary?.company?.officeStartTime || '09:00'}, Grace:{' '}
            {summary?.company?.graceMinutes ?? 15}m)
          </p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={loadSummary}>
          <i className="bi bi-arrow-clockwise me-1" />
          Refresh
        </button>
      </div>

      <ErrorMessage message={error} onRetry={loadSummary} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {isAdmin ? (
        <>
          {/* Admin Stat Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Present Today</div>
                  <div className="fs-2 fw-bold text-success">
                    {summary?.totals?.presentToday ?? 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">On Leave Today</div>
                  <div className="fs-2 fw-bold text-warning">
                    {summary?.totals?.onLeaveTodayCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Late Today</div>
                  <div className="fs-2 fw-bold text-danger">
                    {summary?.totals?.lateTodayCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Half-Day Today</div>
                  <div className="fs-2 fw-bold text-info">
                    {summary?.totals?.halfDayTodayCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Total Employees</div>
                  <div className="fs-2 fw-bold text-primary">
                    {summary?.totals?.totalEmployees ?? 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Pending Leaves</div>
                  <div className="fs-2 fw-bold text-secondary">
                    {summary?.totals?.pendingLeavesCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {/* Attendance by Department */}
            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-semibold py-3 d-flex justify-content-between align-items-center">
                  <span>Attendance by Department (Today)</span>
                  <Link to="/attendance" className="small">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  {!summary?.departmentAttendance?.length ? (
                    <p className="text-secondary mb-0">
                      No departments created yet.{' '}
                      <Link to="/departments">Add departments</Link> to see breakdown.
                    </p>
                  ) : (
                    summary.departmentAttendance.map((dept) => {
                      const pct =
                        dept.totalEmployees > 0
                          ? Math.round(
                              (dept.presentToday / dept.totalEmployees) * 100
                            )
                          : 0;
                      return (
                        <div key={dept.department} className="mb-3">
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="fw-semibold">{dept.department}</span>
                            <span className="text-secondary">
                              {dept.presentToday} / {dept.totalEmployees} present (
                              {pct}%)
                            </span>
                          </div>
                          <div className="progress" style={{ height: 10 }}>
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${pct}%` }}
                              aria-valuenow={pct}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}

                  <hr />
                  <h6 className="fw-semibold mb-2">Pending Leave Requests</h6>
                  {!summary?.pendingLeaves?.length ? (
                    <p className="text-secondary small mb-0">
                      No pending leave requests.
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Dates</th>
                            <th>Days</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.pendingLeaves.map((lv) => (
                            <tr key={lv._id}>
                              <td>
                                {lv.employeeId
                                  ? `${lv.employeeId.firstName} ${lv.employeeId.lastName}`
                                  : 'Employee'}
                              </td>
                              <td>
                                <span className="badge text-bg-light border">
                                  {lv.leaveType}
                                </span>
                              </td>
                              <td className="small">
                                {new Date(lv.startDate).toLocaleDateString()} –{' '}
                                {new Date(lv.endDate).toLocaleDateString()}
                              </td>
                              <td>{lv.days || 1}</td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button
                                    className="btn btn-sm btn-success py-0 px-2"
                                    onClick={() =>
                                      handleQuickReviewLeave(lv._id, 'approved')
                                    }
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger py-0 px-2"
                                    onClick={() =>
                                      handleQuickReviewLeave(lv._id, 'rejected')
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Helper */}
            <div className="col-12 col-lg-5">
              <SmartHelper role={role} />
            </div>
          </div>
        </>
      ) : (
        /* Employee Dashboard */
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Today&apos;s Attendance</div>
                  <div className="fs-4 fw-bold text-uppercase mt-1">
                    {summary?.todayAttendance?.status || 'Not Checked In'}
                  </div>
                  <div className="small text-secondary mt-1">
                    {summary?.todayAttendance?.checkIn
                      ? `In: ${new Date(
                          summary.todayAttendance.checkIn
                        ).toLocaleTimeString()}`
                      : 'No check-in yet'}
                    {summary?.todayAttendance?.checkOut
                      ? ` · Out: ${new Date(
                          summary.todayAttendance.checkOut
                        ).toLocaleTimeString()}`
                      : ''}
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-sm btn-success"
                      disabled={
                        busyAction || Boolean(summary?.todayAttendance?.checkIn)
                      }
                      onClick={() => handleAttendance('check-in')}
                    >
                      Check In
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={
                        busyAction ||
                        !summary?.todayAttendance?.checkIn ||
                        Boolean(summary?.todayAttendance?.checkOut)
                      }
                      onClick={() => handleAttendance('check-out')}
                    >
                      Check Out
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Leave Balance</div>
                  <div className="fs-2 fw-bold text-primary">
                    {summary?.leaveBalance?.remainingDays ?? 20}{' '}
                    <span className="fs-6 text-secondary fw-normal">
                      / {summary?.leaveBalance?.quota ?? 20} days left
                    </span>
                  </div>
                  <div className="small text-secondary">
                    Used: {summary?.leaveBalance?.usedDays ?? 0} · Pending:{' '}
                    {summary?.leaveBalance?.pendingDays ?? 0}
                  </div>
                  <Link
                    to="/leaves"
                    className="btn btn-sm btn-outline-primary mt-2"
                  >
                    Apply for Leave
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">Hours Worked (7 Days)</div>
                  <div className="fs-2 fw-bold text-success">
                    {summary?.weeklyHours ?? 0} hrs
                  </div>
                  <div className="small text-secondary">
                    Half-day threshold: under{' '}
                    {summary?.company?.halfDayHours ?? 5} hrs
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="text-secondary small">This Month Summary</div>
                  <div className="mt-2">
                    <span className="badge text-bg-success me-1">
                      Present: {summary?.monthlyStats?.present ?? 0}
                    </span>
                    <span className="badge text-bg-warning me-1">
                      Late: {summary?.monthlyStats?.late ?? 0}
                    </span>
                    <span className="badge text-bg-info">
                      Half-day: {summary?.monthlyStats?.halfDay ?? 0}
                    </span>
                  </div>
                  <Link
                    to="/payroll"
                    className="btn btn-sm btn-outline-secondary mt-3"
                  >
                    View My Payslip
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-semibold py-3 d-flex justify-content-between">
                  <span>My Recent Attendance</span>
                  <Link to="/attendance" className="small">
                    Full History
                  </Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Hours</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!summary?.recentAttendance?.length ? (
                          <tr>
                            <td colSpan="5" className="text-center py-4 text-secondary">
                              No attendance records yet.
                            </td>
                          </tr>
                        ) : (
                          summary.recentAttendance.map((r) => (
                            <tr key={r._id}>
                              <td>{r.date}</td>
                              <td>
                                {r.checkIn
                                  ? new Date(r.checkIn).toLocaleTimeString()
                                  : '—'}
                              </td>
                              <td>
                                {r.checkOut
                                  ? new Date(r.checkOut).toLocaleTimeString()
                                  : '—'}
                              </td>
                              <td>{r.workHours ? `${r.workHours} hrs` : '—'}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    r.status === 'present'
                                      ? 'text-bg-success'
                                      : r.status === 'late'
                                      ? 'text-bg-warning'
                                      : 'text-bg-info'
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <SmartHelper role={role} />
            </div>
          </div>
        </>
      )}

      {/* Announcements Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white fw-semibold py-3 d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-megaphone me-2 text-primary" />
            Company Announcements
          </span>
          <Link to="/announcements" className="small">
            {isAdmin ? 'Manage Announcements' : 'View All'}
          </Link>
        </div>
        <div className="card-body">
          {!summary?.announcements?.length ? (
            <p className="text-secondary mb-0">No announcements posted yet.</p>
          ) : (
            <div className="row g-3">
              {summary.announcements.map((a) => (
                <div className="col-12 col-md-6" key={a._id}>
                  <div className="border rounded p-3 h-100 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold">{a.title}</span>
                      <span
                        className={`badge ${
                          a.priority === 'urgent'
                            ? 'text-bg-danger'
                            : a.priority === 'important'
                            ? 'text-bg-warning'
                            : 'text-bg-secondary'
                        }`}
                      >
                        {a.priority}
                      </span>
                    </div>
                    <p className="small text-secondary mb-1">{a.content}</p>
                    <small className="text-muted">
                      Posted {new Date(a.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
