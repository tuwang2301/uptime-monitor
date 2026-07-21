import React, { useState, useEffect } from 'react';
import { X, Send, ShieldCheck, AlertCircle, CheckCircle2, Bot } from 'lucide-react';
import axios from 'axios';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramSettingsModal: React.FC<TelegramSettingsModalProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/settings/telegram').then((res) => {
        if (res.data.success) {
          setToken(res.data.data.token || '');
          setChatId(res.data.data.chatId || '');
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await axios.post('/api/settings/telegram/test', { token, chatId });
      if (res.data.success) {
        setStatusMessage({ type: 'success', text: res.data.message });
      } else {
        setStatusMessage({ type: 'error', text: res.data.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Network request error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Telegram Alert Integration</h2>
            <p className="text-xs text-gray-400">Receive instant push alerts on your phone when sites go down</p>
          </div>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl mb-4 text-xs font-medium flex items-start gap-2.5 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Telegram Bot Token
            </label>
            <input
              type="password"
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700/70 rounded-xl text-white font-mono text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <p className="text-[11px] text-gray-400 mt-1">Get your token by chatting with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 underline">@BotFather</a> on Telegram</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Telegram Chat ID
            </label>
            <input
              type="text"
              placeholder="e.g. 987654321"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700/70 rounded-xl text-white font-mono text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <p className="text-[11px] text-gray-400 mt-1">Get your Chat ID from <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-indigo-400 underline">@userinfobot</a></p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Credentials stored locally in SQLite
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Testing Connection...' : 'Test & Save Integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
