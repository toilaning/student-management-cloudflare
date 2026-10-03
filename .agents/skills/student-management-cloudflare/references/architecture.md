# Kiến trúc & Cấu hình

## Sơ đồ luồng

```
Browser  ->  Cloudflare Worker (Next.js/OpenNext, API routes)
                     |
                     +-- Supabase Auth (JWT)
                     +-- Supabase PostgREST  (mặc định, dùng anon key + RLS)
                     +-- Supabase Storage    (ảnh, tài liệu)
                     +-- Hyperdrive -> Postgres  (chỉ khi cần raw SQL/hiệu năng)
                     |
                     +-- Sentry (errors, traces)
```

## Cấu trúc thư mục mục tiêu

```
app/                # route, page, layout (Next.js)
components/         # component UI tái sử dụng
lib/
  supabase/         # client, server client, middleware
  auth/             # helper phân quyền theo role
  db/               # truy vấn, types
supabase/
  migrations/       # migration SQL có timestamp
  seed.sql
scripts/            # script tiện ích (migration, seed)
wrangler.toml       # cấu hình Worker
.agents/skills/     # skill của dự án
```

## Biến môi trường

| Tên | Phạm vi | Ghi chú |
|-----|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | công khai được |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | công khai, phụ thuộc RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | tuyệt đối không lộ ra client |
| `SENTRY_DSN` | server | DSN của Worker |
| `NEXT_PUBLIC_SENTRY_DSN` | client | DSN phía browser (nếu dùng) |
| `SUPABASE_DB_URL` | server | chỉ khi dùng Hyperdrive |

Local: `.dev.vars` (không commit). Production: `wrangler secret put <NAME>`.

## Truy cập database từ Worker

Workers không mở kết nối TCP Postgres trực tiếp. Hai đường hợp lệ:

1. PostgREST qua `@supabase/supabase-js` với anon key + RLS (mặc định, đơn giản nhất).
2. Hyperdrive + driver Postgres qua TCP pooling (khi cần raw SQL, transaction, hoặc hiệu năng cao).

Không dùng service role key ở client. Nếu cần quyền cao, chỉ gọi trong route server.

## RLS & phân quyền

- Mọi bảng bật RLS: `alter table <t> enable row level security;`.
- Policy theo `auth.uid()` và role trong bảng `profiles`.
- Bốn vai trò: `admin`, `teacher`, `student`, `parent`.
- Kiểm tra quyền ở cả tầng DB (RLS) lẫn tầng route (guard) để phòng thủ nhiều lớp.

## CI/CD

- PR mở vào `main`: chạy lint, test, build, và `wrangler deploy --dry-run`.
- Deploy production khi merge vào `main` bằng GitHub Actions với `CLOUDFLARE_API_TOKEN`.
- Migration Supabase chạy qua CLI `supabase db push` trong pipeline hoặc thủ công có kiểm soát.

