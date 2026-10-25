import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import {
  AuthProvider
} from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const App = () => {
  return (
    <BrowserRouter>

      <AuthProvider>

        <Routes>

          <Route
            path="/"
            element={
              <Navigate
                to="/setup"
                replace
              />
            }
          />

          <Route
            path="/setup"
            element={<Setup />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >

            <Route
              path="/dashboard"
              element={
                <Dashboard />
              }
            />

          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>
  );
};

export default App;