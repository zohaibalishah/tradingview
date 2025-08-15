import { configureAuth } from "react-query-auth";
import api from "../utils/api";

// Helper functions
const setSession = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// Get user (first from storage, fallback to API)
const userFn = async () => {
  const savedUser = localStorage.getItem("user");
  if (savedUser) return JSON.parse(savedUser);
  const res = await api.get("/auth/me");
  const user = res.data.data.user;
  localStorage.setItem("user", JSON.stringify(user));
  return user;
};

// Login
const loginFn = async (credentials) => {
  console.log(credentials)

  const res = await api.post("/auth/login", credentials);
  setSession(res.data.user.token, res.data.user);
  return res.data;
};

// Register
const registerFn = async (credentials) => {
  const res = await api.post("/auth/signup", credentials);
  setSession(res.data.token, res.data);
  return res.data;
};

// Logout
const logoutFn = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout API error:", error);
  } finally {
    clearSession();
  }
};

export const { useUser, useLogin, useRegister, useLogout } = configureAuth({
  userFn,
  loginFn,
  registerFn,
  logoutFn,
});
