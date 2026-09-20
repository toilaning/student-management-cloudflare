export type StudentStatus = 'Đang học' | 'Bảo lưu' | 'Đã tốt nghiệp';

export interface Student {
  id: string; // ST001..ST400
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Nam' | 'Nữ';
  address: string;
  status: StudentStatus;
  enrolledClassIds: string[]; // Danh sách mã lớp đang tham gia
  avatarUrl?: string;
  discordId?: string;
  discordUsername?: string;
  createdAt: string;
}
