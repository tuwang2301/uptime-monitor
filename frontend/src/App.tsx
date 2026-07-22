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
  Clock
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
    showToast(`Signed in successfully as Administrator`, 'success');
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    showToast('Signed out of Administrator session', 'info');
  };

  const handleManualPing = async (id: string) => {
    setRefreshingId(id);
    try {
      await axios.post(`/api/monitors/${id}/ping`);
      showToast('Manual health check completed successfully', 'success');
      await fetchData();
    } catch (err) {
      showToast('Unauthorized or manual check failed', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleAddMonitor = async (name: string, url: string, intervalSec: number) => {
    try {
      await axios.post('/api/monitors', { name, url, intervalSec });
      showToast(`Added new monitor: ${name}`, 'success');
      await fetchData();
    } catch (err) {
      showToast('Unauthorized or failed to add monitor', 'error');
    }
  };

  const handleUpdateMonitor = async (id: string, name: string, url: string, intervalSec: number) => {
    try {
      await axios.patch(`/api/monitors/${id}`, { name, url, intervalSec });
      showToast(`Configuration updated for ${name}`, 'success');
      await fetchData();
    } catch (err) {
      showToast('Failed to update monitor settings', 'error');
    }
  };

  const handleToggleActive = async (id: string, name: string, currentActive: boolean) => {
    const actionText = currentActive ? 'Pause' : 'Resume';
    openConfirm(
      `${actionText} Monitor?`,
      `Are you sure you want to ${actionText.toLowerCase()} monitoring for ${name}? Notifications for this target will be suspended.`,
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
      `Are you sure you want to permanently delete ${name}? This will erase all logs and SLA metric history from the PostgreSQL database.`,
      async () => {
        try {
          await axios.delete(`/api/monitors/${id}`);
          showToast(`Deleted monitor: ${name}`, 'success');
          await fetchData();
        } catch (err) {
          showToast('Failed to delete monitor target', 'error');
        }
      },
      'danger',
      'Delete'
    );
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-gray-100 flex flex-col font-['Inter',sans-serif]">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border-b border-indigo-500/20 py-2 px-4 text-center text-xs font-medium text-indigo-200 flex items-center justify-center gap-2">
        <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span>Enterprise Incident Intelligence Hub connected to Freelancer.com API standard</span>
      </div>

      {/* Main Header */}
      <header className="border-b border-gray-800/80 bg-[#0c101c]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">UptimePulse</span>
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  Production PostgreSQL
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Enterprise Health Monitoring & Incident Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                <button
                  onClick={() => setIsTelegramModalOpen(true)}
                  className="px-3.5 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-gray-700/60 transition shadow-sm"
                >
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Telegram Alerts</span>
                </button>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition ring-1 ring-indigo-400/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Endpoint</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
                  title="Sign Out Admin"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 border border-gray-700 transition"
              >
                <LogIn className="w-4 h-4 text-indigo-400" />
                <span>Admin Login</span>
              </button>
            )}

            <button
              onClick={() => fetchData()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition border border-transparent hover:border-gray-800"
              title="Force Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Real-time SLA Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f1524] p-5 rounded-2xl border border-gray-800/80 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Global Uptime SLA</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{stats.overallUptimePct}%</span>
              <span className="text-xs text-emerald-400 font-semibold font-mono">99.9% SLA Target</span>
            </div>
          </div>

          <div className="bg-[#0f1524] p-5 rounded-2xl border border-gray-800/80 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Services</span>
              <Server className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{stats.totalMonitors}</span>
              <span className="text-xs text-indigo-400 font-semibold">{stats.onlineMonitors} Monitoring</span>
            </div>
          </div>

          <div className="bg-[#0f1524] p-5 rounded-2xl border border-gray-800/80 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg Response Time</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight font-mono">{stats.avgLatencyMs} <span className="text-sm font-normal text-gray-400">ms</span></span>
              <span className="text-xs text-amber-400 font-semibold font-mono">Real-time Avg</span>
            </div>
          </div>

          <div className="bg-[#0f1524] p-5 rounded-2xl border border-gray-800/80 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Incidents</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{stats.downMonitors}</span>
              <span className={`text-xs font-bold ${stats.downMonitors > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {stats.downMonitors > 0 ? 'Downtime Alert' : 'System Healthy'}
              </span>
            </div>
          </div>
        </div>

        {/* Monitored Services Table / Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Active Infrastructure Monitors</h2>
            </div>
            <span className="text-xs text-gray-400 font-mono">Auto-polling DB every 10s</span>
          </div>

          {monitors.length === 0 ? (
            <div className="bg-[#0f1524] rounded-2xl p-12 text-center border border-gray-800 shadow-xl">
              <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">No Endpoints Monitored</h3>
              {user && <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Click "Add Endpoint" above to configure your first HTTP/API monitor.</p>}
              {!user && <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Please login as Administrator to add endpoints.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {monitors.map((m) => (
                <div 
                  key={m.id} 
                  className={`bg-[#0f1524] rounded-2xl p-5 border transition-all duration-200 shadow-lg ${
                    !m.isActive 
                      ? 'border-gray-800/40 opacity-60' 
                      : 'border-gray-800/90 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800/80 shrink-0 mt-0.5">
                        <GlobeStatusIcon status={m.isActive ? m.status : 'PAUSED'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-bold text-white tracking-tight">{m.name}</h3>
                          <StatusBadge status={m.isActive ? m.status : 'PAUSED'} />
                          <span className="text-[11px] font-mono font-semibold text-gray-300 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                            HTTP {m.statusCode ?? 'N/A'}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {m.intervalSec}s
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <a 
                            href={m.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                          >
                            {m.url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-[11px] text-gray-400 font-mono">Last check: {m.lastChecked ? new Date(m.lastChecked).toLocaleTimeString() : 'Pending'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Sparkline Telemetry Graph & Metrics */}
                    <div className="flex items-center gap-6 self-start md:self-center">
                      <div className="text-right">
                        <div className="text-[11px] text-gray-400 font-medium">Latency</div>
                        <div className="text-sm font-bold text-white font-mono">{m.isActive ? `${m.responseTimeMs} ms` : 'N/A'}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] text-gray-400 font-medium">SLA Uptime</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono">{m.uptimePct}%</div>
                      </div>
                      
                      {/* Telemetry Sparkline Chart */}
                      <div className="hidden lg:block bg-gray-900/80 p-2 rounded-xl border border-gray-800">
                        <SparklineChart data={m.isActive ? m.history : []} />
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {user ? (
                        <>
                          <button
                            onClick={() => handleToggleActive(m.id, m.name, m.isActive)}
                            className={`p-2 rounded-xl transition border ${
                              m.isActive 
                                ? 'text-amber-400 hover:bg-amber-500/10 border-transparent' 
                                : 'text-emerald-400 hover:bg-emerald-500/10 border-transparent'
                            }`}
                            title={m.isActive ? 'Pause Monitoring' : 'Resume Monitoring'}
                          >
                            {m.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              setEditingMonitor(m);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition border border-transparent"
                            title="Edit Configuration"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleManualPing(m.id)}
                            disabled={refreshingId === m.id || !m.isActive}
                            className="px-3 py-1.5 text-xs font-bold text-gray-200 hover:text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition flex items-center gap-1.5 border border-gray-800 disabled:opacity-30"
                            title="Instant Health Check"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === m.id ? 'animate-spin text-indigo-400' : ''}`} />
                            <span>Ping</span>
                          </button>

                          <button
                            onClick={() => handleDeleteMonitor(m.id, m.name)}
                            className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent"
                            title="Remove Monitor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Read-Only
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 pointer-events-auto transition-all duration-300 animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
                : t.type === 'error'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                  : 'bg-indigo-950/90 text-indigo-300 border-indigo-500/30'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : t.type === 'error' ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-gray-400 hover:text-white shrink-0 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 py-6 text-center text-xs text-gray-400 bg-[#0c101c]/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Production Uptime Intelligence Hub | Applied for Freelancer.com Engineering</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
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
    case 'ONLINE': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case 'DEGRADED': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    case 'DOWN': return <XCircle className="w-5 h-5 text-rose-400" />;
    case 'PAUSED': return <Pause className="w-5 h-5 text-amber-500 animate-pulse" />;
    default: return <Activity className="w-5 h-5 text-indigo-400" />;
  }
}
