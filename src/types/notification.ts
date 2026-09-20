export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'SCHEDULE' | 'PAYMENT' | 'REQUEST';

export interface AppNotification {
  id: string;
  recipientRole?: 'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT';
  recipientUserId?: string; // Null nếu gửi cho role
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
