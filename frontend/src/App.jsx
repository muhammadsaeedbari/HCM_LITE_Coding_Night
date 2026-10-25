
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Login from '../pages/Login.jsx';
import InitialSetup from '../pages/InitialSetup.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Employees from '../pages/Employees.jsx';
import Departments from '../pages/Departments.jsx';
import Designations from '../pages/Designations.jsx';
import Attendance from '../pages/Attendance.jsx';
import Leaves from '../pages/Leaves.jsx';
import Payroll from '../pages/Payroll.jsx';

import ProtectedRoute from '../components/ProtectedRoute.jsx';
import HRLayout from '../components/HRLayout.jsx';

import './App.css';

function App() {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated ? '/dashboard' : '/login'}
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />

      <Route path="/setup" element={<InitialSetup />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<HRLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/designations" element={<Designations />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/payroll" element={<Payroll />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
