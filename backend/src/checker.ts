import axios from 'axios';
import { db } from './db/database.js';
import { sendTelegramAlert } from './services/telegram.js';

export interface PingResult {
  url: string;
  name: string;
  statusCode: number | null;
  responseTimeMs: number;
  status: 'ONLINE' | 'DEGRADED' | 'DOWN';
  error?: string;
  timestamp: string;
}

export async function pingUrl(name: string, url: string, timeoutMs: number = 5000): Promise<PingResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      validateStatus: () => true,
      headers: { 'User-Agent': 'UptimeMonitor-Bot/1.0' }
    });

    const responseTimeMs = Date.now() - startTime;
    const statusCode = response.status;

    let status: 'ONLINE' | 'DEGRADED' | 'DOWN' = 'ONLINE';
    if (statusCode >= 400) {
      status = 'DOWN';
    } else if (responseTimeMs > 2000) {
      status = 'DEGRADED';
    }

    return { url, name, statusCode, responseTimeMs, status, timestamp };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    return {
      url,
      name,
      statusCode: null,
      responseTimeMs,
      status: 'DOWN',
      error: err.message || 'Network Timeout / Connection Refused',
      timestamp
    };
  }
}

export async function runAllDatabaseMonitors() {
  const monitors = db.prepare('SELECT * FROM monitors').all() as any[];
  console.log(`\n==================================================`);
  console.log(`🚀 [HEALTH ENGINE] Checking ${monitors.length} database targets at ${new Date().toLocaleString()}`);
  console.log(`==================================================\n`);

  for (const monitor of monitors) {
    const res = await pingUrl(monitor.name, monitor.url);

    // Save check result to database
    db.prepare(`
      UPDATE monitors 
      SET status = ?, status_code = ?, response_time_ms = ?, last_checked = datetime('now')
      WHERE id = ?
    `).run(res.status, res.statusCode, res.responseTimeMs, monitor.id);

    db.prepare(`
      INSERT INTO ping_logs (monitor_id, status, status_code, response_time_ms, error_message)
      VALUES (?, ?, ?, ?, ?)
    `).run(monitor.id, res.status, res.statusCode, res.responseTimeMs, res.error || null);

    // If status changed or down/degraded, send alert
    if (res.status !== 'ONLINE') {
      await sendTelegramAlert({
        siteName: monitor.name,
        url: monitor.url,
        status: res.status,
        statusCode: res.statusCode,
        responseTimeMs: res.responseTimeMs,
        error: res.error,
        timestamp: res.timestamp
      });
    }

    console.log(`🔍 [${res.status}] ${monitor.name} (${res.responseTimeMs}ms) Code: ${res.statusCode ?? 'N/A'}`);
  }

  console.log(`\n--------------------------------------------------\n`);
}
