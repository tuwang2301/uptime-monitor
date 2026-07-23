import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/database.js';
import { pingUrl } from '../checker.js';
import { sendTelegramAlert, getTelegramConfig, testTelegramConnection } from '../services/telegram.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_prod';

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/auth/register - Sign Up new user (SaaS Multi-tenant capability)
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    // Check if username is already taken
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });

    // Auto-login on successful registration
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser.id, username: newUser.username }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me - Check current token session
router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});


// ==========================================
// PUBLIC MONITOR ENDPOINTS (Scoped or Showcase Demo)
// ==========================================

// GET /api/monitors - Get monitored services for authenticated user, or default demo user
router.get('/monitors', async (req: Request, res: Response) => {
  try {
    let userId = 1; // Default to demo admin user (ID 1)
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      } catch {
        // Fall back to demo user on invalid token
      }
    }

    const monitors = await prisma.monitor.findMany({
      where: { userId },
      orderBy: { id: 'desc' }
    });

    const result = await Promise.all(
      monitors.map(async (m) => {
        const logs = await prisma.pingLog.findMany({
          where: { monitorId: m.id },
          take: 20,
          orderBy: { id: 'desc' },
          select: {
            status: true,
            responseTimeMs: true,
            createdAt: true
          }
        });

        const totalPings = await prisma.pingLog.count({
          where: { monitorId: m.id }
        });
        
        const onlinePings = await prisma.pingLog.count({
          where: {
            monitorId: m.id,
            status: { not: 'DOWN' }
          }
        });

        const uptimePct = totalPings > 0
          ? Number(((onlinePings / totalPings) * 100).toFixed(2))
          : 100;

        return {
          id: m.id.toString(),
          name: m.name,
          url: m.url,
          intervalSec: m.intervalSec,
          status: m.isActive ? m.status : 'PAUSED',
          statusCode: m.statusCode,
          responseTimeMs: m.responseTimeMs,
          sslExpiryDays: m.sslExpiryDays,
          lastChecked: m.lastChecked?.toISOString() || null,
          isActive: m.isActive,
          uptimePct,
          history: logs.reverse().map((l: any) => ({
            timestamp: l.createdAt.toLocaleTimeString(),
            latency: l.responseTimeMs,
            status: l.status
          }))
        };
      })
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stats - Global Dashboard Stats for authenticated or demo user
router.get('/stats', async (req: Request, res: Response) => {
  try {
    let userId = 1;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      } catch {}
    }

    const total = await prisma.monitor.count({ where: { userId } });
    const online = await prisma.monitor.count({ where: { status: 'ONLINE', isActive: true, userId } });
    const degraded = await prisma.monitor.count({ where: { status: 'DEGRADED', isActive: true, userId } });
    const down = await prisma.monitor.count({ where: { status: 'DOWN', isActive: true, userId } });

    const avgLatencyRes = await prisma.monitor.aggregate({
      where: { responseTimeMs: { gt: 0 }, isActive: true, userId },
      _avg: { responseTimeMs: true }
    });
    const avgLatency = avgLatencyRes._avg.responseTimeMs || 0;

    const totalLogs = await prisma.pingLog.count({
      where: { monitor: { userId } }
    });
    const onlineLogs = await prisma.pingLog.count({
      where: { 
        status: { not: 'DOWN' },
        monitor: { userId }
      }
    });
    
    const overallUptimePct = totalLogs > 0
      ? Number(((onlineLogs / totalLogs) * 100).toFixed(2))
      : 100;

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==========================================
// SECURED ADMIN ENDPOINTS (Require Authentication + Ownership Scoping)
// ==========================================

// POST /api/monitors - Add new monitor
router.post('/monitors', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, url, intervalSec } = req.body;
    const userId = req.user.id;

    if (!name || !url) {
      return res.status(400).json({ success: false, error: 'Name and URL are required' });
    }

    const created = await prisma.monitor.create({
      data: {
        name,
        url,
        intervalSec: intervalSec ? parseInt(String(intervalSec), 10) : 60,
        status: 'PENDING',
        userId
      }
    });

    // Run initial ping check immediately
    const checkRes = await pingUrl(name, url);
    
    await prisma.monitor.update({
      where: { id: created.id },
      data: {
        status: checkRes.status,
        statusCode: checkRes.statusCode,
        responseTimeMs: checkRes.responseTimeMs,
        lastChecked: new Date(checkRes.timestamp)
      }
    });

    await prisma.pingLog.create({
      data: {
        monitorId: created.id,
        status: checkRes.status,
        statusCode: checkRes.statusCode,
        responseTimeMs: checkRes.responseTimeMs,
        errorMessage: checkRes.error || null,
        createdAt: new Date(checkRes.timestamp)
      }
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/monitors/:id - Update monitor properties (scoped to logged-in user)
router.patch('/monitors/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const monitorId = parseInt(String(id), 10);
    const { name, url, intervalSec, isActive } = req.body;
    const userId = req.user.id;

    if (isNaN(monitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    const updated = await prisma.monitor.update({
      where: { id: monitorId, userId },
      data: {
        name,
        url,
        intervalSec: intervalSec !== undefined ? parseInt(String(intervalSec), 10) : undefined,
        isActive: isActive !== undefined ? isActive === true : undefined
      }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/monitors/:id - Remove monitor (scoped to logged-in user)
router.delete('/monitors/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const monitorId = parseInt(String(id), 10);
    const userId = req.user.id;

    if (isNaN(monitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    await prisma.monitor.delete({
      where: { id: monitorId, userId }
    });

    res.json({ success: true, message: 'Monitor deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/monitors/:id/ping - Manual trigger ping (scoped to logged-in user)
router.post('/monitors/:id/ping', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const monitorId = parseInt(String(id), 10);
    const userId = req.user.id;

    if (isNaN(monitorId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId, userId }
    });

    if (!monitor) {
      return res.status(404).json({ success: false, error: 'Monitor not found' });
    }

    const checkRes = await pingUrl(monitor.name, monitor.url);

    await prisma.monitor.update({
      where: { id: monitorId },
      data: {
        status: checkRes.status,
        statusCode: checkRes.statusCode,
        responseTimeMs: checkRes.responseTimeMs,
        lastChecked: new Date(checkRes.timestamp)
      }
    });

    await prisma.pingLog.create({
      data: {
        monitorId: monitorId,
        status: checkRes.status,
        statusCode: checkRes.statusCode,
        responseTimeMs: checkRes.responseTimeMs,
        errorMessage: checkRes.error || null,
        createdAt: new Date(checkRes.timestamp)
      }
    });

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/settings/telegram - Get Telegram Config
router.get('/settings/telegram', requireAuth, async (req: Request, res: Response) => {
  const config = await getTelegramConfig();
  res.json({ success: true, data: config });
});

// POST /api/settings/telegram/test - Test & Save Telegram Credentials
router.post('/settings/telegram/test', requireAuth, async (req: Request, res: Response) => {
  const { token, chatId } = req.body;
  const result = await testTelegramConnection(token, chatId);
  res.json(result);
});

export default router;
