# Nhật Ký Phát Triển Dự Án - UptimePulse

Tài liệu này dùng để lưu lại tiến độ phát triển, cấu trúc hệ thống và trạng thái hiện tại để tránh mất thông tin giữa các phiên làm việc của AI Agent.

---

## 📌 Trạng Thái Hiện Tại
- **Milestone**: Nâng cấp dự án lên hệ thống SaaS đa người dùng, chống spam alert 3 lần liên tiếp, giao diện Responsive chuẩn di động.
- **Tiến độ**: Đã hoàn thành 100% tất cả các giai đoạn nâng cấp, bao gồm đồng bộ database, viết backend logic phân quyền & chống spam threshold, nâng cấp frontend UI đăng nhập/đăng ký kép và loại bỏ hoàn toàn text Freelancer.
- **Trạng thái**: Hoạt động mượt mà cả local và live.

---

## 🛠️ Cấu Hình Hệ Thống

### 1. Database & ORM
- **Engine**: Prisma v7.9.0
- **Database**: Cloud PostgreSQL (Neon.tech)
- **Chuỗi kết nối**: Cấu hình trong `backend/.env` (DATABASE_URL)
- **Schema mới**:
  - `User` liên kết 1-N với `Monitor` (userId là khóa ngoại bắt buộc).
  - `Monitor` có trường `consecutiveFailures` để theo dõi chu kỳ sập liên tiếp.

### 2. Live Deployments
- **Frontend (Vercel)**: Tự động deploy mỗi khi push code lên GitHub.
- **Backend (Render)**: Deploy qua Dockerfile tự động.

---

## 📋 Checklist Công Việc Đang Thực Hiện
- [x] Cập nhật `schema.prisma` với `userId` và `consecutiveFailures`
- [x] Đồng bộ cơ sở dữ liệu PostgreSQL (chạy `db push --force-reset` thành công)
- [x] Cập nhật logic `checker.ts` (Ping và sập liên tiếp 3 lần)
- [x] Cấu hình API đăng ký `POST /api/auth/register` và giới hạn API theo `userId`
- [x] Cập nhật Frontend UI (`App.tsx` & `AuthModal.tsx` thay thế LoginModal)
