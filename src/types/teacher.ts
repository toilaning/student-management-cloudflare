export type TeacherStatus = 'Đang dạy' | 'Nghỉ phép';

export interface Teacher {
  id: string; // GV001..GV020
  name: string;
  email: string;
  phone: string;
  specialty: string; // Môn chuyên môn
  hourlyRate: number; // Lương mỗi giờ (vd: 250,000đ - 500,000đ)
  status: TeacherStatus;
  bio?: string;
  assignedClassIds: string[];
  createdAt: string;
}
