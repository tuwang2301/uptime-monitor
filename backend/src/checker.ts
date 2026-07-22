import axios from 'axios';
import { prisma } from './db/database.js';
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
  const monitors = await prisma.monitor.findMany();
  console.log(`\n==================================================`);
  console.log(`🚀 [HEALTH ENGINE] Checking active database targets at ${new Date().toLocaleString()}`);
  console.log(`==================================================\n`);

  for (const monitor of monitors) {
    // Skip checking if monitor is paused
    if (!monitor.isActive) {
      console.log(`⏸️ [PAUSED] Skipping check for ${monitor.name} (${monitor.url})`);
      continue;
    }

    const res = await pingUrl(monitor.name, monitor.url);
    const oldStatus = monitor.status;

    // Save check result via Prisma
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        status: res.status,
        statusCode: res.statusCode,
        responseTimeMs: res.responseTimeMs,
        lastChecked: new Date(res.timestamp)
      }
    });

    await prisma.pingLog.create({
      data: {
        monitorId: monitor.id,
        status: res.status,
        statusCode: res.statusCode,
        responseTimeMs: res.responseTimeMs,
        errorMessage: res.error || null,
        createdAt: new Date(res.timestamp)
      }
    });

    // Spam prevention: send Telegram alert ONLY on status transition
    const statusChanged = oldStatus !== 'PENDING' && oldStatus !== res.status;
    const initialFailure = oldStatus === 'PENDING' && res.status !== 'ONLINE';

    if (statusChanged || initialFailure) {
      await sendTelegramAlert({
        siteName: monitor.name,
        url: monitor.url,
        status: res.status,
        oldStatus: oldStatus !== 'PENDING' ? oldStatus : undefined,
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
