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
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Telegram Alerts</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Configure real-time push alerts on your phone</p>
          </div>
        </div>

        {statusMessage && (
          <div className={`p-3.5 rounded-xl mb-4 text-xs font-semibold flex items-start gap-2.5 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/5 text-emerald-300 border border-emerald-500/10' 
              : 'bg-rose-500/5 text-rose-300 border border-rose-500/10'
          }`}>
            {statusMessage.type === 'success' 
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> 
              : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            }
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Telegram Bot Token
            </label>
            <input
              type="password"
              placeholder="e.g. 123456789:ABCdefGh..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
            />
            <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
              Create your bot token via{' '}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                @BotFather
              </a>
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Telegram Chat ID
            </label>
            <input
              type="text"
              placeholder="e.g. 987654321"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
            />
            <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
              Get your personal chat ID via{' '}
              <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                @userinfobot
              </a>
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 mt-6 border-t border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
              Saved in PostgreSQL DB
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Testing...' : 'Test & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TelegramSettingsModal;
