import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Server, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Zap, 
  Terminal, 
  Bot,
  ExternalLink,
  ShieldCheck,
  Globe,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Lock,
  LogOut,
  LogIn,
  Play,
  Pause,
  Edit2,
  Info,
  CheckCircle,
  X,
  Clock,
  Search,
  Settings
} from 'lucide-react';
import { StatusBadge } from './components/StatusBadge';
import { AddMonitorModal } from './components/AddMonitorModal';
import { TelegramSettingsModal } from './components/TelegramSettingsModal';
import { LoginModal } from './components/LoginModal';
import { EditMonitorModal } from './components/EditMonitorModal';
import { ConfirmModal } from './components/ConfirmModal';
import { SparklineChart } from './components/SparklineChart';

axios.defaults.baseURL = (import.meta as any).env.VITE_API_BASE_URL || '';

interface MonitorTarget {
  id: string;
  name: string;
  url: string;
  intervalSec: number;
  status: 'ONLINE' | 'DEGRADED' | 'DOWN' | 'PENDING' | 'PAUSED';
  statusCode: number | null;
  responseTimeMs: number;
  sslExpiryDays: number | null;
  lastChecked: string | null;
  uptimePct: number;
  isActive: boolean;
  history: Array<{ timestamp: string; latency: number; status: string }>;
}

interface SystemStats {
  totalMonitors: number;
  onlineMonitors: number;
  degradedMonitors: number;
  downMonitors: number;
  avgLatencyMs: number;
  overallUptimePct: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function App() {
  const [monitors, setMonitors] = useState<MonitorTarget[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<SystemStats>({
    totalMonitors: 0,
    onlineMonitors: 0,
    degradedMonitors: 0,
    downMonitors: 0,
    avgLatencyMs: 0,
    overallUptimePct: 100
  });
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<MonitorTarget | null>(null);
  
  // Custom confirm dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<() => void>(() => {});
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', confirmText: '', type: 'danger' as 'danger' | 'warning' | 'info' });
  
  // Custom toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [user, setUser] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger', confirmText = 'Confirm') => {
    setConfirmConfig({ title, message, confirmText, type });
    setConfirmCallback(() => onConfirm);
    setIsConfirmOpen(true);
  };

  // Configure Axios interceptor for JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(res => {
          if (res.data.success) {
            setUser(res.data.user.username);
          } else {
            handleLogout();
          }
        })
        .catch(() => handleLogout());
    }
  }, []);

  const fetchData = async () => {
    try {
      const [monitorsRes, statsRes] = await Promise.all([
        axios.get('/api/monitors'),
        axios.get('/api/stats')
      ]);
      if (monitorsRes.data.success) setMonitors(monitorsRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000); // 10s live database sync
    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (token: string, username: string) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(username);
    showToast(`Signed in as ${username}`, 'success');
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    showToast('Signed out of session', 'info');
  };

  const handleManualPing = async (id: string) => {
    setRefreshingId(id);
    try {
      await axios.post(`/api/monitors/${id}/ping`);
      showToast('Health check completed', 'success');
      await fetchData();
    } catch (err) {
      showToast('Manual check failed', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleAddMonitor = async (name: string, url: string, intervalSec: number) => {
    try {
      await axios.post('/api/monitors', { name, url, intervalSec });
      showToast(`Added monitor: ${name}`, 'success');
      await fetchData();
    } catch (err) {
      showToast('Failed to add monitor', 'error');
    }
  };

  const handleUpdateMonitor = async (id: string, name: string, url: string, intervalSec: number) => {
    try {
      await axios.patch(`/api/monitors/${id}`, { name, url, intervalSec });
      showToast(`Configuration updated for ${name}`, 'success');
      await fetchData();
    } catch (err) {
      showToast('Failed to update monitor', 'error');
    }
  };

  const handleToggleActive = async (id: string, name: string, currentActive: boolean) => {
    const actionText = currentActive ? 'Pause' : 'Resume';
    openConfirm(
      `${actionText} Monitor?`,
      `Suspend real-time checks and alert notifications for ${name}?`,
      async () => {
        try {
          await axios.patch(`/api/monitors/${id}`, { isActive: !currentActive });
          showToast(`Monitoring ${currentActive ? 'paused' : 'resumed'} for ${name}`, 'success');
          await fetchData();
        } catch (err) {
          showToast('Failed to toggle monitor status', 'error');
        }
      },
      'warning',
      actionText
    );
  };

  const handleDeleteMonitor = (id: string, name: string) => {
    openConfirm(
      'Remove Monitor?',
      `Permanently erase ${name} and delete all logs from the PostgreSQL database?`,
      async () => {
        try {
          await axios.delete(`/api/monitors/${id}`);
          showToast(`Removed monitor: ${name}`, 'success');
          await fetchData();
        } catch (err) {
          showToast('Failed to delete monitor target', 'error');
        }
      },
      'danger',
      'Delete'
    );
  };

  // Client-side search filtering
  const filteredMonitors = monitors.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-['Inter',sans-serif] selection:bg-zinc-800 selection:text-white">
      {/* Top Banner Status Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800/80 py-2 px-4 text-center text-[11px] font-semibold text-zinc-400 tracking-wider flex items-center justify-center gap-2 select-none">
        <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
        <span>Enterprise Incident Intelligence Hub | Real-time Uptime Engine</span>
      </div>

      {/* Modern Minimalist Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shadow shadow-black">
              <Activity className="w-4 h-4 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">UptimePulse</span>
                <span className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-800/40">
                  SaaS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => setIsTelegramModalOpen(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-800 transition"
                >
                  <Bot className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Telegram Alerts</span>
                </button>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-bold text-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Endpoint</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition border border-transparent"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 border border-zinc-800 transition"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sign In</span>
              </button>
            )}

            <div className="w-px h-5 bg-zinc-800 mx-1 hidden sm:block" />

            <button
              onClick={() => fetchData()}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition"
              title="Force Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-100' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8 animate-fade-in">
        
        {/* Real-time SLA Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-900 shadow-sm relative overflow-hidden group transition hover:border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Global Uptime SLA</span>
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{stats.overallUptimePct}%</span>
              <span className="text-[10px] text-emerald-500 font-semibold font-mono">99.9% Target</span>
            </div>
          </div>

          <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-900 shadow-sm relative overflow-hidden group transition hover:border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Monitors</span>
              <Server className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{stats.totalMonitors}</span>
              <span className="text-[10px] text-zinc-400 font-medium font-mono">{stats.onlineMonitors} Active</span>
            </div>
          </div>

          <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-900 shadow-sm relative overflow-hidden group transition hover:border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Avg Latency</span>
              <Zap className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{stats.avgLatencyMs} <span className="text-xs font-normal text-zinc-400">ms</span></span>
              <span className="text-[10px] text-zinc-400 font-medium font-mono">All servers</span>
            </div>
          </div>

          <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-900 shadow-sm relative overflow-hidden group transition hover:border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Incidents</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight font-mono">{stats.downMonitors}</span>
              <span className={`text-[10px] font-bold ${stats.downMonitors > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-500'}`}>
                {stats.downMonitors > 0 ? 'Downtime Alert' : 'System Healthy'}
              </span>
            </div>
          </div>
        </div>

        {/* Monitored Services */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-400" />
              <h2 className="text-xs font-bold text-white tracking-wider uppercase">Active Infrastructure</h2>
            </div>
            
            {/* Search Input Bar */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-900 rounded-lg text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition"
              />
            </div>
          </div>

          {filteredMonitors.length === 0 ? (
            <div className="bg-[#121214] rounded-2xl p-12 text-center border border-zinc-900">
              <Terminal className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No endpoints found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'Adjust your search query' : (user ? 'Add an endpoint to start monitoring' : 'Login to start configuring')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredMonitors.map((m) => (
                <div 
                  key={m.id} 
                  className={`bg-[#121214] rounded-xl p-4 border transition duration-200 ${
                    !m.isActive 
                      ? 'border-zinc-900/40 opacity-55' 
                      : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2 bg-zinc-950/80 rounded-lg border border-zinc-900 shrink-0">
                        <GlobeStatusIcon status={m.isActive ? m.status : 'PAUSED'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-zinc-100 tracking-tight truncate max-w-[150px] sm:max-w-xs">{m.name}</h3>
                          <StatusBadge status={m.isActive ? m.status : 'PAUSED'} />
                          <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                            HTTP {m.statusCode ?? 'N/A'}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900/60 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {m.intervalSec}s
                          </span>
                          {m.sslExpiryDays !== null && m.sslExpiryDays !== undefined && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              m.sslExpiryDays <= 7
                                ? 'bg-rose-500/5 text-rose-400 border-rose-500/10 animate-pulse'
                                : m.sslExpiryDays <= 30
                                  ? 'bg-amber-500/5 text-amber-400 border-amber-500/10'
                                  : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                            }`}>
                              SSL: {m.sslExpiryDays}d
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <a 
                            href={m.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition"
                          >
                            {m.url}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <span className="text-zinc-600 font-mono text-[10px] hidden sm:inline">•</span>
                          <span className="text-zinc-500 font-mono text-[10px]">
                            Check: {m.lastChecked ? new Date(m.lastChecked).toLocaleTimeString() : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Metrics & Sparklines */}
                    <div className="flex items-center gap-6 justify-between md:justify-end shrink-0">
                      <div className="text-right">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Latency</div>
                        <div className="text-xs font-bold text-zinc-200 font-mono">{m.isActive ? `${m.responseTimeMs} ms` : '—'}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Uptime SLA</div>
                        <div className="text-xs font-bold text-emerald-500 font-mono">{m.uptimePct}%</div>
                      </div>
                      
                      {/* Premium Sparkline Area Chart */}
                      <div className="hidden lg:block bg-zinc-950 p-1.5 rounded-lg border border-zinc-900">
                        <SparklineChart data={m.isActive ? m.history : []} />
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 justify-end shrink-0 border-t border-zinc-900 pt-3 md:pt-0 md:border-0">
                      {user ? (
                        <>
                          <button
                            onClick={() => handleToggleActive(m.id, m.name, m.isActive)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 rounded-lg transition"
                            title={m.isActive ? 'Pause' : 'Resume'}
                          >
                            {m.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              setEditingMonitor(m);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleManualPing(m.id)}
                            disabled={refreshingId === m.id || !m.isActive}
                            className="px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 rounded-lg transition flex items-center gap-1 border border-zinc-800 disabled:opacity-30"
                            title="Ping"
                          >
                            <RefreshCw className={`w-3 h-3 ${refreshingId === m.id ? 'animate-spin' : ''}`} />
                            <span>Check</span>
                          </button>

                          <button
                            onClick={() => handleDeleteMonitor(m.id, m.name)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] font-semibold text-zinc-600 flex items-center gap-1 select-none">
                          <Lock className="w-3 h-3 text-zinc-700" /> READ-ONLY
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-xl shadow-2xl border flex items-start gap-2.5 pointer-events-auto transition-all duration-300 animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
                : t.type === 'error'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-800'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : t.type === 'error' ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-zinc-400 hover:text-white shrink-0 p-0.5 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Rebranded Minimalist Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 bg-zinc-950/50 mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-zinc-600" />
            <span>&copy; {new Date().getFullYear()} UptimePulse Technologies. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] text-zinc-600">
            <span>PostgreSQL</span>
            <span>•</span>
            <span>Telegram Bot</span>
            <span>•</span>
            <span>JWT Security</span>
          </div>
        </div>
      </footer>

      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMonitor}
      />

      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <EditMonitorModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMonitor(null);
        }}
        monitor={editingMonitor}
        onUpdate={handleUpdateMonitor}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmCallback}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />
    </div>
  );
}

function GlobeStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'ONLINE': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'DEGRADED': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'DOWN': return <XCircle className="w-4 h-4 text-rose-500" />;
    case 'PAUSED': return <Pause className="w-4 h-4 text-zinc-500" />;
    default: return <Activity className="w-4 h-4 text-zinc-600" />;
  }
}
