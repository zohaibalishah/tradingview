import { configureAuth } from "react-query-auth";
import api from "../utils/api";
import { disconnectSocket, checkAndReconnectSocket } from "./socket";

// Enhanced session management
const setSession = (token, user) => {
  try {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("sessionStart", Date.now().toString());
    
    // Set token expiration tracking
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      localStorage.setItem("tokenExpiresAt", expiresAt.toString());
    }
  } catch (error) {
    console.error('Error setting session:', error);
  }
};

const clearSession = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("sessionStart");
    localStorage.removeItem("tokenExpiresAt");
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

// Check if token is expired
const isTokenExpired = () => {
  try {
    const expiresAt = localStorage.getItem("tokenExpiresAt");
    if (!expiresAt) return true;
    
    return Date.now() > parseInt(expiresAt);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Get user with enhanced error handling and token validation
const userFn = async () => {
  try {
    const token = localStorage.getItem("token");
    
    // If no token exists, user is not authenticated
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    if (isTokenExpired()) {
      clearSession();
      return null;
    }
    
    // Always fetch fresh user data from server to get latest wallet balance
    const res = await api.get("/auth/me");
    
    if (res.data.status === 1 && res.data.data) {
      const user = res.data.data;
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } else {
      clearSession();
      return null;
    }
  } catch (error) {
    console.error("Error in userFn:", error);
    // Clear session on any error
    clearSession();
    return null;
  }
};

// Enhanced login with validation
const loginFn = async (credentials) => {
  try {
    // Validate credentials
    if (!credentials.email || !credentials.password) {
      throw new Error("Email and password are required");
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new Error("Please enter a valid email address");
    }
    const res = await api.post("/auth/login", credentials);
    
    if (res.data.status === 1 && res.data.user) {
      const { user } = res.data;
      setSession(user.token, user);
      // Reconnect socket immediately after successful login
      console.log('[Auth] Login successful, reconnecting socket...');
      setTimeout(() => {
        checkAndReconnectSocket();
      }, 50); // Reduced delay for faster connection
      
      return res.data;
    } else {
      throw new Error(res.data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Enhanced register with validation
const registerFn = async (credentials) => {
  try {
    // Validate credentials
    if (!credentials.email || !credentials.password || !credentials.confirmPassword) {
      throw new Error("All fields are required");
    }
    
    if (credentials.password !== credentials.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    
    // Password strength validation - more reasonable requirements
    if (credentials.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    
    // Optional: Check for at least one letter and one number
    // const hasLetter = /[a-zA-Z]/.test(credentials.password);
    // const hasNumber = /\d/.test(credentials.password);
    
    // if (!hasLetter || !hasNumber) {
    //   throw new Error("Password must contain at least one letter and one number");
    // }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new Error("Please enter a valid email address");
    }
    
    console.log("Register credentials:", { email: credentials.email, hasPassword: !!credentials.password });
    const res = await api.post("/auth/signup", credentials);
    
    if (res.data.status === 1 && res.data.token) {
      // const user = {
      //   id: res.data.id,
      //   email: res.data.email,
      //   name: res.data.name,
      //   token: res.data.token
      // };
      // setSession(res.data.token, user);
      console.log('Registration successful');
      return res.data;
    } else {
      throw new Error(res.data.message || "Registration failed");
    }
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
};

// Enhanced logout with API call
const logoutFn = async () => {
  try {
    // Disconnect socket first
    disconnectSocket();
    // Call logout API to invalidate token on server
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout API error:", error);
  } finally {
    clearSession();
  }
};

// Token refresh function
const refreshToken = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No token to refresh");
    }
    
    const res = await api.post("/auth/refresh", { token });
    
    if (res.data.status === 1 && res.data.token) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.token = res.data.token;
      setSession(res.data.token, user);
      console.log("Token refreshed successfully");
      return res.data.token;
    } else {
      throw new Error("Token refresh failed");
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    clearSession();
    throw error;
  }
};

// Session monitoring
const startSessionMonitoring = () => {
  // Check token expiration every minute
  setInterval(() => {
    if (isTokenExpired()) {
      console.log("Token expired during monitoring - clearing session");
      clearSession();
      window.location.href = '/login';
    }
  }, 60000);
  
  // Check session age every 5 minutes
  setInterval(() => {
    const sessionStart = localStorage.getItem("sessionStart");
    if (sessionStart) {
      const sessionAge = Date.now() - parseInt(sessionStart);
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (sessionAge > maxSessionAge) {
        console.log("Session expired - clearing session");
        clearSession();
        window.location.href = '/login';
      }
    }
  }, 300000);
};

// Start session monitoring when auth is configured
startSessionMonitoring();

export const { useUser, useLogin, useRegister, useLogout } = configureAuth({
  userFn,
  loginFn,
  registerFn,
  logoutFn,
});

// Utility functions for role checking
export const isAdmin = (user) => {
  return user && user.role === 'SUPER ADMIN';
};

export const isUser = (user) => {
  return user && user.role === 'USER';
};

export const getUserRole = (user) => {
  return user ? user.role : null;
};

// Function to manually refresh user data
export const refreshUserData = async () => {
  try {
    const res = await api.get("/auth/me");
    if (res.data.status === 1 && res.data.data) {
      const user = res.data.data;
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error refreshing user data:", error);
    return null;
  }
};

// Export additional utilities
export { refreshToken, isTokenExpired, clearSession };
