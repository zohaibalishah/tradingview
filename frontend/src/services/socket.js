// src/services/socket.js

import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Get the backend URL from environment or use default
const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
};

// Get authentication token
const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Check if user is authenticated
const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

// Global error handler for authentication errors
const handleAuthError = () => {
  // Clear session and redirect to login
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

export const getSocket = () => {
  // If no authentication token, don't create socket
  if (!isAuthenticated()) {
    console.log('[Socket] No authentication token, cannot create socket');
    return null;
  }

  if (!socket) {
    const backendUrl = getBackendUrl();
    const token = getAuthToken();
    console.log('[Socket] Creating new socket connection to:', backendUrl);
    
    socket = io(backendUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully, socket ID:', socket.id);
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected, reason:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && isAuthenticated()) {
          reconnectAttempts++;
          console.log(`[Socket] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(() => {
            socket.connect();
          }, 1000 * reconnectAttempts); // Exponential backoff
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      
      // If it's an authentication error, handle it globally
      if (error.message && error.message.includes('Authentication error')) {
        disconnectSocket();
        handleAuthError();
        return;
      }
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && isAuthenticated()) {
        reconnectAttempts++;
        console.log(`[Socket] Connection failed, attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
          socket.connect();
        }, 1000 * reconnectAttempts);
      }
    });

    socket.on('error', (error) => {
      console.error('[Socket] Socket error:', error);
      
      // Handle authentication errors globally
      if (error.message && error.message.includes('Authentication error')) {
        handleAuthError();
      }
    });
  } else if (socket.disconnected && isAuthenticated()) {
    console.log('[Socket] Socket exists but disconnected, attempting to reconnect...');
    socket.connect();
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
};

export const reconnectSocket = () => {
  disconnectSocket();
  return getSocket();
};

export const isSocketConnected = () => {
  return socket && socket.connected;
};

export const getSocketId = () => {
  return socket ? socket.id : null;
};

// Function to check if socket needs reconnection (e.g., after login)
export const checkAndReconnectSocket = () => {
  console.log('[Socket] Checking authentication and socket state...');
  
  if (isAuthenticated()) {
    console.log('[Socket] User is authenticated, checking socket connection...');
    if (!socket || socket.disconnected) {
      console.log('[Socket] Socket not connected, reconnecting...');
      return reconnectSocket();
    } else {
      console.log('[Socket] Socket already connected');
    }
  } else {
    console.log('[Socket] User not authenticated, disconnecting socket...');
    // User not authenticated, disconnect socket
    disconnectSocket();
  }
  return socket;
};

// Listen for storage changes (logout/login)
window.addEventListener('storage', (event) => {
  if (event.key === 'token') {
    setTimeout(() => {
      checkAndReconnectSocket();
    }, 100);
  }
});
