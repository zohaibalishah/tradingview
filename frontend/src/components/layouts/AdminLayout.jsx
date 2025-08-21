import React, { useState } from 'react';
import {
  FaChartLine,
  FaUsers,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaSearch,
  FaShieldAlt,
  FaCrown,
  FaUser,
  FaWifi,
  FaDollarSign,
  FaArrowDown,
} from 'react-icons/fa';
import { useUser } from '../../services/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import UserDropdown from '../UserDropdown';

export default function AdminLayout({ children, title = "Admin Dashboard" }) {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminNavigationItems = [
    { id: 'overview', label: 'Overview', icon: FaChartBar, href: '/admin' },
    { id: 'trades', label: 'All Trades', icon: FaChartLine, href: '/admin/trades' },
    { id: 'spreads', label: 'Spread Management', icon: FaCog, href: '/admin/spreads' },
    { id: 'categories', label: 'Categories', icon: FaCog, href: '/admin/categories' },
    { id: 'symbols', label: 'Symbols', icon: FaChartLine, href: '/admin/symbols' },
    { id: 'subscriptions', label: 'Subscriptions', icon: FaWifi, href: '/admin/subscriptions' },
    { id: 'deposits', label: 'Deposits', icon: FaDollarSign, href: '/admin/deposits' },
    { id: 'withdrawals', label: 'Withdrawals', icon: FaArrowDown, href: '/admin/withdrawals' },
    { id: 'users', label: 'Users', icon: FaUsers, href: '/admin/users' },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Fixed Sidebar - Full Screen */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <FaShieldAlt className="text-white text-sm" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FaTimes className="text-gray-600" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <nav className="space-y-2">
              {adminNavigationItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                      isActive 
                        ? 'bg-purple-100 text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:shadow-sm'
                    }`}
                  >
                    <item.icon className={`text-lg ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaShieldAlt className="text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900">Admin Panel</h3>
              </div>
              <p className="text-xs text-gray-600 mb-3">Full administrative control over the platform</p>
              <div className="text-xs text-gray-500">
                <p>Role: {user?.role}</p>
                <p>Status: {user?.accountStatus}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Fixed Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-40">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            {/* Left side - Menu button and title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <FaTimes className="text-gray-600" /> : <FaBars className="text-gray-600" />}
              </button>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              </div>
            </div>

            {/* Right side - Search, notifications, user */}
            <div className="flex items-center gap-3">
              {/* Search - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <FaSearch className="text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm text-gray-600 placeholder-gray-400 w-48"
                />
              </div>

              {/* Socket Status */}

              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <FaBell className="text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User dropdown */}
              <UserDropdown />
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
