import { Router, Request, Response } from 'express';
import { pingUrl, PingResult } from '../checker.js';
import { sendTelegramAlert } from '../services/telegram.js';

export interface MonitorTarget {
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

const router = Router();

// In-memory store for demonstration (easily replaced with SQLite/Postgres in Prod)
let monitors: MonitorTarget[] = [
  {
    id: '1',
    name: 'Google Search Engine',
    url: 'https://www.google.com',
    intervalSec: 60,
    status: 'ONLINE',
    statusCode: 200,
    responseTimeMs: 320,
    lastChecked: new Date().toISOString(),
    uptimePct: 99.9,
    history: [
      { timestamp: '10:00', latency: 310, status: 'ONLINE' },
      { timestamp: '10:05', latency: 340, status: 'ONLINE' },
      { timestamp: '10:10', latency: 320, status: 'ONLINE' }
    ]
  },
  {
    id: '2',
    name: 'GitHub REST API',
    url: 'https://api.github.com',
    intervalSec: 60,
    status: 'ONLINE',
    statusCode: 200,
    responseTimeMs: 180,
    lastChecked: new Date().toISOString(),
    uptimePct: 100,
    history: [
      { timestamp: '10:00', latency: 190, status: 'ONLINE' },
      { timestamp: '10:05', latency: 175, status: 'ONLINE' },
      { timestamp: '10:10', latency: 180, status: 'ONLINE' }
    ]
  },
  {
    id: '3',
    name: 'Payment Gateway (Mock 500)',
    url: 'https://httpbin.org/status/500',
    intervalSec: 30,
    status: 'DOWN',
    statusCode: 500,
    responseTimeMs: 520,
    lastChecked: new Date().toISOString(),
    uptimePct: 84.5,
    history: [
      { timestamp: '10:00', latency: 500, status: 'DOWN' },
      { timestamp: '10:05', latency: 510, status: 'DOWN' },
      { timestamp: '10:10', latency: 520, status: 'DOWN' }
    ]
  }
];

// GET /api/monitors - Get all monitored services
router.get('/monitors', (req: Request, res: Response) => {
  res.json({ success: true, data: monitors });
});

// POST /api/monitors - Add new monitor
router.post('/monitors', async (req: Request, res: Response) => {
  const { name, url, intervalSec } = req.body;

  if (!name || !url) {
    return res.status(400).json({ success: false, error: 'Name and URL are required' });
  }

  const newMonitor: MonitorTarget = {
    id: Date.now().toString(),
    name,
    url,
    intervalSec: intervalSec || 60,
    status: 'PENDING',
    statusCode: null,
    responseTimeMs: 0,
    lastChecked: null,
    uptimePct: 100,
    history: []
  };

  monitors.push(newMonitor);

  // Perform initial ping check immediately
  const checkResult = await pingUrl(name, url);
  newMonitor.status = checkResult.status;
  newMonitor.statusCode = checkResult.statusCode;
  newMonitor.responseTimeMs = checkResult.responseTimeMs;
  newMonitor.lastChecked = checkResult.timestamp;
  newMonitor.history.push({
    timestamp: new Date().toLocaleTimeString(),
    latency: checkResult.responseTimeMs,
    status: checkResult.status
  });

  res.status(201).json({ success: true, data: newMonitor });
});

// DELETE /api/monitors/:id - Remove monitor
router.delete('/monitors/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = monitors.length;
  monitors = monitors.filter(m => m.id !== id);

  if (monitors.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Monitor not found' });
  }

  res.json({ success: true, message: 'Monitor removed successfully' });
});

// POST /api/monitors/:id/ping - Manual trigger ping
router.post('/monitors/:id/ping', async (req: Request, res: Response) => {
  const { id } = req.params;
  const target = monitors.find(m => m.id === id);

  if (!target) {
    return res.status(404).json({ success: false, error: 'Monitor not found' });
  }

  const checkResult = await pingUrl(target.name, target.url);
  target.status = checkResult.status;
  target.statusCode = checkResult.statusCode;
  target.responseTimeMs = checkResult.responseTimeMs;
  target.lastChecked = checkResult.timestamp;
  target.history.push({
    timestamp: new Date().toLocaleTimeString(),
    latency: checkResult.responseTimeMs,
    status: checkResult.status
  });
  if (target.history.length > 20) target.history.shift();

  if (checkResult.status !== 'ONLINE') {
    await sendTelegramAlert({
      siteName: target.name,
      url: target.url,
      status: checkResult.status,
      statusCode: checkResult.statusCode,
      responseTimeMs: checkResult.responseTimeMs,
      error: checkResult.error,
      timestamp: checkResult.timestamp
    });
  }

  res.json({ success: true, data: target });
});

// GET /api/stats - Global Dashboard Stats
router.get('/stats', (req: Request, res: Response) => {
  const total = monitors.length;
  const online = monitors.filter(m => m.status === 'ONLINE').length;
  const degraded = monitors.filter(m => m.status === 'DEGRADED').length;
  const down = monitors.filter(m => m.status === 'DOWN').length;
  const avgLatency = total > 0 ? Math.round(monitors.reduce((acc, m) => acc + m.responseTimeMs, 0) / total) : 0;
  const overallUptimePct = total > 0 ? Number((monitors.reduce((acc, m) => acc + m.uptimePct, 0) / total).toFixed(2)) : 100;

  res.json({
    success: true,
    stats: {
      totalMonitors: total,
      onlineMonitors: online,
      degradedMonitors: degraded,
      downMonitors: down,
      avgLatencyMs: avgLatency,
      overallUptimePct
    }
  });
});

export default router;
