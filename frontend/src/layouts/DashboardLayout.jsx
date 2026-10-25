import {
  Link,
  Outlet
} from "react-router-dom";

import {
  useAuth
} from "../context/AuthContext";

const DashboardLayout = () => {
  const {
    user,
    logout
  } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link
            to="/dashboard"
            className="text-xl font-bold text-teal-600"
          >
            HCM Lite
          </Link>

          <div className="flex items-center gap-4">

            <div className="text-right">

              <p className="font-semibold">
                {user?.name}
              </p>

              <p className="text-xs uppercase text-slate-500">
                {user?.role}
              </p>

            </div>

            <button
              onClick={logout}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>

    </div>
  );
};

export default DashboardLayout;