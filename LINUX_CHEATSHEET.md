# 🐧 Linux & DevOps Cheatsheet - Thực Hành Dòng Lệnh

Sổ tay hướng dẫn sử dụng các câu lệnh Linux căn bản đến nâng cao dành cho lập trình viên Backend, DevOps và Freelancers.

---

## 1. Thao Tác Thư Mục & File Căn Bản (Basic CLI)

| Lệnh | Ý nghĩa | Ví dụ thực tế |
| --- | --- | --- |
| `pwd` | Hiển thị đường dẫn thư mục hiện tại | `pwd` |
| `ls -la` | Liệt kê tất cả các file (kể cả file ẩn `.env`) | `ls -la backend/` |
| `cd <path>` | Di chuyển giữa các thư mục | `cd backend` |
| `mkdir -p` | Tạo thư mục (tạo luôn các thư mục cha nếu chưa có) | `mkdir -p backend/src/services` |
| `touch <file>` | Tạo file rỗng mới | `touch backend/.env` |
| `cat <file>` | Đọc nội dung file ra màn hình | `cat backend/package.json` |
| `rm -rf <dir>` | Xóa file hoặc thư mục nguy hiểm (cần cẩn trọng!) | `rm -rf dist` |

---

## 2. Quản Lý Biến Môi Trường (Environment Variables)

| Lệnh | Ý nghĩa | Ví dụ thực tế |
| --- | --- | --- |
| `export VAR=val` | Thiết lập biến môi trường tạm thời trong session | `export PORT=4000` |
| `echo $VAR` | In giá trị biến môi trường | `echo $PORT` |
| `env` / `printenv` | In toàn bộ các biến môi trường hệ thống | `printenv | grep PORT` |

---

## 3. Kiểm Tra Mạng & HTTP (Networking & Curl)

| Lệnh | Ý nghĩa | Ví dụ thực tế |
| --- | --- | --- |
| `curl -I <url>` | Gửi yêu cầu HTTP HEAD kiểm tra Status Code | `curl -I https://www.google.com` |
| `curl -X POST` | Gửi dữ liệu JSON tới API endpoint | `curl -X POST http://localhost:4000/api/monitors` |
| `ping <host>` | Kiểm tra kết nối mạng (ICMP Echo) | `ping google.com` |
| `netstat` / `ss` | Kiểm tra port nào đang mở trên Linux | `ss -tulpn | grep 4000` |

---

## 4. Quản Lý Tiến Trình (Process & Logs)

| Lệnh | Ý nghĩa | Ví dụ thực tế |
| --- | --- | --- |
| `ps aux` | Liệt kê các tiến trình đang chạy trên Linux | `ps aux | grep node` |
| `kill -9 <PID>` | Ép dừng một tiến trình bằng Process ID | `kill -9 12345` |
| `head -n 20` | Xem 20 dòng đầu tiên của file log | `head -n 20 app.log` |
| `tail -f <file>` | Theo dõi file log liên tục theo thời gian thực | `tail -f app.log` |
| `grep <pattern>` | Tìm kiếm chuỗi ký tự trong file log | `grep "DOWN" app.log` |

---

## 5. Docker & Containerization (Giai đoạn 4)

| Lệnh | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `docker build -t <name> .` | Build Docker Image từ Dockerfile | `docker build -t uptime-backend ./backend` |
| `docker run -d -p 4000:4000` | Chạy container dưới nền (detached mode) | `docker run -d -p 4000:4000 uptime-backend` |
| `docker ps` | Xem danh sách các container đang chạy | `docker ps` |
| `docker logs -f <id>` | xem log trực tiếp từ container Linux | `docker logs -f <container_id>` |
| `docker compose up -d` | Khởi động full-stack (Backend + Frontend + DB) | `docker compose up -d` |
