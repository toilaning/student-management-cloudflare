# Student Management (Cloudflare + Supabase)

Hệ thống quản lý trung tâm dạy học: điểm danh, lớp học, lịch học, học sinh, giáo viên và học phí. Chạy trên Cloudflare Workers (Next.js qua OpenNext), dữ liệu trên Supabase Postgres.

## Có gì trong này

Ba cổng giao diện riêng:

- **Admin** (`/admin`): toàn trường — tài khoản, học sinh, giáo viên, lớp, lịch, điểm danh, yêu cầu, học phí, chấm công, phân quyền.
- **Giáo viên** (`/teacher`): lớp đang dạy, điểm danh lớp mình, chấm công theo ca, lịch dạy.
- **Học sinh** (`/student`): điểm danh nhanh, lịch học, lớp, học phí, yêu cầu.

## Chạy tại máy

```bash
npm install
cp .env.example .env.local   # điền SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY
npm run dev                  # http://localhost:3000
```

Mặc định `DATA_SOURCE` là `local` (dữ liệu in-memory) nên chạy được ngay khi chưa cấu hình Supabase.

Biến môi trường chính:

| Biến | Ý nghĩa |
|------|---------|
| `DATA_SOURCE` | `local` (in-memory) hoặc `supabase` (production) |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa server-side, chỉ dùng ở phía server |

## Cơ sở dữ liệu

- `supabase/setup.sql` — script duy nhất để dựng database. Mở Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.

Script chạy được nhiều lần trên cùng một database: database trống thì tạo mới, database đang chạy thì chỉ bổ sung phần còn thiếu và không xoá dữ liệu. Nó tạo đủ bảng, ràng buộc, index, trigger đồng bộ users/teachers/students, bật RLS cho mọi bảng và nạp sẵn danh mục nền (ca làm việc, gói combo, phòng học).

Không có dữ liệu mẫu trong repo. Sau khi chạy `setup.sql`, tạo tài khoản quản trị đầu tiên bằng câu lệnh SQL ở cuối file hoặc qua Supabase Auth rồi thêm bản ghi vào bảng `users`.

## Kiểm tra

```bash
npm test                      # node:test
./node_modules/.bin/tsc --noEmit
npm run build
```

## Deploy

```bash
npm run deploy                # opennextjs-cloudflare build + wrangler deploy
```

Cấu hình Worker ở `wrangler.toml`.

## Cấu trúc thư mục

```
src/app/            route theo cổng (admin / teacher / student / api)
src/components/     UI dùng chung và theo domain
src/services/       logic nghiệp vụ
src/repositories/   truy cập dữ liệu (local / supabase)
src/types/          kiểu dữ liệu
supabase/           schema, migrations
docs/archive/       đặc tả tính năng cũ
tests/              test
```

Đặc tả kiến trúc chi tiết: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
