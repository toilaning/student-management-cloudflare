#!/usr/bin/env bash
# Tạo file migration Supabase với timestamp.
# Dùng: bash scripts/new-migration.sh add_students_table
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Dùng: $0 <ten_migration>" >&2
  exit 1
fi

name="$1"
ts="$(date -u +%Y%m%d%H%M%S)"
dir="supabase/migrations"
mkdir -p "$dir"
file="$dir/${ts}_${name}.sql"

if [ -e "$file" ]; then
  echo "Đã tồn tại: $file" >&2
  exit 1
fi

cat > "$file" <<'SQL'
-- migration: TODO mô tả ngắn
-- up
begin;

-- TODO: viết thay đổi schema ở đây
-- alter table ... enable row level security;

commit;

-- down (ghi chú rollback, chạy thủ công khi cần)
-- begin;
-- TODO
-- commit;
SQL

echo "Đã tạo: $file"

