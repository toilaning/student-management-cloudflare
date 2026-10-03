# Quy trình tính năng

## 1. Thêm một tính năng mới

1. Xác định tính năng thuộc dòng nào trong Core Feature Registry (SKILL.md).
2. Khảo sát: `graphify query "<câu hỏi>"` hoặc đọc code liên quan.
3. Nếu có UI: chạy UI-UX-Pro-Max lấy hướng style/palette/UX rules.
4. Thiết kế dữ liệu: bảng mới + RLS + policy, viết migration.
5. Viết code theo cấu trúc thư mục ở architecture.md.
6. Kiểm thử theo checklist trong SKILL.md.
7. Cập nhật Core Feature Registry sang `in-progress` rồi `done`.
8. Mở PR nhánh `codex/<slug>`.

## 2. Thay đổi schema

1. Tạo migration: `bash scripts/new-migration.sh <ten_migration>`.
2. Viết SQL lên và xuống (up/down) rõ ràng.
3. Bật RLS và thêm policy cho bảng mới.
4. Áp dụng lên DB dev: `supabase db push` hoặc chạy trong SQL editor.
5. Xác minh bằng truy vấn thật với JWT của từng role.
6. Không sửa migration đã merge; luôn tạo migration mới.

## 3. Deploy

1. Chạy checklist xác minh.
2. `wrangler deploy --dry-run` để bắt lỗi build.
3. Đặt secret cho môi trường nếu có biến mới.
4. Deploy: `wrangler deploy` (hoặc để CI làm khi merge).
5. Kiểm tra Sentry và log 30 phút đầu sau deploy.
6. Rollback: `wrangler rollback` về bản trước nếu có lỗi nghiêm trọng.

## 4. Điều tra lỗi production

1. Lấy lỗi từ Sentry (xem observability.md).
2. Xác định file/hàm liên quan bằng Graphify.
3. Tái hiện trên môi trường dev nếu có thể.
4. Sửa tối thiểu, thêm test chống hồi quy.
5. Deploy và theo dõi lại Sentry.

