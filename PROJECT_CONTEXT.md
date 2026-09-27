# PROJECT_CONTEXT.md — Student Management (Cloudflare)

> Bản đồ dự án. **Đọc file này TRƯỚC khi sửa bất cứ thứ gì.**
> Nguyên tắc làm việc: chỉ load đúng file liên quan tới thay đổi, KHÔNG quét toàn bộ repo.

---

## 1. Định danh dự án

| Mục | Giá trị |
|---|---|
| **Đường dẫn** | `/Users/toilaning/projects/student-management-cloudflare` |
| **Tên package** | `student-management-local` |
| **Loại** | Next.js 14 (App Router) + TypeScript + TailwindCSS |
| **Deploy** | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`) |
| **DB** | Supabase Cloud PostgreSQL (project `mvcwdqzmvgjdwqnnxaxb`) |
| **Repo** | `git@github.com:toilaning/student-management-cloudflare.git` |
| **Commit mới nhất** | `7780c5e` (2026-09-24) — feat(online): bỏ ràng buộc phòng học vật lý |
| **Số file src** | ~101 files |

### Dự án KHÁC (KHÔNG nhầm lẫn)
- `/Users/toilaning/projects/student-management` — bản **cũ (local-only, trước migrate)**. Không dùng.
- `/Users/toilaning/student-management` — bản **scaffold sơ khai**. Không dùng.
- **Chỉ làm việc trên `student-management-cloudflare`.**

---

## 2. Stack & Scripts

```
next 14.2.15 · react 18 · supabase-js ^2.116 · tailwind 3.4 · lucide-react
devDeps: @opennextjs/cloudflare ^1.20.6 · wrangler ^4 · tsx · typescript 5.6
```

| Script | Lệnh |
|---|---|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Test | `npm test` (node --test tests/**/*.test.ts) |
| Deploy CF | `npm run deploy` (build opennext + wrangler deploy) |
| Preview CF | `npm run preview` |
| Discord bot | `npm run bot:start` / `bot:dev` |

---

## 3. Kiến trúc thư mục (chỉ mục, KHÔNG cần đọc hết)

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # 13 trang: dashboard, students, teachers, classes,
│   │                       #   attendance(+analytics), calendar, tuition, finance,
│   │                       #   requests, accounts, audit, guides
│   ├── teacher/            # 5 trang: dashboard, classes, schedule, attendance, requests
│   ├── student/            # 7 trang: dashboard, classes, schedule, attendance,
│   │                       #   tuition, requests, settings
│   ├── login/              # đăng nhập
│   └── api/                # 40 API routes (xem mục 5)
├── components/             # UI theo domain: admin, teacher, student, attendance,
│   │                       #   tuition, common
├── context/AppContext.tsx  # state toàn cục
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── discordAuth.ts      # auth cho Discord bot
├── repositories/           # Data-access layer
│   ├── IRepository.ts          # interface chuẩn (hợp đồng dữ liệu)
│   ├── SupabaseRepository.ts   # impl production (Supabase)
│   ├── LocalRepository.ts      # impl in-memory (test offline)
│   ├── GoogleAppsScriptRepository.ts  # impl legacy GAS
│   └── index.ts                # chọn impl theo DATA_SOURCE
├── services/               # Business logic
│   ├── AuthService · StudentService · ConflictEngine · BulkScheduleService
│   ├── ShiftService · TuitionPayrollService · LedgerService
│   ├── MonthlyPackageService · AuditService
├── types/                  # 14 file type: student, teacher, classroom, schedule,
│                           #   attendance, finance, package, ledger, bank, auth,
│                           #   notification, audit, monthlyPackage
└── utils/

tests/                      # 19 test files (node:test)
discord-bot/src/            # bot: api.js, commands/, events/, cron/, config.js
scripts/seed-gas.ts         # seed dữ liệu từ Google Apps Script
supabase/                   # 11 SQL scripts (schema, migrations, rebuild master)
*.md                        # 19 SPEC files (đặc tả tính năng)
```

---

## 4. Kiến trúc dữ liệu (Repository Pattern)

- **Có 3 implementation của `IRepository`**, chọn qua env `DATA_SOURCE`:
  - `supabase` → `SupabaseRepository` (production, Supabase Cloud)
  - `local` → `LocalRepository` (in-memory, test/offline)
  - Legacy: `GoogleAppsScriptRepository`
- **Thêm/sửa field dữ liệu** thường phải sync 3 nơi: `types/`, `IRepository.ts`, `SupabaseRepository.ts` (+ `LocalRepository.ts` nếu test dùng).
- Có **2-way sync** user↔student↔teacher ở DB level (Postgres trigger).

---

## 5. API Routes (src/app/api/) — 40 endpoints

```
attendance/            route.ts, current-session, analytics
audit/                 route.ts
auth/login/            route.ts
classes/               route.ts, enroll
discord/               attendance, attendance/single, student-class
finance/               route.ts, ledger, expenses
notifications/         route.ts
packages/              route.ts
payment/webhook/       route.ts          # VietQR webhook
requests/              route.ts
schedule/              route.ts, bulk-generate, bulk-daily-action, bulk-update-future
settings/bank/         route.ts
shifts/                route.ts
students/              route.ts, [id]
teachers/              route.ts
users/                 route.ts
```

---

## 6. Miền nghiệp vụ chính

1. **Phân quyền**: 3 role — `admin` / `teacher` / `student`, mỗi role có portal riêng.
2. **Lớp học & lịch**: class, classroom, schedule slot, shift, bulk schedule.
3. **Điểm danh (attendance)**: session theo giờ thực, timezone `Asia/Saigon`, analytics.
4. **Học phí & lương (finance)**: tuition invoice, payroll/`sessionRate`, ledger, expense, VietQR webhook, monthly package, monthly rollover.
5. **Conflict Engine**: phát hiện trùng lịch real-time. **Lưu ý:** model 100% online — 1 GV có thể dạy nhiều lớp cùng lúc, KHÔNG còn chặn teacher-conflict (commit `0f0c3fc`).
6. **Discord bot**: điểm danh qua Discord, orientation room, cron.
7. **Hệ thống phụ**: notification, request (gửi yêu cầu), audit log, milestone/package.

---

## 7. Quy tắc làm việc khi sửa lắt nhắt

> Người dùng đã tuyên bố: **từ giờ chỉ sửa nhỏ, không cần load hết dự án.**

1. **Đọc PROJECT_CONTEXT.md này trước** → xác định đúng 1–3 file cần chạm.
2. Chỉ `read` đúng file liên quan + file type/interface nó phụ thuộc. Không dump cả repo.
3. Sửa xong → chạy `npm test` (hoặc test file liên quan) nếu logic chạm business rule.
4. Tuân thủ **pipeline model** trong `AGENTS.md` của workspace `coding_agent`
   (MANAGER → WORKER → TESTER qua `sessions_spawn`). Việc model nằm trong AGENTS.md, không lặp ở đây.
5. **An toàn DB**: mọi thay đổi schema/sync phải phản ánh vào `supabase/*.sql`.
   Không sửa production DB trực tiếp khi chưa xác nhận.

---

## 8. Bản đồ tra cứu nhanh (Task → File)

| Cần sửa… | Mở file |
|---|---|
| Trang Admin X | `src/app/admin/X/page.tsx` |
| Trang Teacher X | `src/app/teacher/X/page.tsx` |
| Trang Student X | `src/app/student/X/page.tsx` |
| API endpoint `/api/X` | `src/app/api/X/route.ts` |
| Logic nghiệp vụ X | `src/services/X.ts` |
| Truy vấn DB X | `src/repositories/SupabaseRepository.ts` (+ `IRepository.ts`) |
| Kiểu dữ liệu X | `src/types/X.ts` |
| UI component X | `src/components/<domain>/...` |
| Schema/migration | `supabase/*.sql` |
| Đặc tả tính năng | `*_SPEC.md` (tên file = tên tính năng) |
| Test tính năng X | `tests/*X*.test.ts` |
| Discord bot | `discord-bot/src/...` |
| State toàn cục | `src/context/AppContext.tsx` |

---

_Cập nhật lần cuối: 2026-09-27 — tạo bởi ORCHESTRATOR (coding_agent)._
