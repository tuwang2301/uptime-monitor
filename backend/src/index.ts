import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initDatabase } from './db/database.js';
import { runAllDatabaseMonitors } from './checker.js';

dotenv.config();

// Initialize SQLite Database
initDatabase();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint for Cloud (Render, AWS, Railway)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Run initial health check on server start
runAllDatabaseMonitors();

// Periodic background health check (Every 60 seconds)
const CHECK_INTERVAL_MS = 60000;
setInterval(() => {
  runAllDatabaseMonitors();
}, CHECK_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`
🚀 ===================================================
🌐 Uptime Monitor Server with SQLite DB is running on port ${PORT}
📡 API Endpoint: http://localhost:${PORT}/api/monitors
❤️ Health Status: http://localhost:${PORT}/health
===================================================
  `);
});
