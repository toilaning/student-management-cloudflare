export interface Classroom {
  id: string; // P.101..P.305
  name: string;
  capacity: number; // Sức chứa (vd: 30)
  facilities: string[]; // Máy chiếu, Điều hòa, Micro, Bảng thông minh...
  status: 'Khả dụng' | 'Bảo trì';
}

export interface ClassEntity {
  id: string; // CLS01..CLS30
  code: string; // MATH101, ENG201, etc.
  name: string;
  subject: string;
  teacherId: string; // GV001..
  roomId: string; // P.101..
  studentIds: string[]; // ST001..
  tuitionFee: number; // Học phí/học viên cho khóa này
  scheduleDays: number[]; // 2, 3, 4, 5, 6, 7 (T2 đến T7)
  shiftId: number; // 1, 2, 3, 4, 5
  meetingLink?: string; // Link phòng học Discord / Room Link
  status: 'Đang mở' | 'Sắp khai giảng' | 'Đã kết thúc';
}
