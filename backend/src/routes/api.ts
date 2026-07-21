import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { pingUrl, runAllDatabaseMonitors } from '../checker.js';
import { sendTelegramAlert, getTelegramConfig, testTelegramConnection } from '../services/telegram.js';

const router = Router();

// GET /api/monitors - Get all monitored services with history & real SLA %
router.get('/monitors', (req: Request, res: Response) => {
  const monitors = db.prepare('SELECT * FROM monitors ORDER BY id DESC').all() as any[];

  const result = monitors.map((m) => {
    // Get last 20 ping logs for history sparkline
    const logs = db.prepare(`
      SELECT status, response_time_ms as latency, created_at as timestamp 
      FROM ping_logs 
      WHERE monitor_id = ? 
      ORDER BY id DESC LIMIT 20
    `).all(m.id) as any[];

    // Calculate Uptime % based on logs
    const totalPings = db.prepare('SELECT COUNT(*) as count FROM ping_logs WHERE monitor_id = ?').get(m.id) as { count: number };
    const onlinePings = db.prepare("SELECT COUNT(*) as count FROM ping_logs WHERE monitor_id = ? AND status != 'DOWN'").get(m.id) as { count: number };

    const uptimePct = totalPings.count > 0 
      ? Number(((onlinePings.count / totalPings.count) * 100).toFixed(2)) 
      : 100;

    return {
      id: m.id,
      name: m.name,
      url: m.url,
      intervalSec: m.interval_sec,
      status: m.status,
      statusCode: m.status_code,
      responseTimeMs: m.response_time_ms,
      lastChecked: m.last_checked,
      uptimePct,
      history: logs.reverse()
    };
  });

  res.json({ success: true, data: result });
});

// POST /api/monitors - Add new monitor
router.post('/monitors', async (req: Request, res: Response) => {
  const { name, url, intervalSec } = req.body;

  if (!name || !url) {
    return res.status(400).json({ success: false, error: 'Name and URL are required' });
  }

  const stmt = db.prepare('INSERT INTO monitors (name, url, interval_sec) VALUES (?, ?, ?)');
  const info = stmt.run(name, url, intervalSec || 60);
  const monitorId = info.lastInsertRowid;

  // Immediate ping check
  const checkRes = await pingUrl(name, url);
  db.prepare(`
    UPDATE monitors SET status = ?, status_code = ?, response_time_ms = ?, last_checked = datetime('now') WHERE id = ?
  `).run(checkRes.status, checkRes.statusCode, checkRes.responseTimeMs, monitorId);

  db.prepare(`
    INSERT INTO ping_logs (monitor_id, status, status_code, response_time_ms, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).run(monitorId, checkRes.status, checkRes.statusCode, checkRes.responseTimeMs, checkRes.error || null);

  const created = db.prepare('SELECT * FROM monitors WHERE id = ?').get(monitorId);
  res.status(201).json({ success: true, data: created });
});

// DELETE /api/monitors/:id - Remove monitor
router.delete('/monitors/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM ping_logs WHERE monitor_id = ?').run(id);
  const info = db.prepare('DELETE FROM monitors WHERE id = ?').run(id);

  if (info.changes === 0) {
    return res.status(404).json({ success: false, error: 'Monitor not found' });
  }

  res.json({ success: true, message: 'Monitor deleted successfully' });
});

// POST /api/monitors/:id/ping - Manual trigger ping
router.post('/monitors/:id/ping', async (req: Request, res: Response) => {
  const { id } = req.params;
  const monitor = db.prepare('SELECT * FROM monitors WHERE id = ?').get(id) as any;

  if (!monitor) {
    return res.status(404).json({ success: false, error: 'Monitor not found' });
  }

  const checkRes = await pingUrl(monitor.name, monitor.url);

  db.prepare(`
    UPDATE monitors SET status = ?, status_code = ?, response_time_ms = ?, last_checked = datetime('now') WHERE id = ?
  `).run(checkRes.status, checkRes.statusCode, checkRes.responseTimeMs, id);

  db.prepare(`
    INSERT INTO ping_logs (monitor_id, status, status_code, response_time_ms, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, checkRes.status, checkRes.statusCode, checkRes.responseTimeMs, checkRes.error || null);

  if (checkRes.status !== 'ONLINE') {
    await sendTelegramAlert({
      siteName: monitor.name,
      url: monitor.url,
      status: checkRes.status,
      statusCode: checkRes.statusCode,
      responseTimeMs: checkRes.responseTimeMs,
      error: checkRes.error,
      timestamp: checkRes.timestamp
    });
  }

  res.json({ success: true, message: 'Ping completed', data: checkRes });
});

// GET /api/stats - Global Dashboard Stats calculated from DB
router.get('/stats', (req: Request, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM monitors').get() as any).count;
  const online = (db.prepare("SELECT COUNT(*) as count FROM monitors WHERE status = 'ONLINE'").get() as any).count;
  const degraded = (db.prepare("SELECT COUNT(*) as count FROM monitors WHERE status = 'DEGRADED'").get() as any).count;
  const down = (db.prepare("SELECT COUNT(*) as count FROM monitors WHERE status = 'DOWN'").get() as any).count;
  const avgLatency = (db.prepare('SELECT AVG(response_time_ms) as avg FROM monitors WHERE response_time_ms > 0').get() as any).avg || 0;

  const totalLogs = (db.prepare('SELECT COUNT(*) as count FROM ping_logs').get() as any).count;
  const onlineLogs = (db.prepare("SELECT COUNT(*) as count FROM ping_logs WHERE status != 'DOWN'").get() as any).count;
  const overallUptimePct = totalLogs > 0 ? Number(((onlineLogs / totalLogs) * 100).toFixed(2)) : 100;

  res.json({
    success: true,
    stats: {
      totalMonitors: total,
      onlineMonitors: online,
      degradedMonitors: degraded,
      downMonitors: down,
      avgLatencyMs: Math.round(avgLatency),
      overallUptimePct
    }
  });
});

// GET /api/settings/telegram - Get Telegram Config
router.get('/settings/telegram', (req: Request, res: Response) => {
  const config = getTelegramConfig();
  res.json({ success: true, data: config });
});

// POST /api/settings/telegram/test - Test & Save Telegram Credentials
router.post('/settings/telegram/test', async (req: Request, res: Response) => {
  const { token, chatId } = req.body;
  const result = await testTelegramConnection(token, chatId);
  res.json(result);
});

export default router;
