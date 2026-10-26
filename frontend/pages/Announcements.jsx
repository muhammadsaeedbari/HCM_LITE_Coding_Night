import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canManage = ['admin', 'hr'].includes(user.role);

  async function loadAnnouncements() {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/announcements');
      setAnnouncements(data.announcements || data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load announcements.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await API.post('/announcements', { title, content, priority });
      setTitle('');
      setContent('');
      setPriority('normal');
      setNotice('Announcement posted.');
      await loadAnnouncements();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to post announcement.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement?')) return;
    setError('');
    setNotice('');
    try {
      await API.delete(`/announcements/${id}`);
      setNotice('Announcement deleted.');
      await loadAnnouncements();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to delete announcement.'
      );
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Announcements</h2>
          <p className="text-secondary mb-0">
            {canManage
              ? 'Post company-wide updates for all employees'
              : 'Company news and announcements'}
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={loadAnnouncements}>
          Refresh
        </button>
      </div>

      <ErrorMessage message={error} onRetry={loadAnnouncements} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && (
        <form
          className="card border-0 shadow-sm p-4 mb-4"
          onSubmit={handleSubmit}
        >
          <h5 className="mb-3">Post Announcement</h5>
          <div className="row g-3">
            <div className="col-12 col-md-8">
              <label className="form-label" htmlFor="annTitle">
                Title *
              </label>
              <input
                id="annTitle"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="annPriority">
                Priority
              </label>
              <select
                id="annPriority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="annContent">
                Message *
              </label>
              <textarea
                id="annContent"
                rows="3"
                className="form-control"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={3000}
                required
              />
            </div>
          </div>
          <button
            className="btn btn-primary mt-3 align-self-start"
            disabled={saving}
          >
            {saving ? 'Posting...' : 'Publish Announcement'}
          </button>
        </form>
      )}

      {loading ? (
        <Loading text="Loading announcements..." />
      ) : !announcements.length ? (
        <div className="card border-0 shadow-sm p-5 text-center text-secondary">
          No announcements have been posted yet.
        </div>
      ) : (
        <div className="row g-3">
          {announcements.map((a) => (
            <div className="col-12" key={a._id}>
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h5 className="fw-bold mb-0">{a.title}</h5>
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
                      <small className="text-secondary">
                        Posted by {a.createdBy?.name || 'Admin'} on{' '}
                        {new Date(a.createdAt).toLocaleString()}
                      </small>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(a._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {a.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
