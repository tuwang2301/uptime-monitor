import axios from 'axios';
import tls from 'tls';
import { URL } from 'url';
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

export function checkSslExpiry(targetUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'https:') {
        return resolve(null);
      }

      const hostname = parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port, 10) : 443;

      const socket = tls.connect({
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false
      }, () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (cert && cert.valid_to) {
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const diffMs = validTo.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          resolve(diffDays);
        } else {
          resolve(null);
        }
      });

      socket.on('error', () => {
        resolve(null);
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
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
    const sslExpiryDays = await checkSslExpiry(monitor.url);
    
    const oldStatus = monitor.status;
    let oldConsecutiveFailures = monitor.consecutiveFailures;
    let newConsecutiveFailures = oldConsecutiveFailures;

    if (res.status === 'DOWN') {
      newConsecutiveFailures += 1;
    } else {
      newConsecutiveFailures = 0;
    }

    // Determine if we should set status to DOWN. 
    // To prevent false positives, we only transition the official monitor status to DOWN
    // when it fails 3 times consecutively. Until then, it stays as its previous status (e.g. ONLINE).
    let targetStatus = res.status;
    if (res.status === 'DOWN' && newConsecutiveFailures < 3 && oldStatus === 'ONLINE') {
      targetStatus = 'ONLINE'; // Stay ONLINE until threshold is reached
    }

    // Save check result via Prisma
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        status: targetStatus,
        statusCode: res.statusCode,
        responseTimeMs: res.responseTimeMs,
        sslExpiryDays: sslExpiryDays,
        consecutiveFailures: newConsecutiveFailures,
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

    // Alert Transition Logic:
    // 1. Alert sập (DOWN) ONLY when consecutiveFailures reaches EXACTLY 3 (incident started)
    if (res.status === 'DOWN' && newConsecutiveFailures === 3) {
      await sendTelegramAlert({
        siteName: monitor.name,
        url: monitor.url,
        status: 'DOWN',
        oldStatus: 'ONLINE',
        statusCode: res.statusCode,
        responseTimeMs: res.responseTimeMs,
        error: `${res.error || 'HTTP status ' + res.statusCode} (Failed 3 consecutive times)`,
        timestamp: res.timestamp
      });
    }

    // 2. Alert phục hồi (ONLINE) ONLY if it was previously confirmed DOWN (consecutiveFailures >= 3 or monitor.status was DOWN)
    if (res.status === 'ONLINE' && oldStatus === 'DOWN') {
      await sendTelegramAlert({
        siteName: monitor.name,
        url: monitor.url,
        status: 'ONLINE',
        oldStatus: 'DOWN',
        statusCode: res.statusCode,
        responseTimeMs: res.responseTimeMs,
        timestamp: res.timestamp
      });
    }

    // SSL Expiry Warning Alert: if certificate is set to expire in less than 14 days, send a warning
    if (sslExpiryDays !== null && sslExpiryDays <= 14 && targetStatus === 'ONLINE') {
      const sslAlertKey = `ssl_alert_sent_${monitor.id}`;
      const alreadySent = await prisma.setting.findUnique({ where: { key: sslAlertKey } });
      if (!alreadySent) {
        await sendTelegramAlert({
          siteName: `${monitor.name} (SSL EXPIRING SOON)`,
          url: monitor.url,
          status: 'DEGRADED',
          statusCode: res.statusCode,
          responseTimeMs: res.responseTimeMs,
          error: `TLS Certificate is set to expire in ${sslExpiryDays} days! Please renew it soon.`,
          timestamp: res.timestamp
        });
        await prisma.setting.create({
          data: { key: sslAlertKey, value: 'true' }
        });
      }
    }

    console.log(`🔍 [${targetStatus}] ${monitor.name} (${res.responseTimeMs}ms) SSL Expiry: ${sslExpiryDays ?? 'N/A'} days | Failures: ${newConsecutiveFailures}/3 | Code: ${res.statusCode ?? 'N/A'}`);
  }

  console.log(`\n--------------------------------------------------\n`);
}
