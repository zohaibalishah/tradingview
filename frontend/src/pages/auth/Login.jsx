import { useState, useEffect } from 'react';
import { useLogin, useUser } from '../../services/auth';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import {
  EmailIcon,
  PasswordIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
} from '../../components/Icons';
import { FaCrown, FaUser } from 'react-icons/fa';

export default function LoginPage() {
  const login = useLogin();
  const { data: user, isLoading: userLoading } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !userLoading) {
      // Redirect based on user role
      if (user.role === 'SUPER ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userLoading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear any existing errors
    setErrors({});
    setGeneralError('');

    // Basic validation
    if (!form.email || !form.password) {
      setErrors({
        email: !form.email ? 'Email is required' : '',
        password: !form.password ? 'Password is required' : '',
      });
      return;
    }

    // Prevent multiple submissions
    if (login.isLoading) {
      return;
    }

    login.mutate(form, {
      onSuccess: (data) => {
        toast.success("Welcome back! You've been logged in successfully.");
        // Redirect based on user role
        if (data.user && data.user.role === 'SUPER ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      },
      onError: (err) => {
        console.error('Login error:', err);
        
        // Handle different types of errors
        let errorMessage = 'Login failed. Please check your credentials.';
        let fieldErrors = {};

        if (err?.response?.data) {
          const responseData = err.response.data;
          
          // Handle specific error messages
          if (responseData.message) {
            errorMessage = responseData.message;
          }
          
          // Handle field-specific errors
          if (responseData.errors) {
            fieldErrors = responseData.errors;
          }
          
          // Handle common error cases
          if (responseData.status === 0) {
            if (responseData.message?.includes('Invalid password')) {
              errorMessage = 'Invalid password. Please try again.';
              fieldErrors.password = 'Invalid password';
            } else if (responseData.message?.includes('Account not found')) {
              errorMessage = 'Account not found. Please check your email.';
              fieldErrors.email = 'Account not found';
            } else if (responseData.message?.includes('Email not found')) {
              errorMessage = 'Email not found. Please check your email address.';
              fieldErrors.email = 'Email not found';
            }
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }

        // Show toast error
        toast.error(errorMessage);
        
        // Set general error
        setGeneralError(errorMessage);
        
        // Set field errors
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
      },
    });
  };

  // Quick admin login function
  const handleQuickAdminLogin = () => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to login as Super Admin?\n\nThis will use the default admin credentials.')) {
      return;
    }
    
    // Set admin credentials
    setForm({
      email: 'admin@gmail.com',
      password: 'Admin@123'
    });
    
    // Clear any existing errors
    setErrors({});
    setGeneralError('');
    
    // Trigger login
    login.mutate({
      email: 'admin@gmail.com',
      password: 'Admin@123'
    }, {
      onSuccess: (data) => {
        toast.success("Welcome Admin! You've been logged in successfully.");
        navigate('/admin');
      },
      onError: (err) => {
        console.error('Quick admin login error:', err);
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Quick admin login failed. Please check if admin account exists.';
        toast.error(errorMessage);
      },
    });
  };

  // Show loading if checking user authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Quick Admin Login Button */}
        <div className="text-center">
          <button
            onClick={handleQuickAdminLogin}
            disabled={login.isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            title="Quick login as Super Admin"
          >
            <FaCrown className="w-4 h-4" />
            {login.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Logging in...
              </div>
            ) : (
              'Quick Admin Login'
            )}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            One-click login as Super Admin
          </p>
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
              Show default admin credentials
            </summary>
            <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Default Admin Credentials:</strong>
              </p>
              <p className="text-xs text-gray-500 font-mono">
                Email: admin@gmail.com
              </p>
              <p className="text-xs text-gray-500 font-mono">
                Password: Admin@123
              </p>
            </div>
          </details>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-br from-primary-50 via-white to-secondary-50 text-gray-500">
              Or sign in manually
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-6 shadow-soft rounded-xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* General Error Message */}
            {(Object.keys(errors).length > 0 || generalError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertIcon className="h-5 w-5 text-red-400 mr-2" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Login Error</p>
                    {generalError && (
                      <p className="mt-1">{generalError}</p>
                    )}
                    {Object.keys(errors).length > 0 && (
                      <ul className="mt-1 list-disc list-inside">
                        {Object.values(errors).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EmailIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none relative block w-full pl-10 pr-3 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-colors ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleInputChange}
                />
              </div>
              {errors.email && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertIcon className="h-4 w-4 mr-1" />
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PasswordIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`appearance-none relative block w-full pl-10 pr-12 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-colors ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertIcon className="h-4 w-4 mr-1" />
                  {errors.password}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={login.isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={(e) => {
                  // Additional safety to prevent form submission if loading
                  if (login.isLoading) {
                    e.preventDefault();
                    return false;
                  }
                }}
              >
                {login.isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
