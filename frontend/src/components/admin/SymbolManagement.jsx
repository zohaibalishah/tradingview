import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaEyeSlash, 
  FaSearch,
  FaSort,
  FaFilter,
  FaStar,
  FaRegStar,
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

export default function SymbolManagement() {
  const [symbols, setSymbols] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    displayName: '',
    categoryId: '',
    type: 'commodity',
    baseCurrency: 'XAU',
    quoteCurrency: '',
    pipValue: 10.00,
    minLotSize: 0.01,
    maxLotSize: 100.00,
    defaultSpread: 0.64,
    minSpread: 0.50,
    maxSpread: 1.00,
    pricePrecision: 2,
    volumePrecision: 2,
    isActive: true,
    isTradable: true,
    isPopular: false,
    sortOrder: 0,
    externalSymbol: '',
    dataProvider: 'OANDA'
  });

  // Fetch symbols
  const fetchSymbols = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/symbols', {
        params: {
          page,
          limit: itemsPerPage,
          search: searchTerm,
          categoryId: categoryFilter,
          type: typeFilter,
          isActive: statusFilter,
          sortBy,
          sortOrder
        }
      });

      if (response.data.status === 1) {
        setSymbols(response.data.data.symbols);
        setTotalPages(response.data.data.pagination.totalPages);
        setTotalItems(response.data.data.pagination.totalItems);
        setCurrentPage(response.data.data.pagination.currentPage);
      }
    } catch (error) {
      console.error('Error fetching symbols:', error);
      toast.error('Failed to fetch symbols');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories for dropdown
  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/categories/active');
      if (response.data.status === 1) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSymbols();
  }, [searchTerm, categoryFilter, typeFilter, statusFilter, sortBy, sortOrder]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSymbol) {
        // Update existing symbol
        const response = await api.put(`/admin/symbols/${editingSymbol.id}`, formData);
        if (response.data.status === 1) {
          toast.success('Symbol updated successfully');
          setShowModal(false);
          fetchSymbols(currentPage);
        }
      } else {
        // Create new symbol
        const response = await api.post('/admin/symbols', formData);
        if (response.data.status === 1) {
          toast.success('Symbol created successfully');
          setShowModal(false);
          fetchSymbols(1); // Go to first page
        }
      }
    } catch (error) {
      console.error('Error saving symbol:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save symbol';
      toast.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (symbol) => {
    setEditingSymbol(symbol);
    setFormData({
      symbol: symbol.symbol,
      name: symbol.name,
      displayName: symbol.displayName || '',
      categoryId: symbol.categoryId,
      type: symbol.type,
      baseCurrency: symbol.baseCurrency || 'XAU',
      quoteCurrency: symbol.quoteCurrency || '',
      pipValue: symbol.pipValue,
      minLotSize: symbol.minLotSize,
      maxLotSize: symbol.maxLotSize,
      defaultSpread: symbol.defaultSpread,
      minSpread: symbol.minSpread,
      maxSpread: symbol.maxSpread,
      pricePrecision: symbol.pricePrecision,
      volumePrecision: symbol.volumePrecision,
      isActive: symbol.isActive,
      isTradable: symbol.isTradable,
      isPopular: symbol.isPopular,
      sortOrder: symbol.sortOrder,
      externalSymbol: symbol.externalSymbol || '',
      dataProvider: symbol.dataProvider || 'OANDA'
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (symbol) => {
    if (!window.confirm(`Are you sure you want to delete "${symbol.symbol}"?`)) {
      return;
    }

    try {
      const response = await api.delete(`/admin/symbols/${symbol.id}`);
      if (response.data.status === 1) {
        toast.success('Symbol deleted successfully');
        fetchSymbols(currentPage);
      }
    } catch (error) {
      console.error('Error deleting symbol:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete symbol';
      toast.error(errorMessage);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (symbol, field = 'isActive') => {
    try {
      const response = await api.patch(`/admin/symbols/${symbol.id}/toggle`, { field });
      if (response.data.status === 1) {
        const fieldName = field === 'isActive' ? 'active' : field === 'isTradable' ? 'tradable' : 'popular';
        toast.success(`Symbol ${fieldName} ${response.data.data[field] ? 'enabled' : 'disabled'} successfully`);
        fetchSymbols(currentPage);
      }
    } catch (error) {
      console.error('Error toggling symbol status:', error);
      toast.error('Failed to toggle symbol status');
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingSymbol(null);
    setFormData({
      symbol: '',
      name: '',
      displayName: '',
      categoryId: '',
      type: 'commodity',
      baseCurrency: 'XAU',
      quoteCurrency: '',
      pipValue: 10.00,
      minLotSize: 0.01,
      maxLotSize: 100.00,
      defaultSpread: 0.64,
      minSpread: 0.50,
      maxSpread: 1.00,
      pricePrecision: 2,
      volumePrecision: 2,
      isActive: true,
      isTradable: true,
      isPopular: false,
      sortOrder: 0,
      externalSymbol: '',
      dataProvider: 'OANDA'
    });
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  // Handle new symbol
  const handleNewSymbol = () => {
    resetForm();
    setShowModal(true);
  };

  // Pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchSymbols(page);
  };

  // Get status badge
  const getStatusBadge = (symbol) => {
    const badges = [];
    
    if (symbol.isActive) {
      badges.push(<span key="active" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>);
    } else {
      badges.push(<span key="inactive" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>);
    }
    
    if (symbol.isTradable) {
      badges.push(<span key="tradable" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Tradable</span>);
    }
    
    if (symbol.isPopular) {
      badges.push(<span key="popular" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Popular</span>);
    }
    
    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Symbol Management</h2>
          <p className="text-gray-600 mt-1">Manage trading symbols and their configurations</p>
        </div>
        <button
          onClick={handleNewSymbol}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FaPlus className="text-sm" />
          Add Symbol
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Types</option>
              <option value="forex">Forex</option>
              <option value="commodity">Commodity</option>
              <option value="crypto">Crypto</option>
              <option value="stock">Stock</option>
              <option value="index">Index</option>
            </select>
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="sortOrder">Sort Order</option>
              <option value="symbol">Symbol</option>
              <option value="name">Name</option>
              <option value="createdAt">Created Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaSort className={`text-sm ${sortOrder === 'DESC' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Symbols Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Symbol</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Category</th>
                    <th className="text-center py-3 px-6 font-medium text-gray-600">Type</th>
                    <th className="text-center py-3 px-6 font-medium text-gray-600">Status</th>
                    <th className="text-center py-3 px-6 font-medium text-gray-600">Spread</th>
                    <th className="text-center py-3 px-6 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((symbol) => (
                    <tr key={symbol.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-6">
                        <div>
                          <div className="font-medium text-gray-900">{symbol.symbol}</div>
                          <div className="text-xs text-gray-500">{symbol.baseCurrency}/{symbol.quoteCurrency}</div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div>
                          <div className="font-medium text-gray-900">{symbol.name}</div>
                          {symbol.displayName && (
                            <div className="text-xs text-gray-500">{symbol.displayName}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        {symbol.category && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: symbol.category.color }}
                            ></div>
                            <span className="text-gray-600">{symbol.category.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="text-center py-3 px-6">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {symbol.type}
                        </span>
                      </td>
                      <td className="text-center py-3 px-6">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {getStatusBadge(symbol)}
                        </div>
                      </td>
                      <td className="text-center py-3 px-6">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{symbol.defaultSpread}</div>
                          <div className="text-xs text-gray-500">
                            {symbol.minSpread} - {symbol.maxSpread}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-6">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(symbol, 'isActive')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title={symbol.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {symbol.isActive ? <FaToggleOn size={14} /> : <FaToggleOff size={14} />}
                          </button>
                          <button
                            onClick={() => handleToggleStatus(symbol, 'isTradable')}
                            className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                            title={symbol.isTradable ? 'Disable Trading' : 'Enable Trading'}
                          >
                            <FaEye size={14} />
                          </button>
                                                     <button
                             onClick={() => handleToggleStatus(symbol, 'isPopular')}
                             className="p-1 text-yellow-400 hover:text-yellow-600 transition-colors"
                             title={symbol.isPopular ? 'Remove from Popular' : 'Add to Popular'}
                           >
                             {symbol.isPopular ? <FaStar size={14} /> : <FaRegStar size={14} />}
                           </button>
                          <button
                            onClick={() => handleEdit(symbol)}
                            className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(symbol)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} symbols
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingSymbol ? 'Edit Symbol' : 'Add New Symbol'}
              </h3>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., XAUUSD"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Gold USD"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Gold / US Dollar"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="forex">Forex</option>
                    <option value="commodity">Commodity</option>
                    <option value="crypto">Crypto</option>
                    <option value="stock">Stock</option>
                    <option value="index">Index</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Currency *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.baseCurrency}
                    onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., XAU"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quote Currency *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.quoteCurrency}
                    onChange={(e) => setFormData({ ...formData, quoteCurrency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., USD"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pip Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pipValue}
                    onChange={(e) => setFormData({ ...formData, pipValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="10.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Lot Size
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minLotSize}
                    onChange={(e) => setFormData({ ...formData, minLotSize: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Lot Size
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxLotSize}
                    onChange={(e) => setFormData({ ...formData, maxLotSize: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="100.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Spread
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.defaultSpread}
                    onChange={(e) => setFormData({ ...formData, defaultSpread: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0.64"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Spread
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.minSpread}
                    onChange={(e) => setFormData({ ...formData, minSpread: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0.50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Spread
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.maxSpread}
                    onChange={(e) => setFormData({ ...formData, maxSpread: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="1.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Precision
                  </label>
                  <input
                    type="number"
                    value={formData.pricePrecision}
                    onChange={(e) => setFormData({ ...formData, pricePrecision: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume Precision
                  </label>
                  <input
                    type="number"
                    value={formData.volumePrecision}
                    onChange={(e) => setFormData({ ...formData, volumePrecision: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    External Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.externalSymbol}
                    onChange={(e) => setFormData({ ...formData, externalSymbol: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., OANDA:XAU_USD"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Provider
                  </label>
                  <input
                    type="text"
                    value={formData.dataProvider}
                    onChange={(e) => setFormData({ ...formData, dataProvider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., OANDA"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isTradable"
                    checked={formData.isTradable}
                    onChange={(e) => setFormData({ ...formData, isTradable: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isTradable" className="ml-2 block text-sm text-gray-700">
                    Tradable
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPopular"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPopular" className="ml-2 block text-sm text-gray-700">
                    Popular
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {editingSymbol ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
