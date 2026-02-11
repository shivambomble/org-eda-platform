import React, { useState } from 'react';
import { X, AlertTriangle, Mail, Send } from 'lucide-react';

interface InventoryAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  datasetId?: string;
  onAlertSent: () => void;
}

const InventoryAlertModal: React.FC<InventoryAlertModalProps> = ({
  isOpen,
  onClose,
  projectId,
  datasetId,
  onAlertSent
}) => {
  const [formData, setFormData] = useState({
    alertType: 'LOW_STOCK',
    priority: 'MEDIUM',
    title: '',
    message: '',
    inventoryManagerEmail: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const alertTypes = [
    { value: 'LOW_STOCK', label: '📉 Low Stock', description: 'Items running low on inventory' },
    { value: 'OUT_OF_STOCK', label: '🚫 Out of Stock', description: 'Items completely out of stock' },
    { value: 'OVERSTOCK', label: '📈 Overstock', description: 'Items with excess inventory' },
    { value: 'QUALITY_ISSUE', label: '⚠️ Quality Issue', description: 'Data quality or inventory concerns' },
    { value: 'CUSTOM', label: '✏️ Custom Alert', description: 'Custom inventory concern' }
  ];

  const priorities = [
    { value: 'LOW', label: 'Low', color: 'text-green-600' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/inventory-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          datasetId,
          ...formData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send alert');
      }

      onAlertSent();
      onClose();
      
      // Reset form
      setFormData({
        alertType: 'LOW_STOCK',
        priority: 'MEDIUM',
        title: '',
        message: '',
        inventoryManagerEmail: ''
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAlertTypeChange = (alertType: string) => {
    const selectedType = alertTypes.find(type => type.value === alertType);
    setFormData(prev => ({
      ...prev,
      alertType,
      title: prev.title || selectedType?.label.replace(/^[^\s]+ /, '') || ''
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-600 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white">
              Send Inventory Alert
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Alert Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-3">
              Alert Type
            </label>
            <div className="grid grid-cols-1 gap-3">
              {alertTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.alertType === type.value
                      ? 'border-blue-500/50 bg-blue-600/20'
                      : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="alertType"
                    value={type.value}
                    checked={formData.alertType === type.value}
                    onChange={(e) => handleAlertTypeChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">{type.label}</div>
                    <div className="text-sm text-slate-400">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Priority Level
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Alert Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Detailed Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Describe the inventory concern in detail. Include specific items, quantities, or trends you've observed..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              required
            />
          </div>

          {/* Inventory Manager Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Inventory Manager Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="email"
                value={formData.inventoryManagerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, inventoryManagerEmail: e.target.value }))}
                placeholder="manager@company.com"
                className="w-full pl-10 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <p className="text-sm text-slate-400 mt-1">
              The person responsible for inventory management will receive this alert via email
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition-all disabled:opacity-50 font-semibold btn-hover"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Sending...' : 'Send Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryAlertModal;