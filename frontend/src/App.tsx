import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Zap, 
  Terminal, 
  Send,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { StatusBadge } from './components/StatusBadge';
import { AddMonitorModal } from './components/AddMonitorModal';

interface MonitorTarget {
  id: string;
  name: string;
  url: string;
  intervalSec: number;
  status: 'ONLINE' | 'DEGRADED' | 'DOWN' | 'PENDING';
  statusCode: number | null;
  responseTimeMs: number;
  lastChecked: string | null;
  uptimePct: number;
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [monitorsRes, statsRes] = await Promise.all([
        axios.get('/api/monitors'),
        axios.get('/api/stats')
      ]);
      if (monitorsRes.data.success) setMonitors(monitorsRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 15000); // auto-refresh dashboard every 15s
    return () => clearInterval(timer);
  }, []);

  const handleManualPing = async (id: string) => {
    setRefreshingId(id);
    try {
      await axios.post(`/api/monitors/${id}/ping`);
      await fetchData();
    } catch (err) {
      console.error('Manual ping error:', err);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleAddMonitor = async (name: string, url: string, intervalSec: number) => {
    await axios.post('/api/monitors', { name, url, intervalSec });
    await fetchData();
  };

  const handleDeleteMonitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    await axios.delete(`/api/monitors/${id}`);
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <header className="border-b border-gray-800/80 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-wide">UptimePulse</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Linux Core</span>
              </div>
              <p className="text-xs text-gray-400">Real-Time API & Infrastructure Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition flex items-center gap-2 text-sm font-medium"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Monitor</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Overall Uptime</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.overallUptimePct}%</span>
              <span className="text-xs text-emerald-400 font-medium">99.9% SLA</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Services</span>
              <Server className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.totalMonitors}</span>
              <span className="text-xs text-gray-400">Total Tracked</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.avgLatencyMs} <span className="text-sm font-normal text-gray-400">ms</span></span>
              <span className="text-xs text-amber-400 font-medium">Global Avg</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-gray-800/80">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">System Incidents</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.downMonitors}</span>
              <span className={`text-xs font-medium ${stats.downMonitors > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stats.downMonitors > 0 ? 'Action Required' : 'All Operational'}
              </span>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              Monitored Endpoints ({monitors.length})
            </h2>
            <span className="text-xs text-gray-400">Auto-pinging every 60s</span>
          </div>

          {monitors.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-gray-800">
              <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">No Services Monitored</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">Click "Add Monitor" above to start tracking your first website or REST API endpoint.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {monitors.map((m) => (
                <div 
                  key={m.id} 
                  className="glass-panel rounded-2xl p-5 border border-gray-800/80 hover:border-gray-700/80 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Info */}
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
                        <GlobeIcon status={m.status} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-bold text-white">{m.name}</h3>
                          <StatusBadge status={m.status} />
                          <span className="text-xs font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                            HTTP {m.statusCode ?? 'ERR'}
                          </span>
                        </div>
                        <a 
                          href={m.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 transition"
                        >
                          {m.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Middle: Metrics & History Bar */}
                    <div className="flex items-center gap-6 self-start md:self-center">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Response Time</div>
                        <div className="text-sm font-bold text-white font-mono">{m.responseTimeMs} ms</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Uptime</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono">{m.uptimePct}%</div>
                      </div>
                      
                      {/* Latency Bars */}
                      <div className="hidden lg:flex items-end gap-1 h-8 bg-gray-900/60 p-1 rounded-lg border border-gray-800">
                        {m.history.length > 0 ? (
                          m.history.map((h, idx) => {
                            const heightPct = Math.min(100, Math.max(20, (h.latency / 1000) * 100));
                            const barColor = h.status === 'ONLINE' ? 'bg-emerald-500' : h.status === 'DEGRADED' ? 'bg-amber-500' : 'bg-rose-500';
                            return (
                              <div
                                key={idx}
                                style={{ height: `${heightPct}%` }}
                                className={`w-1.5 rounded-full ${barColor} transition-all`}
                                title={`${h.timestamp}: ${h.latency}ms (${h.status})`}
                              />
                            );
                          })
                        ) : (
                          <div className="text-[10px] text-gray-500 px-2">No history</div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleManualPing(m.id)}
                        disabled={refreshingId === m.id}
                        className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition text-xs flex items-center gap-1.5 font-medium border border-gray-800"
                        title="Ping Now"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === m.id ? 'animate-spin text-indigo-400' : ''}`} />
                        <span>Ping</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMonitor(m.id)}
                        className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
                        title="Delete Monitor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 py-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Built for Linux, Docker & DevOps Learning | <span className="text-gray-300 font-semibold">100% Free Tier Stack</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Node.js Express</span>
            <span>•</span>
            <span>React Vite</span>
            <span>•</span>
            <span>Docker</span>
          </div>
        </div>
      </footer>

      <AddMonitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddMonitor}
      />
    </div>
  );
}

function GlobeIcon({ status }: { status: string }) {
  switch (status) {
    case 'ONLINE': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case 'DEGRADED': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    case 'DOWN': return <XCircle className="w-5 h-5 text-rose-400" />;
    default: return <Activity className="w-5 h-5 text-indigo-400" />;
  }
}
