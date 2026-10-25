import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",

  headers: {
    "Content-Type":
      "application/json"
  }
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "hcm_token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error.response?.status === 401
    ) {
      localStorage.removeItem(
        "hcm_token"
      );
    }

    return Promise.reject(error);
  }
);

export default api;