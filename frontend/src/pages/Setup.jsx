import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import {
  useAuth
} from "../context/AuthContext";

const Setup = () => {
  const navigate =
    useNavigate();

  const {
    setUser
  } = useAuth();

  const [checking, setChecking] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      companyName: "",
      companyEmail: "",
      adminName: "",
      adminEmail: "",
      adminPassword: ""
    });

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const { data } =
        await api.get(
          "/setup/status"
        );

      if (
        !data.setupRequired
      ) {
        navigate(
          "/login",
          {
            replace: true
          }
        );
      }
    } catch (error) {
      setError(
        "Unable to check setup status"
      );
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (
    event
  ) => {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value
    });
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data } =
        await api.post(
          "/setup",
          form
        );

      localStorage.setItem(
        "hcm_token",
        data.token
      );

      setUser(data.user);

      navigate(
        "/dashboard"
      );
    } catch (error) {
      setError(
        error.response?.data
          ?.message ||
          "Setup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Checking setup...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">

      <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl">

        <div className="mb-8">

          <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            First Run Setup
          </span>

          <h1 className="mt-5 text-3xl font-bold">
            Setup your company
          </h1>

          <p className="mt-2 text-slate-500">
            Create your company and first Admin account.
          </p>

        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 sm:grid-cols-2"
        >

          <div>
            <label className="mb-2 block text-sm font-medium">
              Company Name
            </label>

            <input
              required
              name="companyName"
              value={
                form.companyName
              }
              onChange={
                handleChange
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Company Email
            </label>

            <input
              type="email"
              name="companyEmail"
              value={
                form.companyEmail
              }
              onChange={
                handleChange
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Admin Name
            </label>

            <input
              required
              name="adminName"
              value={
                form.adminName
              }
              onChange={
                handleChange
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Admin Email
            </label>

            <input
              required
              type="email"
              name="adminEmail"
              value={
                form.adminEmail
              }
              onChange={
                handleChange
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-teal-600"
            />
          </div>

          <div className="sm:col-span-2">

            <label className="mb-2 block text-sm font-medium">
              Admin Password
            </label>

            <input
              required
              minLength={6}
              type="password"
              name="adminPassword"
              value={
                form.adminPassword
              }
              onChange={
                handleChange
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-teal-600"
            />

          </div>

          <div className="sm:col-span-2">

            <button
              disabled={loading}
              className="w-full rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Company & Admin"}
            </button>

          </div>

        </form>

      </section>

    </main>
  );
};

export default Setup;