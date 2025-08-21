import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with better configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Retry configuration
  retry: 3,
  retryDelay: 1000,
});

// Request interceptor with enhanced logging and token handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    // Add request ID for tracking
    config.requestId = Math.random().toString(36).substring(7);

    // console.log(`[API Request] ${config.requestId} - ${config.method?.toUpperCase()} ${config.url}`, {
    //   hasToken: !!token,
    //   tokenLength: token?.length,
    //   data: config.data ? 'Present' : 'None',
    // });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add timestamp for request tracking
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    // console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling and retry logic
api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;

    console.log(
      `[API Response] ${response.config.requestId} - ${response.config.method?.toUpperCase()} ${response.config.url}`,
      {
        status: response.status,
        duration: `${duration}ms`,
        dataSize: response.data,
      }
    );

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = originalRequest?.metadata
      ? new Date() - originalRequest.metadata.startTime
      : 'Unknown';

    // console.error(`[API Error] ${originalRequest?.requestId} - ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   duration: `${duration}ms`,
    //   data: error.response?.data,
    //   message: error.message,
    // });

    // Handle retry logic
    if (
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.retry > 0
    ) {
      originalRequest._retry = true;
      originalRequest.retry--;

      // Exponential backoff
      const delay =
        originalRequest.retryDelay * Math.pow(2, 3 - originalRequest.retry);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return api(originalRequest);
    }

    if (error.response) {
      const { status, data } = error.response;

      // Handle specific HTTP status codes
      switch (status) {
        case 400:
          toast.error(data?.message || 'Bad request. Please check your input.');
          break;

        case 401:
          console.warn(
            '[API] 401 Unauthorized - clearing session and redirecting to login'
          );
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;

        case 403:
          toast.error(
            'Access denied. You do not have permission to perform this action.'
          );
          break;

        case 404:
          toast.error(
            'Resource not found. Please check the URL and try again.'
          );
          break;

        case 409:
          toast.error(
            data?.message || 'Conflict. The resource already exists.'
          );
          break;

        case 422:
          toast.error(
            data?.message || 'Validation error. Please check your input.'
          );
          break;

        case 429:
          const message =
            data?.message || 'Too many requests. Please try again later.';
          const retryAfter = data?.retryAfter || 60;

          toast.error(`${message} Retry in ${retryAfter} seconds.`, {
            duration: 8000,
            position: 'bottom-center',
          });

          console.warn('[API] Rate limit exceeded:', data);
          break;

        case 500:
          toast.error(
            'Server error. Please try again later or contact support.'
          );
          break;

        case 502:
        case 503:
        case 504:
          toast.error(
            'Service temporarily unavailable. Please try again later.'
          );
          break;

        default:
          toast.error(`Unexpected error (${status}). Please try again.`);
      }
    } else if (error.request) {
      // Network error
      console.error('[API] Network error:', error.request);
      toast.error('Network error. Please check your connection and try again.');
    } else {
      // Other error
      console.error('[API] Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

// Utility functions for common API operations
export const apiUtils = {
  // GET request with error handling
  async get(url, config = {}) {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request with error handling
  async post(url, data = {}, config = {}) {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request with error handling
  async put(url, data = {}, config = {}) {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request with error handling
  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload file with progress tracking
  async upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;
