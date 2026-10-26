import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Payroll() {
  const [rows, setRows] = useState([]);
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [form, setForm] = useState({
    employeeId: '',
    period: new Date().toISOString().slice(0, 7),
    allowances: 0,
    deductions: 0,
    absentDays: '',
    halfDays: '',
    autoCalculate: true,
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
      setRows(result[0].data.payrolls || result[0].data.data || []);
      setCompany(result[0].data.company || null);
      if (canManage) {
        setEmployees(
          result[1].data.employees || result[1].data.data || []
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Unable to load payroll.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadPreview() {
      if (!canManage || !form.employeeId || !form.period) {
        setPreview(null);
        return;
      }
      try {
        const { data } = await API.get('/payroll/preview', {
          params: { employeeId: form.employeeId, period: form.period },
        });
        setPreview(data.data);
        setForm((prev) => ({
          ...prev,
          absentDays: data.data.absentDays,
          halfDays: data.data.halfDays,
        }));
      } catch {
        setPreview(null);
      }
    }
    loadPreview();
  }, [canManage, form.employeeId, form.period]);

  async function createPayroll(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data } = await API.post('/payroll', {
        employeeId: form.employeeId,
        period: form.period,
        allowances: Number(form.allowances) || 0,
        deductions: Number(form.deductions) || 0,
        absentDays: form.absentDays !== '' ? Number(form.absentDays) : undefined,
        halfDays: form.halfDays !== '' ? Number(form.halfDays) : undefined,
        autoCalculate: form.autoCalculate,
      });
      setNotice(data.message || 'Payslip generated.');
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to generate payslip.'
      );
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
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to update payroll.'
      );
    }
  }

  function printSlip() {
    window.print();
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 no-print">
        <div>
          <h2 className="fw-bold">Monthly Payslips &amp; Payroll</h2>
          <p className="text-secondary mb-0">
            Formula: Per Day = Salary ÷ Working Days · Deduction = Per Day × (Absent + 0.5 × Half Days) · Net = Salary − Deduction
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={loadData}>
          Refresh
        </button>
      </div>

      <div className="no-print">
        <ErrorMessage message={error} onRetry={loadData} />
        {notice && <div className="alert alert-success">{notice}</div>}
      </div>

      {canManage && (
        <form
          className="card border-0 shadow-sm p-3 p-md-4 mb-4 no-print"
          onSubmit={createPayroll}
        >
          <h5 className="mb-3">Generate / Recalculate Monthly Payslip</h5>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Employee *</label>
              <select
                className="form-select"
                required
                value={form.employeeId}
                onChange={(e) =>
                  setForm({ ...form, employeeId: e.target.value })
                }
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode}) —{' '}
                    {Number(emp.basicSalary || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Month *</label>
              <input
                type="month"
                className="form-control"
                required
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Absent Days</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.absentDays}
                onChange={(e) =>
                  setForm({ ...form, absentDays: e.target.value })
                }
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Half Days</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.halfDays}
                onChange={(e) => setForm({ ...form, halfDays: e.target.value })}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Allowances</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.allowances}
                onChange={(e) =>
                  setForm({ ...form, allowances: e.target.value })
                }
              />
            </div>
          </div>

          {preview && (
            <div className="alert alert-info mt-3 mb-0 small">
              <strong>Auto-Calculation Preview ({form.period}):</strong> Basic
              Salary: <strong>{Number(preview.basicSalary).toLocaleString()}</strong>{' '}
              | Working Days in Month: <strong>{preview.workingDays}</strong> |
              Per Day Rate: <strong>{preview.perDaySalary}</strong> | Present:{' '}
              <strong>{preview.presentDays}</strong> | Approved Leave:{' '}
              <strong>{preview.leaveDays}</strong> | Absent:{' '}
              <strong>{form.absentDays !== '' ? form.absentDays : preview.absentDays}</strong>{' '}
              | Half-Days:{' '}
              <strong>{form.halfDays !== '' ? form.halfDays : preview.halfDays}</strong>{' '}
              | Estimated Deduction:{' '}
              <strong>
                {Math.round(
                  preview.perDaySalary *
                    ((Number(form.absentDays) || 0) +
                      0.5 * (Number(form.halfDays) || 0))
                ).toLocaleString()}
              </strong>
            </div>
          )}

          <div className="mt-3">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Generating...' : 'Generate Payslip'}
            </button>
          </div>
        </form>
      )}

      {/* Printable Payslip View */}
      {selectedSlip && (
        <div className="card border shadow-sm mb-4 p-4 bg-white" id="printable-payslip">
          <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
            <div>
              <h3 className="fw-bold text-primary mb-0">
                {company?.name || 'HCM Lite'}
              </h3>
              <div className="text-secondary small">
                Official Monthly Salary Slip — Period: {selectedSlip.period}
              </div>
            </div>
            <div className="d-flex gap-2 no-print">
              <button className="btn btn-primary btn-sm" onClick={printSlip}>
                <i className="bi bi-printer me-1" />
                Print / Save as PDF
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setSelectedSlip(null)}
              >
                Close
              </button>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <div>
                <strong>Employee Name:</strong>{' '}
                {selectedSlip.employeeId?.firstName
                  ? `${selectedSlip.employeeId.firstName} ${selectedSlip.employeeId.lastName}`
                  : '—'}
              </div>
              <div>
                <strong>Employee Code:</strong>{' '}
                {selectedSlip.employeeId?.employeeCode || '—'}
              </div>
              <div>
                <strong>Email:</strong> {selectedSlip.employeeId?.email || '—'}
              </div>
            </div>
            <div className="col-sm-6 text-sm-end">
              <div>
                <strong>Department:</strong>{' '}
                {selectedSlip.employeeId?.departmentId?.name || '—'}
              </div>
              <div>
                <strong>Designation:</strong>{' '}
                {selectedSlip.employeeId?.designationId?.title || '—'}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className="text-uppercase fw-semibold">
                  {selectedSlip.status}
                </span>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>Description</th>
                  <th className="text-end">Details / Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Working Days in Month</td>
                  <td className="text-end">{selectedSlip.workingDays || 22} days</td>
                </tr>
                <tr>
                  <td>Per Day Salary (Basic ÷ Working Days)</td>
                  <td className="text-end">
                    {Number(selectedSlip.perDaySalary || 0).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td>Attendance Breakdown</td>
                  <td className="text-end">
                    Present: {selectedSlip.presentDays ?? 0} · Absent:{' '}
                    {selectedSlip.absentDays ?? 0} · Half Days:{' '}
                    {selectedSlip.halfDays ?? 0} · Leave:{' '}
                    {selectedSlip.leaveDays ?? 0}
                  </td>
                </tr>
                <tr>
                  <td>Basic Monthly Salary</td>
                  <td className="text-end">
                    {Number(selectedSlip.basicSalary).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td>Allowances</td>
                  <td className="text-end text-success">
                    + {Number(selectedSlip.allowances || 0).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td>
                    Deductions (Per Day × [Absent + 0.5 × Half Days])
                  </td>
                  <td className="text-end text-danger">
                    − {Number(selectedSlip.deductions || 0).toLocaleString()}
                  </td>
                </tr>
                <tr className="table-primary fw-bold fs-5">
                  <td>Net Payable Salary</td>
                  <td className="text-end">
                    {Number(selectedSlip.netSalary).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm no-print">
        <div className="card-header bg-white fw-semibold py-3">
          Payslip Records ({rows.length})
        </div>
        {loading ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: 'employeeId',
                label: 'Employee',
                render: (r) =>
                  r.employeeId?.firstName
                    ? `${r.employeeId.firstName} ${r.employeeId.lastName} (${r.employeeId.employeeCode})`
                    : r.employeeId?.employeeCode || '—',
              },
              { key: 'period', label: 'Period' },
              {
                key: 'workingDays',
                label: 'Working Days',
                render: (r) => r.workingDays || 22,
              },
              {
                key: 'absentDays',
                label: 'Absent / Half',
                render: (r) =>
                  `${r.absentDays ?? 0}A / ${r.halfDays ?? 0}H`,
              },
              {
                key: 'basicSalary',
                label: 'Basic',
                render: (r) => Number(r.basicSalary).toLocaleString(),
              },
              {
                key: 'deductions',
                label: 'Deduction',
                render: (r) => (
                  <span className="text-danger">
                    {Number(r.deductions || 0).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'netSalary',
                label: 'Net Salary',
                render: (r) => (
                  <strong className="text-success">
                    {Number(r.netSalary).toLocaleString()}
                  </strong>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <span
                    className={`badge ${
                      r.status === 'paid'
                        ? 'text-bg-success'
                        : r.status === 'approved'
                        ? 'text-bg-primary'
                        : 'text-bg-secondary'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Payslip & Actions',
                render: (r) => (
                  <div className="d-flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark"
                      onClick={() => setSelectedSlip(r)}
                    >
                      <i className="bi bi-file-earmark-pdf me-1" />
                      Payslip
                    </button>
                    {canManage && r.status === 'draft' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => updateStatus(r._id, 'approved')}
                      >
                        Approve
                      </button>
                    )}
                    {canManage && r.status === 'approved' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => updateStatus(r._id, 'paid')}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </main>
  );
}
