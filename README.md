# 🚀 Real-Time Web Uptime & API Monitor

> Modern, full-stack, containerized API health & uptime monitoring service built with Node.js, Express, React, Vite, Tailwind CSS, Docker, and GitHub Actions.

---

## ✨ Features

- ⚡ **Real-Time Health Ping Engine**: Measures HTTP status codes and response latency (ms).
- 🚨 **Telegram Bot Alerts**: Automated Markdown alert notifications on downtime or degraded latency (>2000ms).
- 🎨 **Modern Glassmorphic Dashboard**: SLA Uptime %, latency history bars, instant manual ping trigger, and target management.
- 🐳 **Dockerized Stack**: Multi-stage Dockerfiles based on Alpine Linux & Nginx, orchestrated via `docker-compose.yml`.
- ⚙️ **CI/CD Ready**: GitHub Actions pipeline for linting, testing, and container build on Linux runners.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, Axios, Dotenv
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **DevOps**: Docker, Nginx, Docker Compose, GitHub Actions
- **Free Tier Cloud Ready**: Render, Vercel, Supabase

---

## 🚀 Quick Start (Local Docker)

```bash
docker compose up --build -d
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api/monitors`
