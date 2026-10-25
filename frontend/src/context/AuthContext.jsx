import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import api from "../api/axios";

const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children
}) => {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const token =
      localStorage.getItem(
        "hcm_token"
      );

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } =
        await api.get("/auth/me");

      setUser(data.user);
    } catch {
      localStorage.removeItem(
        "hcm_token"
      );

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email,
    password
  ) => {
    const { data } =
      await api.post(
        "/auth/login",
        {
          email,
          password
        }
      );

    localStorage.setItem(
      "hcm_token",
      data.token
    );

    setUser(data.user);

    return data;
  };

  const logout = () => {
    localStorage.removeItem(
      "hcm_token"
    );

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);