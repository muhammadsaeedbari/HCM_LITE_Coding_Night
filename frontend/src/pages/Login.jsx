import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  useAuth
} from "../context/AuthContext";

const Login = () => {
  const navigate =
    useNavigate();

  const {
    login
  } = useAuth();

  const [form, setForm] =
    useState({
      email: "",
      password: ""
    });

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(
        form.email,
        form.password
      );

      navigate(
        "/dashboard"
      );
    } catch (error) {
      setError(
        error.response?.data
          ?.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">

      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">

        <div className="mb-8">

          <div className="mb-4 inline-flex rounded-xl bg-teal-600 px-4 py-2 font-bold text-white">
            HCM Lite
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue
          </p>

        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email:
                    e.target.value
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-600"
              placeholder="admin@company.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              required
              value={
                form.password
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  password:
                    e.target.value
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-600"
              placeholder="••••••••"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

      </section>

    </main>
  );
};

export default Login;