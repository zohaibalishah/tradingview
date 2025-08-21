import { Navigate } from "react-router-dom";
import { useUser } from "../services/auth";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AdminProtectedRoute({ children }) {
  const { data: user, isLoading, error } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-700 flex items-center justify-center">
        <div className="auth-container text-center">
          <LoadingSpinner size="w-8 h-8" color="border-primary-500" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin role
  if (user.role !== 'SUPER ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
