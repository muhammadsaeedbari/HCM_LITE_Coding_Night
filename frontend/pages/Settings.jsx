import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const dayLabels = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function Settings() {
  const [form, setForm] = useState({
    name: '',
    officeStartTime: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
    leaveQuota: 20,
    weekendDays: [6, 0],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/organization/settings');
      const s = data.settings || data.data || {};
      setForm({
        name: s.name || '',
        officeStartTime: s.officeStartTime || '09:00',
        graceMinutes: s.graceMinutes ?? 15,
        halfDayHours: s.halfDayHours ?? 5,
        leaveQuota: s.leaveQuota ?? 20,
        weekendDays: Array.isArray(s.weekendDays) ? s.weekendDays : [6, 0],
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load company settings.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function toggleWeekendDay(dayNum) {
    setForm((prev) => {
      const exists = prev.weekendDays.includes(dayNum);
      return {
        ...prev,
        weekendDays: exists
          ? prev.weekendDays.filter((d) => d !== dayNum)
          : [...prev.weekendDays, dayNum],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await API.put('/organization/settings', {
        name: form.name,
        officeStartTime: form.officeStartTime,
        graceMinutes: Number(form.graceMinutes),
        halfDayHours: Number(form.halfDayHours),
        leaveQuota: Number(form.leaveQuota),
        weekendDays: form.weekendDays,
      });
      setNotice(data.message || 'Company settings saved.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to update company settings.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading text="Loading company settings..." />;
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="mb-4">
        <h2 className="fw-bold">Company Settings</h2>
        <p className="text-secondary mb-0">
          Configure office start time, grace minutes, half-day threshold, yearly leave quota, and working days
        </p>
      </div>

      <ErrorMessage message={error} onRetry={loadSettings} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card border-0 shadow-sm" style={{ maxWidth: 760 }}>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label fw-semibold" htmlFor="companyName">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  className="form-label fw-semibold"
                  htmlFor="officeStartTime"
                >
                  Office Start Time (24h)
                </label>
                <input
                  id="officeStartTime"
                  type="time"
                  className="form-control"
                  value={form.officeStartTime}
                  onChange={(e) =>
                    setForm({ ...form, officeStartTime: e.target.value })
                  }
                  required
                />
                <small className="text-secondary">
                  Employees checking in after Start Time + Grace Minutes are marked Late.
                </small>
              </div>

              <div className="col-12 col-md-6">
                <label
                  className="form-label fw-semibold"
                  htmlFor="graceMinutes"
                >
                  Grace Minutes
                </label>
                <input
                  id="graceMinutes"
                  type="number"
                  min="0"
                  max="240"
                  className="form-control"
                  value={form.graceMinutes}
                  onChange={(e) =>
                    setForm({ ...form, graceMinutes: e.target.value })
                  }
                  required
                />
                <small className="text-secondary">
                  Example: 09:00 + 15 mins = Late after 09:15.
                </small>
              </div>

              <div className="col-12 col-md-6">
                <label
                  className="form-label fw-semibold"
                  htmlFor="halfDayHours"
                >
                  Half-Day Threshold (Hours)
                </label>
                <input
                  id="halfDayHours"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  className="form-control"
                  value={form.halfDayHours}
                  onChange={(e) =>
                    setForm({ ...form, halfDayHours: e.target.value })
                  }
                  required
                />
                <small className="text-secondary">
                  Work hours (Check-out − Check-in) under this value = Half Day.
                </small>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold" htmlFor="leaveQuota">
                  Yearly Paid Leave Quota (Days)
                </label>
                <input
                  id="leaveQuota"
                  type="number"
                  min="0"
                  max="365"
                  className="form-control"
                  value={form.leaveQuota}
                  onChange={(e) =>
                    setForm({ ...form, leaveQuota: e.target.value })
                  }
                  required
                />
                <small className="text-secondary">
                  Maximum paid leave working days an employee can take per year.
                </small>
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold d-block">
                  Weekend / Non-Working Days (Skipped in Leave &amp; Payslip Calculations)
                </label>
                <div className="d-flex flex-wrap gap-3 mt-1">
                  {dayLabels.map((d) => {
                    const isWeekend = form.weekendDays.includes(d.value);
                    return (
                      <div className="form-check" key={d.value}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`weekend-${d.value}`}
                          checked={isWeekend}
                          onChange={() => toggleWeekendDay(d.value)}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`weekend-${d.value}`}
                        >
                          {d.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button className="btn btn-primary mt-4" disabled={saving}>
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
