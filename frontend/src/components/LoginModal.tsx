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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dynamic Mode Switch Tabs */}
        <div className="flex border-b border-gray-800 mb-6">
          <button
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-semibold tracking-tight transition border-b-2 ${
              !isRegisterMode 
                ? 'text-white border-indigo-500' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-semibold tracking-tight transition border-b-2 ${
              isRegisterMode 
                ? 'text-white border-indigo-500' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 mb-3">
            {isRegisterMode ? <UserPlus className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isRegisterMode ? 'Join UptimePulse' : 'Access Control Panel'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {isRegisterMode ? 'Create a private sandbox for your monitors' : 'Enter your credentials to manage endpoints'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-xl mb-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading 
              ? (isRegisterMode ? 'Creating Account...' : 'Authenticating...') 
              : (isRegisterMode ? 'Register & Sign In' : 'Sign In')}
          </button>
        </form>

        {!isRegisterMode && (
          <p className="text-[10px] text-gray-500 text-center mt-5">
            Default credentials are <span className="font-semibold text-gray-400">admin / admin</span>
          </p>
        )}
      </div>
    </div>
  );
};
