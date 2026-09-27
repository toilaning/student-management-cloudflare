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

