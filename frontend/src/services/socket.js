// src/utils/socket.js

import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:4000'); // Replace with your actual backend URL
    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket.id);
    });
    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
