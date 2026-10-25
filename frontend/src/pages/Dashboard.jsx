import {
  useAuth
} from "../context/AuthContext";

const Dashboard = () => {
  const {
    user
  } = useAuth();

  return (
    <div>

      <div className="mb-8">

        <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
          {user?.role} Dashboard
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Welcome, {user?.name}
        </h1>

      </div>

      <div className="grid gap-5 md:grid-cols-3">

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Account Role
          </p>

          <p className="mt-3 text-2xl font-bold capitalize">
            {user?.role}
          </p>

        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Application
          </p>

          <p className="mt-3 text-2xl font-bold">
            HCM Lite
          </p>

        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Status
          </p>

          <p className="mt-3 text-2xl font-bold text-emerald-600">
            Active
          </p>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;