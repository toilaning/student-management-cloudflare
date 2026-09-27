/**
 * Trả về chuỗi ngày hiện tại định dạng YYYY-MM-DD theo múi giờ Việt Nam (Asia/Saigon / GMT+7)
 * Đảm bảo đồng nhất tuyệt đối dù server chạy ở Cloudflare Workers (UTC), Local hay Docker.
 */
export function getTodayDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Saigon' }).format(new Date());
}

/**
 * Trả về chuỗi giờ hiện tại định dạng HH:mm theo múi giờ Việt Nam (Asia/Saigon / GMT+7)
 */
export function getNowTimeStr(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Saigon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
}

/**
 * Chuyển chuỗi HH:mm thành số phút từ đầu ngày
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Đổi số phút từ đầu ngày thành chuỗi giờ HH:mm (hỗ trợ > 24h, ví dụ 25:30).
 */
export function minutesTo24h(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Trả về chuỗi YYYY-MM-DD cho một Date cụ thể, theo múi giờ Việt Nam (Asia/Saigon).
 * Dùng để cộng/trừ ngày an toàn không bị lệch múi giờ UTC.
 */
export function getTodayDateStrByDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Saigon' }).format(d);
}

