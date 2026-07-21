import axios from 'axios';
import dotenv from 'dotenv';
import { db } from '../db/database.js';

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

export function getTelegramConfig() {
  const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_token'").get() as { value: string } | undefined;
  const chatIdRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get() as { value: string } | undefined;
  const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'telegram_enabled'").get() as { value: string } | undefined;

  const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = chatIdRow?.value || process.env.TELEGRAM_CHAT_ID || '';
  const enabled = enabledRow ? enabledRow.value === 'true' : (process.env.TELEGRAM_ALERT_ENABLED === 'true');

  return { token, chatId, enabled };
}

export async function sendTelegramAlert(data: AlertData): Promise<{ success: boolean; message: string }> {
  const { token, chatId, enabled } = getTelegramConfig();

  const emoji = data.status === 'DOWN' ? '🚨' : '⚠️';

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
🔧 _Real-Time Uptime Monitoring System_
  `.trim();

  if (!enabled || !token || !chatId) {
    const infoMsg = `[TELEGRAM SIMULATION] Alert triggered for ${data.siteName} (${data.status}). Configure Telegram Token & Chat ID in Settings to receive real phone notifications.`;
    console.log(infoMsg);
    return { success: false, message: infoMsg };
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(telegramUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log(`✅ [TELEGRAM ALERT SENT] Successfully notified channel for ${data.siteName}`);
    return { success: true, message: 'Alert sent to Telegram successfully' };
  } catch (err: any) {
    const errMsg = err.response?.data?.description || err.message || 'Failed to send Telegram message';
    console.error(`❌ [TELEGRAM ERROR]`, errMsg);
    return { success: false, message: errMsg };
  }
}

export async function testTelegramConnection(token: string, chatId: string): Promise<{ success: boolean; message: string }> {
  if (!token || !chatId) {
    return { success: false, message: 'Both Telegram Bot Token and Chat ID are required' };
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(telegramUrl, {
      chat_id: chatId,
      text: `🚀 *[TEST MESSAGE]*\n\nYour Uptime Monitor Telegram Integration is configured and working perfectly!`,
      parse_mode: 'Markdown'
    });

    // Persist working credentials to database
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('telegram_token', ?)").run(token);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('telegram_chat_id', ?)").run(chatId);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('telegram_enabled', 'true')").run();

    return { success: true, message: 'Test message sent! Telegram credentials saved.' };
  } catch (err: any) {
    const errMsg = err.response?.data?.description || err.message || 'Connection failed';
    return { success: false, message: `Telegram test failed: ${errMsg}` };
  }
}
