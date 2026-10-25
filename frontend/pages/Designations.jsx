
import { useEffect, useState } from 'react';
import API from '../services/api.js';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Designations() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const user = JSON.parse(localStorage.getItem('hcm_user') || '{}');
  const canManage = ['admin', 'hr'].includes(user.role);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [d, r] = await Promise.all([
        API.get('/organization/departments'),
        API.get('/organization/designations')
      ]);
      setDepartments(d.data.departments || []);
      setRows(r.data.designations || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load designations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await API.post('/organization/designations', { title, departmentId, description });
      setTitle('');
      setDescription('');
      setDepartmentId('');
      setNotice('Designation created.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create designation.');
    }
  }

  return (
    <main className="container-fluid p-3 p-md-4">
      <h2 className="fw-bold">Designations</h2>
      <p className="text-secondary">Job titles and department assignments</p>
      <ErrorMessage message={error} onRetry={loadData} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && <form className="card border-0 shadow-sm p-3 mb-4" onSubmit={submit}>
        <h5>Create Designation</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Title</label>
            <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Department</label>
            <select className="form-select" value={departmentId} onChange={e => setDepartmentId(e.target.value)} required>
              <option value="">Select department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Description</label>
            <input className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary mt-3 align-self-start">Add Designation</button>
      </form>}

      <div className="card border-0 shadow-sm">
        {loading ? <Loading /> : <DataTable rows={rows} columns={[
          { key: 'title', label: 'Title' },
          { key: 'departmentId', label: 'Department', render: r => r.departmentId?.name || '—' },
          { key: 'description', label: 'Description' },
          { key: 'isActive', label: 'Status', render: r => r.isActive ? 'Active' : 'Inactive' }
        ]} />}
      </div>
    </main>
  );
}
