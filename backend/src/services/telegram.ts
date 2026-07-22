import axios from 'axios';
import dotenv from 'dotenv';
import { prisma } from '../db/database.js';

dotenv.config();

export interface AlertData {
  siteName: string;
  url: string;
  status: 'ONLINE' | 'DEGRADED' | 'DOWN';
  oldStatus?: string;
  statusCode: number | null;
  responseTimeMs: number;
  error?: string;
  timestamp: string;
}

export async function getTelegramConfig() {
  const tokenRow = await prisma.setting.findUnique({ where: { key: 'telegram_token' } });
  const chatIdRow = await prisma.setting.findUnique({ where: { key: 'telegram_chat_id' } });
  const enabledRow = await prisma.setting.findUnique({ where: { key: 'telegram_enabled' } });

  const token = tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = chatIdRow?.value || process.env.TELEGRAM_CHAT_ID || '';
  const enabled = enabledRow ? enabledRow.value === 'true' : (process.env.TELEGRAM_ALERT_ENABLED === 'true');

  return { token, chatId, enabled };
}

export async function sendTelegramAlert(data: AlertData): Promise<{ success: boolean; message: string }> {
  const { token, chatId, enabled } = await getTelegramConfig();

  let emoji = '🚨';
  let title = 'CRITICAL INCIDENT: SITE DOWN';
  
  if (data.status === 'ONLINE') {
    emoji = '✅';
    title = 'RESOLVED: SERVICE IS ONLINE';
  } else if (data.status === 'DEGRADED') {
    emoji = '⚠️';
    title = 'PERFORMANCE WARNING: DEGRADED';
  }

  const message = `
${emoji} *[UPTIME MONITOR ALERT]* ${emoji}
*${title}*
------------------------------------
📌 *Service:* ${data.siteName}
🌐 *URL:* \`${data.url}\`
📊 *Current Status:* *${data.status}* ${data.oldStatus ? `(was ${data.oldStatus})` : ''}
🔢 *HTTP Code:* \`${data.statusCode ?? 'N/A'}\`
⏱️ *Latency:* \`${data.responseTimeMs}ms\`
❌ *Detail:* _${data.error || 'N/A'}_
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

    // Save configuration settings
    await prisma.setting.upsert({
      where: { key: 'telegram_token' },
      update: { value: token },
      create: { key: 'telegram_token', value: token }
    });

    await prisma.setting.upsert({
      where: { key: 'telegram_chat_id' },
      update: { value: chatId },
      create: { key: 'telegram_chat_id', value: chatId }
    });

    await prisma.setting.upsert({
      where: { key: 'telegram_enabled' },
      update: { value: 'true' },
      create: { key: 'telegram_enabled', value: 'true' }
    });

    return { success: true, message: 'Test message sent! Telegram credentials saved.' };
  } catch (err: any) {
    const errMsg = err.response?.data?.description || err.message || 'Connection failed';
    return { success: false, message: `Telegram test failed: ${errMsg}` };
  }
}
