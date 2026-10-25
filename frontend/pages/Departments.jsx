
import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canManage = ['admin', 'hr'].includes(user.role);

  async function loadDepartments() {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/organization/departments');
      setDepartments(data.departments || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await API.post('/organization/departments', { name, description });
      setName('');
      setDescription('');
      setNotice('Department created successfully.');
      await loadDepartments();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create department.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Departments</h2>
          <p className="text-secondary mb-0">Manage your company departments</p>
        </div>
        <button className="btn btn-outline-primary" onClick={loadDepartments}>Refresh</button>
      </div>

      <ErrorMessage message={error} onRetry={loadDepartments} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && (
        <form className="card border-0 shadow-sm p-3 p-md-4 mb-4" onSubmit={handleSubmit}>
          <h5 className="mb-3">Create Department</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="departmentName" className="form-label">Department Name</label>
              <input id="departmentName" className="form-control" value={name}
                onChange={(e) => setName(e.target.value)} maxLength={100} required />
            </div>
            <div className="col-md-6">
              <label htmlFor="departmentDescription" className="form-label">Description</label>
              <input id="departmentDescription" className="form-control" value={description}
                onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" disabled={saving}>
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold py-3">
          Department Records ({departments.length})
        </div>
        {loading ? <Loading text="Loading departments..." /> : (
          <DataTable
            rows={departments}
            columns={[
              { key: 'name', label: 'Department' },
              { key: 'description', label: 'Description' },
              { key: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
              { key: 'createdAt', label: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' }
            ]}
          />
        )}
      </div>
    </main>
  );
}
