import React, { useState, useEffect } from 'react';
import {
  FaPlus, FaCheck, FaTimes, FaTrash, FaEye, FaSearch, FaFilter, FaDownload, FaSync,
  FaDollarSign, FaUser, FaCalendar, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaExclamationTriangle, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import api from '../../utils/api';

export default function FinancialManagement({ 
  type = 'deposit', // 'deposit' or 'withdrawal'
  title = 'Financial Management',
  description = 'Manage financial transactions'
}) {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalAmount: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    page: 1,
    limit: 20
  });

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    currency: 'USD',
    type: type,
    description: '',
    notes: ''
  });

  const API_BASE = `/admin/${type === 'deposit' ? 'deposits' : 'withdrawals'}`;

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`${API_BASE}?${params}`);
      if (response.data.status === 1) {
        setRequests(response.data.data.requests || []);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error(`Error fetching ${type} requests:`, error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for dropdown
  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users', {
        params: { limit: 100,}
      });
      if (response.data.status === 1) {
        setUsers(response.data.data.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await api.get(`${API_BASE}/stats/summary`);
      if (response.data.status === 1) {
        setStats(response.data.data.summary || {});
      } else {
        setStats({});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({});
    }
  };

  // Initialize data
  useEffect(() => {
    fetchRequests();
    fetchUsers();
    fetchStats();
  }, [filters, type]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await api.post(`${API_BASE}/create`, formData);
      if (response.data.status === 1) {
        setShowCreateForm(false);
        setFormData({
          userId: '',
          amount: '',
          currency: 'USD',
          type: type,
          description: '',
          notes: ''
        });
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error(`Error creating ${type} request:`, error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle request approval
  const handleApprove = async (id, notes = '') => {
    try {
      const response = await api.put(`${API_BASE}/${id}/approve`, { notes });
      if (response.data.status === 1) {
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error(`Error approving ${type} request:`, error);
    }
  };

  // Handle request rejection
  const handleReject = async (id, notes = '') => {
    try {
      const response = await api.put(`${API_BASE}/${id}/reject`, { notes });
      if (response.data.status === 1) {
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error(`Error rejecting ${type} request:`, error);
    }
  };

  // Handle request deletion
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type} request?`)) return;
    
    try {
      const response = await api.delete(`${API_BASE}/${id}`);
      if (response.data.status === 1) {
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error(`Error deleting ${type} request:`, error);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: FaHourglassHalf },
      approved: { color: 'bg-green-100 text-green-800', icon: FaCheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: FaTimesCircle },
      completed: { color: 'bg-blue-100 text-blue-800', icon: FaCheckCircle }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={10} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Get type badge
  const getTypeBadge = (type) => {
    const badges = {
      deposit: { color: 'bg-blue-100 text-blue-800' },
      withdrawal: { color: 'bg-red-100 text-red-800' },
      bonus: { color: 'bg-purple-100 text-purple-800' },
      refund: { color: 'bg-orange-100 text-orange-800' },
      adjustment: { color: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[type] || badges.deposit;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const isDeposit = type === 'deposit';
  const actionIcon = isDeposit ? FaArrowUp : FaArrowDown;
  const actionColor = isDeposit ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FaPlus size={14} />
          Create {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRequests || 0}</p>
            </div>
            <FaDollarSign className="text-blue-600 text-xl" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">${(stats.totalAmount || 0).toFixed(2)}</p>
            </div>
            <FaDollarSign className="text-green-600 text-xl" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests || 0}</p>
            </div>
            <FaClock className="text-yellow-600 text-xl" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approvedRequests || 0}</p>
            </div>
            <FaCheckCircle className="text-green-600 text-xl" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <input
              type="text"
              placeholder={`Search by reference, user...`}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            <option value="bonus">Bonus</option>
            <option value="refund">Refund</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <button
            onClick={() => setFilters({ status: '', type: '', search: '', page: 1, limit: 20 })}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FaSync size={16} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No {type} requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{request.reference}</div>
                      {request.description && (
                        <div className="text-xs text-gray-500">{request.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2" size={12} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.user?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">{request.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        ${parseFloat(request.amount).toFixed(2)} {request.currency}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(request.type)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <FaCalendar className="text-gray-400 mr-2" size={12} />
                        <div className="text-sm text-gray-900">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <FaEye size={14} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <FaCheck size={14} />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <FaTimes size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create {type.charAt(0).toUpperCase() + type.slice(1)} Request</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select User</option>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No users available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  <option value="bonus">Bonus</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{type.charAt(0).toUpperCase() + type.slice(1)} Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <p className="text-sm text-gray-900">{selectedRequest.reference}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-sm text-gray-900">
                    ${parseFloat(selectedRequest.amount).toFixed(2)} {selectedRequest.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <div className="mt-1">{getTypeBadge(selectedRequest.type)}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <p className="text-sm text-gray-900">
                  {selectedRequest.user?.name|| 'Unknown'} ({selectedRequest.user?.email})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <p className="text-sm text-gray-900">
                  {selectedRequest.admin?.name ||  'Unknown'} ({selectedRequest.admin?.email})
                </p>
              </div>
              {selectedRequest.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedRequest.description}</p>
                </div>
              )}
              {selectedRequest.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900">{selectedRequest.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedRequest.processedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Processed At</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedRequest.processedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              {selectedRequest.processedByUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Processed By</label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.processedByUser.name || 'Unknown'} ({selectedRequest.processedByUser.email})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
