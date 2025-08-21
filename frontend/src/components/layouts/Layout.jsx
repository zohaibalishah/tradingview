import React, { useState } from 'react';
import {
  FaChartLine,
  FaStar,
  FaHistory,
  FaWallet,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaSearch,
  FaHome,
  FaChartBar,
  FaCrown,
  FaShieldAlt,
} from 'react-icons/fa';
import { useUser } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import UserDropdown from '../UserDropdown';

export default function Layout({ children, title = "Dashboard" }) {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: FaHome, active: true },
    { id: 'trading', label: 'Trading', icon: FaChartBar },
    { id: 'favorites', label: 'Favorites', icon: FaStar },
    { id: 'history', label: 'History', icon: FaHistory },
    { id: 'wallet', label: 'Wallet', icon: FaWallet },
    { id: 'settings', label: 'Settings', icon: FaCog },
    { id: 'profile', label: 'Profile', icon: FaUser },
  ];

  // Add admin link if user is admin
  const adminNavigationItems = [
    ...navigationItems,
    ...(user?.role === 'SUPER ADMIN' ? [{ id: 'admin', label: 'Admin', icon: FaShieldAlt, href: '/admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
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
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <FaChartLine className="text-white text-sm" />
              </div>
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

      <div className="flex">
        {/* <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 px-4 py-6">
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false); // Close sidebar on mobile after selection
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    <item.icon className={`text-lg ${activeTab === item.id ? 'text-primary-600' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaCrown className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Pro Features</h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">Upgrade to unlock advanced trading tools and analytics</p>
                <button className="w-full bg-primary-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors">
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </aside> */}

        {/* Main Content */}
        <main className="flex-1 p-2 lg:p-2">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {/* {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )} */}
    </div>
  );
}
