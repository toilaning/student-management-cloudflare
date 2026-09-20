import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || undefined;
  const role = searchParams.get('role') || undefined;

  const notifications = await repo.getNotifications(userId, role);
  return NextResponse.json({ notifications });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, userId, role, title, message, type = 'INFO', link, recipientRole = 'ALL', recipientUserId } = body;

    // Đánh dấu đã đọc 1 thông báo
    if (action === 'MARK_READ' && id) {
      await repo.markNotificationAsRead(id);
      return NextResponse.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc' });
    }

    // Đánh dấu đã đọc tất cả
    if (action === 'MARK_ALL_READ') {
      await repo.markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    }

    // Tạo thông báo mới (Admin hoặc Hệ thống)
    if (title && message) {
      const created = await repo.addNotification({
        title,
        message,
        type,
        link,
        recipientRole,
        recipientUserId,
        isRead: false,
      });

      await repo.addAuditLog({
        action: 'CREATE',
        userId: userId || 'ADMIN001',
        userName: 'Quản trị viên',
        userRole: 'ADMIN',
        targetResource: 'NOTIFICATION',
        targetId: created.id,
        details: `Phát thông báo: "${title}" tới đối tượng [${recipientRole}]`,
      });

      return NextResponse.json({ success: true, notification: created });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi xử lý thông báo' }, { status: 500 });
  }
}
