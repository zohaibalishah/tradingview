import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { checkAndReconnectSocket } from "./services/socket";
import { useUser } from "./services/auth";

import LoginPage from "./pages/auth/Login";
import SignupPage from "./pages/auth/Signup";
import DashboardPage from "./pages/DashboardPage";
import AdminOverview from "./pages/admin/AdminOverview";
import AllTrades from "./pages/admin/AllTrades";
import SpreadManagement from "./pages/admin/SpreadManagement";
import Categories from "./pages/admin/Categories";
import Symbols from "./pages/admin/Symbols";
import Users from "./pages/admin/Users";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import DepositManagement from "./pages/admin/DepositManagement";
import WithdrawalManagement from "./pages/admin/WithdrawalManagement";
import ProtectedRoute from "./protectedRoute/ProtectedRoute";
import AdminProtectedRoute from "./protectedRoute/AdminProtectedRoute";
import { PriceProvider } from "./contexts/PriceContext";
import { AdminPriceProvider } from "./contexts/AdminPriceContext";
import MarketStatusPopup from "./components/MarketStatusPopup";

const queryClient = new QueryClient();

// Global socket authentication handler
const SocketAuthHandler = () => {
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      // Check and reconnect socket when user authentication state changes
      setTimeout(() => {
        checkAndReconnectSocket();
      }, 100);
    }
  }, [user, isLoading]);

  return null;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PriceProvider>
        <AdminPriceProvider>
          <SocketAuthHandler />
          <MarketStatusPopup />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminOverview />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/trades"
                element={
                  <AdminProtectedRoute>
                    <AllTrades />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/spreads"
                element={
                  <AdminProtectedRoute>
                    <SpreadManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <AdminProtectedRoute>
                    <Categories />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/symbols"
                element={
                  <AdminProtectedRoute>
                    <Symbols />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminProtectedRoute>
                    <Users />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <AdminProtectedRoute>
                    <SubscriptionManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/deposits"
                element={
                  <AdminProtectedRoute>
                    <DepositManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/withdrawals"
                element={
                  <AdminProtectedRoute>
                    <WithdrawalManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
              success: {
                style: {
                  background: '#10b981',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#10b981',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#ef4444',
                },
              },
            }}
          />
          <ReactQueryDevtools initialIsOpen={false} />
        </AdminPriceProvider>
      </PriceProvider>
    </QueryClientProvider>
  );
}
