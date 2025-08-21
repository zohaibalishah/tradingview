import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch } from 'react-icons/fa';
import api from '../../utils/api';
import AdminLayout from '../../components/layouts/AdminLayout';

export default function SpreadManagement() {
  const [spreads, setSpreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSpread, setEditingSpread] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    buySpread: '',
    sellSpread: '',
    isActive: true
  });

  useEffect(() => {
    fetchSpreads();
  }, []);

  const fetchSpreads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/spreads');
      if (response.data.status === 1) {
        setSpreads(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching spreads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpread = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/spreads', formData);
      if (response.data.status === 1) {
        setShowAddForm(false);
        setFormData({ symbol: '', buySpread: '', sellSpread: '', isActive: true });
        fetchSpreads();
      }
    } catch (error) {
      console.error('Error adding spread:', error);
    }
  };

  const handleUpdateSpread = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/admin/spreads/${editingSpread.id}`, formData);
      if (response.data.status === 1) {
        setEditingSpread(null);
        setFormData({ symbol: '', buySpread: '', sellSpread: '', isActive: true });
        fetchSpreads();
      }
    } catch (error) {
      console.error('Error updating spread:', error);
    }
  };

  const handleDeleteSpread = async (spreadId) => {
    if (window.confirm('Are you sure you want to delete this spread?')) {
      try {
        const response = await api.delete(`/admin/spreads/${spreadId}`);
        if (response.data.status === 1) {
          fetchSpreads();
        }
      } catch (error) {
        console.error('Error deleting spread:', error);
      }
    }
  };

  const startEditing = (spread) => {
    setEditingSpread(spread);
    setFormData({
      symbol: spread.symbol,
      buySpread: spread.buySpread,
      sellSpread: spread.sellSpread,
      isActive: spread.isActive
    });
  };

  const cancelEditing = () => {
    setEditingSpread(null);
    setFormData({ symbol: '', buySpread: '', sellSpread: '', isActive: true });
  };

  const filteredSpreads = spreads.filter(spread =>
    spread.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const SpreadForm = ({ onSubmit, onCancel, title, submitText }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., BTCUSD"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={true}>Active</option>
              <option value={false}>Inactive</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buy Spread (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.buySpread}
              onChange={(e) => setFormData({ ...formData, buySpread: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sell Spread (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellSpread}
              onChange={(e) => setFormData({ ...formData, sellSpread: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.50"
              required
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FaTimes className="h-4 w-4 inline mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FaSave className="h-4 w-4 inline mr-2" />
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="Spread Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Spread Management</h1>
            <p className="text-gray-600 mt-1">Configure trading spreads for different symbols</p>
          </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FaPlus className="h-4 w-4 mr-2" />
          Add Spread
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingSpread) && (
        <SpreadForm
          onSubmit={editingSpread ? handleUpdateSpread : handleAddSpread}
          onCancel={editingSpread ? cancelEditing : () => setShowAddForm(false)}
          title={editingSpread ? 'Edit Spread' : 'Add New Spread'}
          submitText={editingSpread ? 'Update Spread' : 'Add Spread'}
        />
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search spreads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Spreads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Spread Configuration</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buy Spread</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Spread</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSpreads.map((spread) => (
                <tr key={spread.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {spread.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {spread.buySpread}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {spread.sellSpread}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      spread.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {spread.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(spread.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditing(spread)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSpread(spread.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSpreads.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No spreads found</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Spreads</h3>
          <p className="text-3xl font-bold text-primary-600">{spreads.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Active Spreads</h3>
          <p className="text-3xl font-bold text-green-600">
            {spreads.filter(s => s.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Average Spread</h3>
          <p className="text-3xl font-bold text-purple-600">
            {spreads.length > 0 
              ? ((spreads.reduce((sum, s) => sum + parseFloat(s.buySpread) + parseFloat(s.sellSpread), 0) / (spreads.length * 2)) || 0).toFixed(2)
              : '0.00'
            }%
          </p>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
