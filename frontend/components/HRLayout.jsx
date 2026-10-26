import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

function HRLayout() {
  return (
    <div className="hr-app">
      <Navbar />

      <div className="d-flex flex-column flex-md-row">
        <Sidebar />

        <main
          className="flex-grow-1 p-3 p-md-4"
          style={{ minWidth: 0, minHeight: 'calc(100vh - 56px)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default HRLayout;
