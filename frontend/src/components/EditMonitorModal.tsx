import React, { useState, useEffect } from 'react';
import { X, Save, Edit, Globe } from 'lucide-react';
import axios from 'axios';

interface EditMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitor: {
    id: string;
    name: string;
    url: string;
    intervalSec: number;
  } | null;
  onUpdate: (id: string, name: string, url: string, intervalSec: number) => Promise<void>;
}

export const EditMonitorModal: React.FC<EditMonitorModalProps> = ({ isOpen, onClose, monitor, onUpdate }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalSec, setIntervalSec] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (monitor) {
      setName(monitor.name);
      setUrl(monitor.url);
      setIntervalSec(monitor.intervalSec);
    }
  }, [monitor, isOpen]);

  if (!isOpen || !monitor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setLoading(true);
    try {
      await onUpdate(monitor.id, name, url, intervalSec);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Edit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Edit Monitor</h2>
            <p className="text-sm text-gray-400">Update configuration settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Service Name</label>
            <input
              type="text"
              placeholder="e.g. My Production API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Target Endpoint URL</label>
            <input
              type="url"
              placeholder="https://api.mywebsite.com/health"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Check Interval (seconds)</label>
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 60 seconds</option>
              <option value={300}>Every 5 minutes</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-xl hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
