import React, { useState } from 'react';
import { X, Lock, User, AlertCircle, UserPlus, KeyRound } from 'lucide-react';
import axios from 'axios';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, username: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isRegisterMode && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await axios.post(endpoint, { username, password });
      if (res.data.success) {
        onLoginSuccess(res.data.token, res.data.user.username);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        setError(res.data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed or server unreachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dynamic Mode Switch Tabs */}
        <div className="flex border-b border-zinc-800/60 mb-6 select-none">
          <button
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              !isRegisterMode 
                ? 'text-white border-zinc-100' 
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              isRegisterMode 
                ? 'text-white border-zinc-100' 
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="p-2.5 bg-indigo-500/5 text-indigo-400 rounded-xl border border-indigo-500/10 mb-3">
            {isRegisterMode ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            {isRegisterMode ? 'Create Account' : 'Admin Credentials'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 text-center leading-relaxed px-4">
            {isRegisterMode ? 'Set up a private session workspace' : 'Authenticate to customize monitors'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/5 text-rose-300 border border-rose-500/10 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs transition shadow-lg disabled:opacity-50"
          >
            {loading 
              ? (isRegisterMode ? 'Creating Account...' : 'Authenticating...') 
              : (isRegisterMode ? 'Register & Sign In' : 'Sign In')}
          </button>
        </form>

        {!isRegisterMode && (
          <p className="text-[10px] text-zinc-500 text-center mt-5">
            Default credentials are <span className="font-semibold text-zinc-400">admin / admin</span>
          </p>
        )}
      </div>
    </div>
  );
};
export default LoginModal;
