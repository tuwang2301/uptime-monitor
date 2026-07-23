import React, { useState, useEffect } from 'react';
import { X, Save, Edit } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/5 text-indigo-400 rounded-xl border border-indigo-500/10">
            <Edit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Edit Monitor</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Update configuration settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Service Name</label>
            <input
              type="text"
              placeholder="e.g. My Production API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Target Endpoint URL</label>
            <input
              type="url"
              placeholder="https://api.mywebsite.com/health"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Check Interval</label>
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-zinc-600 transition"
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 60 seconds</option>
              <option value={300}>Every 5 minutes</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl bg-transparent hover:bg-zinc-800/50 transition border border-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EditMonitorModal;
