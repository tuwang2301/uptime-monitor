import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface AlertData {
  siteName: string;
  url: string;
  status: 'DEGRADED' | 'DOWN';
  statusCode: number | null;
  responseTimeMs: number;
  error?: string;
  timestamp: string;
}

export async function sendTelegramAlert(data: AlertData): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const enabled = process.env.TELEGRAM_ALERT_ENABLED === 'true';

  const emoji = data.status === 'DOWN' ? '🚨' : '⚠️';
  const statusTitle = data.status === 'DOWN' ? 'CRITICAL INCIDENT: SITE DOWN' : 'PERFORMANCE WARNING: DEGRADED';

  const message = `
${emoji} *[UPTIME MONITOR ALERT]* ${emoji}
------------------------------------
📌 *Service:* ${data.siteName}
🌐 *URL:* \`${data.url}\`
📊 *Status:* *${data.status}*
🔢 *HTTP Code:* \`${data.statusCode ?? 'N/A'}\`
⏱️ *Latency:* \`${data.responseTimeMs}ms\`
❌ *Detail:* _${data.error || 'High Latency / Non-2xx Code'}_
⏰ *Time:* \`${data.timestamp}\`
------------------------------------
🔧 _Antigravity Uptime Bot System_
  `.trim();

  // If Telegram credentials are missing or disabled, simulate alert in terminal
  if (!enabled || !token || !chatId) {
    console.log(`\n[TELEGRAM SIMULATOR LOG] Alert would be sent to Telegram:`);
    console.log(message);
    console.log(`(Set TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID in backend/.env to send real alerts)\n`);
    return false;
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(telegramUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log(`✅ [TELEGRAM ALERT SENT] Successfully notified channel for ${data.siteName}`);
    return true;
  } catch (err: any) {
    console.error(`❌ [TELEGRAM ERROR] Failed to send alert:`, err.response?.data || err.message);
    return false;
  }
}
