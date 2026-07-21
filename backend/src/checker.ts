import axios from 'axios';
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
      validateStatus: () => true, // Don't throw error on non-2xx status code
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

// Target test URLs
const TARGETS = [
  { name: 'Google Search API', url: 'https://www.google.com' },
  { name: 'GitHub Status API', url: 'https://api.github.com' },
  { name: 'HTTPBin Mock 500 Error', url: 'https://httpbin.org/status/500' },
  { name: 'HTTPBin Mock Slow Response', url: 'https://httpbin.org/delay/3' }
];

export async function runHealthCheck() {
  console.log(`\n==================================================`);
  console.log(`🚀 [LINUX DEV LOG] Running Health Checker at ${new Date().toLocaleString()}`);
  console.log(`==================================================\n`);

  for (const target of TARGETS) {
    process.stdout.write(`🔍 Checking ${target.name} (${target.url})... `);
    const result = await pingUrl(target.name, target.url);
    
    if (result.status === 'ONLINE') {
      console.log(`✅ [${result.status}] Code: ${result.statusCode} | Latency: ${result.responseTimeMs}ms`);
    } else {
      const isDown = result.status === 'DOWN';
      const badge = isDown ? '❌' : '⚠️';
      console.log(`${badge} [${result.status}] Code: ${result.statusCode ?? 'N/A'} | Latency: ${result.responseTimeMs}ms | Error: ${result.error || 'High Latency'}`);

      // Send alert notification
      await sendTelegramAlert({
        siteName: target.name,
        url: target.url,
        status: result.status,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        error: result.error,
        timestamp: result.timestamp
      });
    }
  }
  
  console.log(`\n--------------------------------------------------\n`);
}

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].endsWith('checker.ts')) {
  runHealthCheck();
}
