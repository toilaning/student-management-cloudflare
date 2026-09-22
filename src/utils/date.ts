/**
 * Trả về chuỗi ngày hiện tại định dạng YYYY-MM-DD theo giờ địa phương (local timezone / GMT+7)
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
