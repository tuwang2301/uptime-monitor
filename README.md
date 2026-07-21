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

---

## 🔌 Troubleshooting: Port Management (Check & Kill Occupied Ports)

Nếu cổng `3000` hoặc `4000` bị ứng dụng khác chiếm dụng, bạn có thể kiểm tra và tắt tiến trình đó:

### 🪟 Trên Windows (PowerShell):
```powershell
# 1. Kiểm tra PID tiến trình đang chiếm port 3000
Get-NetTCPConnection -LocalPort 3000

# 2. Ngắt (Kill) tiến trình theo PID vừa tìm được (Ví dụ PID là 12345)
Stop-Process -Id 12345 -Force

# Hoặc câu lệnh 1 dòng tự động ngắt ứng dụng chiếm port 3000:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### 🐧 Trên Linux / macOS / WSL:
```bash
# 1. Kiểm tra tiến trình chiếm port 3000
lsof -i :3000

# 2. Ngắt (Kill) tiến trình trên port 3000
kill -9 $(lsof -t -i:3000)
```
