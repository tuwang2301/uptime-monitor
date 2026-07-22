import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Instantiate adapter directly with url option as required by Prisma 7
const adapter = new PrismaBetterSqlite3({
  url: 'file:./data/uptime.db'
});

export const prisma = new PrismaClient({ adapter });

// Database seed helper for initial monitors and default admin user
export async function initDatabase() {
  try {
    await prisma.$connect();
    
    // Seed default monitors
    const count = await prisma.monitor.count();
    if (count === 0) {
      await prisma.monitor.createMany({
        data: [
          { name: 'Google Search', url: 'https://www.google.com', intervalSec: 60 },
          { name: 'GitHub REST API', url: 'https://api.github.com', intervalSec: 60 },
          { name: 'HTTPBin Status 500 Mock', url: 'https://httpbin.org/status/500', intervalSec: 30 }
        ]
      });
      console.log('🌱 [DATABASE] Default monitors seeded successfully.');
    }

    // Seed default admin user (username: admin, password: admin)
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword
        }
      });
      console.log('🌱 [DATABASE] Default admin user (admin/admin) seeded successfully.');
    }
  } catch (error) {
    console.error('❌ [DATABASE] Failed to initialize database client:', error);
  }
}
