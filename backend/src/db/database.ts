import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || '';

// Create a pg connection pool
const pool = new pg.Pool({ 
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// Database seed helper for initial monitors and default admin user
export async function initDatabase() {
  try {
    await prisma.$connect();
    
    // 1. Seed default admin user (username: admin, password: admin)
    let adminId = 1;
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      const adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword
        }
      });
      adminId = adminUser.id;
      console.log('🌱 [DATABASE] Default admin user (admin/admin) seeded successfully.');
    } else {
      const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
      if (admin) adminId = admin.id;
    }

    // 2. Seed default monitors tied to the admin user
    const count = await prisma.monitor.count();
    if (count === 0) {
      await prisma.monitor.createMany({
        data: [
          { name: 'Google Search', url: 'https://www.google.com', intervalSec: 60, userId: adminId },
          { name: 'GitHub REST API', url: 'https://api.github.com', intervalSec: 60, userId: adminId },
          { name: 'HTTPBin Status 500 Mock', url: 'https://httpbin.org/status/500', intervalSec: 30, userId: adminId }
        ]
      });
      console.log('🌱 [DATABASE] Default monitors seeded successfully.');
    }
  } catch (error) {
    console.error('❌ [DATABASE] Failed to initialize database client:', error);
  }
}
