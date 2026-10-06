# Observability với Sentry

## Điều kiện

- Cần biến `SENTRY_AUTH_TOKEN` (read-only: `project:read`, `event:read`, `org:read`).
- Không bao giờ dán token vào chat; đặt qua biến môi trường cục bộ.

## Lệnh thường dùng

```bash
export SENTRY_API="$CODEX_HOME/plugins/cache/openai-api-curated/sentry/5fd93af4/skills/sentry/scripts/sentry_api.py"

# Liệt kê issue chưa xử lý trong 24h
python3 "$SENTRY_API" --org <org> --project <project> list-issues \
  --environment prod --time-range 24h --limit 20 --query "is:unresolved"

# Chi tiết một issue
python3 "$SENTRY_API" --org <org> --project <project> issue-detail <issue_id>

# Event của issue
python3 "$SENTRY_API" --org <org> --project <project> issue-events <issue_id> \
  --environment prod --time-range 24h --limit 20
```

## Quy tắc đầu ra

- Liệt kê: title, short_id, status, first_seen, last_seen, count, environment.
- Che PII (email, IP) trước khi báo cáo.
- Không in stack trace thô.
- Không kết luận khi chưa gọi API thật.

## Khi nào kiểm tra

- Trước khi release để biết lỗi tồn đọng.
- Ngay sau deploy.
- Khi người dùng báo lỗi nhưng chưa rõ nguyên nhân.

