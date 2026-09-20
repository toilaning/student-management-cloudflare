import { User } from '@/types/auth';
import { Student } from '@/types/student';
import { Teacher } from '@/types/teacher';
import { Classroom, ClassEntity } from '@/types/classroom';
import { ScheduleSlot, ClassRequest, TIME_SHIFTS } from '@/types/schedule';
import { AttendanceRecord } from '@/types/attendance';
import { TuitionInvoice, PayrollRecord } from '@/types/finance';
import { AuditLog } from '@/types/audit';

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM_NAM = ['Văn', 'Hữu', 'Đức', 'Thành', 'Minh', 'Quốc', 'Gia', 'Bảo', 'Tuấn', 'Hải', 'Xuân', 'Đăng'];
const DEM_NU = ['Thị', 'Ngọc', 'Phương', 'Mai', 'Thùy', 'Khánh', 'Thu', 'Hương', 'Mỹ', 'Thanh', 'Như', 'Lan'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hiếu', 'Huy', 'Khoa', 'Long', 'Minh', 'Nam', 'Phong', 'Quân', 'Sơn', 'Thắng', 'Tùng', 'Việt'];
const TEN_NU = ['Anh', 'Chi', 'Dung', 'Hà', 'Hạnh', 'Hoa', 'Linh', 'Mai', 'Nga', 'Nhi', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Tuyết', 'Yến'];

const DIA_CHI = [
  'Quận 1, TP. Hồ Chí Minh',
  'Quận 3, TP. Hồ Chí Minh',
  'Quận 5, TP. Hồ Chí Minh',
  'Quận 7, TP. Hồ Chí Minh',
  'Quận 10, TP. Hồ Chí Minh',
  'Quận Bình Thạnh, TP. Hồ Chí Minh',
  'Quận Phú Nhuận, TP. Hồ Chí Minh',
  'TP. Thủ Đức, TP. Hồ Chí Minh',
  'Quận Cầu Giấy, Hà Nội',
  'Quận Đống Đa, Hà Nội',
  'Quận Hai Bà Trưng, Hà Nội',
  'Quận Thanh Xuân, Hà Nội'
];

const MON_HOC = [
  { code: 'MATH', name: 'Toán Cao Cấp', specialty: 'Toán học & Thống kê', fee: 3500000 },
  { code: 'ENG', name: 'Tiếng Anh Giao Tiếp & IELTS', specialty: 'Ngôn ngữ Anh', fee: 4500000 },
  { code: 'PROG', name: 'Lập trình Web Fullstack React/Node', specialty: 'Công nghệ thông tin', fee: 5200000 },
  { code: 'PHY', name: 'Vật Lý Ứng Dụng', specialty: 'Vật lý kỹ thuật', fee: 3200000 },
  { code: 'CHEM', name: 'Hóa Học Đại Cương', specialty: 'Hóa học & Môi trường', fee: 3200000 },
  { code: 'AI', name: 'Trí Tuệ Nhân Tạo & Python Cơ Bản', specialty: 'Khoa học dữ liệu & AI', fee: 5800000 },
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSeedData() {
  // 1. Admin
  const adminUser: User = {
    id: 'ADMIN001',
    username: 'admin',
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // SHA-256 của 'admin123'
    role: 'ADMIN',
    name: 'Quản Trị Viên Hệ Thống',
    email: 'admin@trungtam.edu.vn',
    isActive: true,
  };

  const users: User[] = [adminUser];

  // 2. 20 Giáo viên (GV001..GV020)
  const teachers: Teacher[] = [];
  const teacherRates = [250000, 300000, 350000, 400000, 500000];

  for (let i = 1; i <= 20; i++) {
    const id = `GV${i.toString().padStart(3, '0')}`;
    const isMale = i % 2 !== 0;
    const ho = HO[i % HO.length];
    const dem = isMale ? DEM_NAM[i % DEM_NAM.length] : DEM_NU[i % DEM_NU.length];
    const ten = isMale ? TEN_NAM[i % TEN_NAM.length] : TEN_NU[i % TEN_NU.length];
    const name = `${ho} ${dem} ${ten}`;
    const mon = MON_HOC[(i - 1) % MON_HOC.length];
    const rate = teacherRates[i % teacherRates.length];

    const teacher: Teacher = {
      id,
      name,
      email: `${id.toLowerCase()}@trungtam.edu.vn`,
      phone: `09${getRandomNumber(10000000, 99999999)}`,
      specialty: mon.specialty,
      hourlyRate: rate,
      status: i === 20 ? 'Nghỉ phép' : 'Đang dạy',
      bio: `Thạc sĩ/Giảng viên chuyên môn ${mon.specialty} với hơn ${getRandomNumber(4, 15)} năm kinh nghiệm đào tạo.`,
      assignedClassIds: [],
      createdAt: '2026-01-15T08:00:00.000Z',
    };
    teachers.push(teacher);

    users.push({
      id,
      username: id.toLowerCase(),
      passwordHash: 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', // 'teacher123'
      role: 'TEACHER',
      name,
      email: teacher.email,
      isActive: true,
    });
  }

  // 3. 10 Phòng học (P.101..P.305)
  const classrooms: Classroom[] = [
    { id: 'P.101', name: 'Phòng Lý Thuyết 101', capacity: 35, facilities: ['Máy chiếu', 'Điều hòa', 'Loa âm trần'], status: 'Khả dụng' },
    { id: 'P.102', name: 'Phòng Lý Thuyết 102', capacity: 35, facilities: ['Máy chiếu', 'Điều hòa', 'Loa âm trần'], status: 'Khả dụng' },
    { id: 'P.103', name: 'Phòng Hội Thảo 103', capacity: 50, facilities: ['Màn hình LED', 'Điều hòa', 'Hệ thống Micro'], status: 'Khả dụng' },
    { id: 'P.201', name: 'Phòng Lab Máy Tính 201', capacity: 30, facilities: ['30 Máy PC Core i7', 'Điều hòa', 'Mạng LAN gigabit'], status: 'Khả dụng' },
    { id: 'P.202', name: 'Phòng Lab Máy Tính 202', capacity: 30, facilities: ['30 Máy PC Core i7', 'Điều hòa', 'Mạng LAN gigabit'], status: 'Khả dụng' },
    { id: 'P.203', name: 'Phòng Ngoại Ngữ 203', capacity: 25, facilities: ['Tai nghe trợ thính', 'Bảng thông minh', 'Điều hòa'], status: 'Khả dụng' },
    { id: 'P.301', name: 'Phòng Đa Năng 301', capacity: 30, facilities: ['Bảng viết kính', 'Điều hòa', 'Máy chiếu tương tác'], status: 'Khả dụng' },
    { id: 'P.302', name: 'Phòng Thí Nghiệm 302', capacity: 25, facilities: ['Dụng cụ thí nghiệm', 'Tủ hút', 'Điều hòa'], status: 'Khả dụng' },
    { id: 'P.303', name: 'Phòng Tự Học 303', capacity: 40, facilities: ['Bàn học cá nhân', 'Wifi High-speed', 'Điều hòa'], status: 'Khả dụng' },
    { id: 'P.305', name: 'Phòng Đào Tạo Chuyên Sâu 305', capacity: 20, facilities: ['Bảng Flipchart', 'Điều hòa', 'Smart TV 75 inch'], status: 'Khả dụng' },
  ];

  // 4. 400 Học viên (ST001..ST400)
  const students: Student[] = [];
  for (let i = 1; i <= 400; i++) {
    const id = `ST${i.toString().padStart(3, '0')}`;
    const isMale = i % 2 === 0;
    const ho = HO[i % HO.length];
    const dem = isMale ? DEM_NAM[(i * 3) % DEM_NAM.length] : DEM_NU[(i * 3) % DEM_NU.length];
    const ten = isMale ? TEN_NAM[(i * 7) % TEN_NAM.length] : TEN_NU[(i * 7) % TEN_NU.length];
    const name = `${ho} ${dem} ${ten}`;
    const birthYear = getRandomNumber(2002, 2007);
    const birthMonth = getRandomNumber(1, 12).toString().padStart(2, '0');
    const birthDay = getRandomNumber(1, 28).toString().padStart(2, '0');

    const student: Student = {
      id,
      name,
      email: `${id.toLowerCase()}@hocvien.edu.vn`,
      phone: `03${getRandomNumber(10000000, 99999999)}`,
      dateOfBirth: `${birthYear}-${birthMonth}-${birthDay}`,
      gender: isMale ? 'Nam' : 'Nữ',
      address: getRandomItem(DIA_CHI),
      status: i > 385 ? 'Bảo lưu' : (i > 395 ? 'Đã tốt nghiệp' : 'Đang học'),
      enrolledClassIds: [],
      createdAt: '2026-02-01T08:00:00.000Z',
    };
    students.push(student);

    users.push({
      id,
      username: id.toLowerCase(),
      passwordHash: '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', // 'student123'
      role: 'STUDENT',
      name,
      email: student.email,
      isActive: true,
    });
  }

  // 5. 30 Lớp học thiết kế lịch không xung đột:
  // - 15 lớp chạy Thứ 2, 4, 6 (days: [2, 4, 6])
  // - 15 lớp chạy Thứ 3, 5, 7 (days: [3, 5, 7])
  // Trong mỗi nhóm 15 lớp, chia đều vào 5 ca (mỗi ca 3 lớp).
  // 3 lớp trong cùng ca sử dụng 3 phòng khác nhau và 3 giáo viên khác nhau!
  const classes: ClassEntity[] = [];

  for (let idx = 0; idx < 30; idx++) {
    const classId = `CLS${(idx + 1).toString().padStart(2, '0')}`;
    const isGroupA = idx < 15;
    const groupIndex = isGroupA ? idx : (idx - 15);

    const days = isGroupA ? [2, 4, 6] : [3, 5, 7];
    const shiftId = Math.floor(groupIndex / 3) + 1; // 1, 2, 3, 4, 5
    const roomInShift = groupIndex % 3; // 0, 1, 2
    const room = isGroupA ? classrooms[roomInShift] : classrooms[3 + roomInShift];

    // Giáo viên trong ca phải khác nhau
    const teacher = isGroupA ? teachers[groupIndex] : teachers[groupIndex % teachers.length];

    const mon = MON_HOC[idx % MON_HOC.length];
    const code = `${mon.code}${101 + idx}`;

    // Gán 12 - 16 học sinh vào mỗi lớp
    const startIdx = (idx * 13) % (students.length - 20);
    const classStudentIds: string[] = [];
    const classSize = getRandomNumber(12, 16);
    for (let s = 0; s < classSize; s++) {
      const st = students[(startIdx + s) % students.length];
      classStudentIds.push(st.id);
      if (!st.enrolledClassIds.includes(classId)) {
        st.enrolledClassIds.push(classId);
      }
    }

    teacher.assignedClassIds.push(classId);

    classes.push({
      id: classId,
      code,
      name: `Lớp ${mon.name} - K${idx + 1}`,
      subject: mon.name,
      teacherId: teacher.id,
      roomId: room.id,
      studentIds: classStudentIds,
      tuitionFee: mon.fee,
      meetingLink: `https://discord.com/channels/edu-center/room-${classId.toLowerCase()}`,
      scheduleDays: days,
      shiftId,
      status: 'Đang mở',
    });
  }

  // Đảm bảo mọi học viên đều có ít nhất 1 lớp
  students.forEach((st, idx) => {
    if (st.enrolledClassIds.length === 0) {
      const cls = classes[idx % classes.length];
      st.enrolledClassIds.push(cls.id);
      if (!cls.studentIds.includes(st.id)) {
        cls.studentIds.push(st.id);
      }
    }
  });

  // 6. Sinh ScheduleSlots cho tháng 09/2026
  const scheduleSlots: ScheduleSlot[] = [];
  let slotCounter = 1;

  for (let day = 1; day <= 30; day++) {
    const dateStr = `2026-09-${day.toString().padStart(2, '0')}`;
    const dateObj = new Date(2026, 8, day);
    const jsDay = dateObj.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
    if (jsDay === 0) continue; // Bỏ qua CN
    const customDayOfWeek = jsDay + 1; // 2..7

    classes.forEach(cls => {
      if (cls.scheduleDays.includes(customDayOfWeek)) {
        const shift = TIME_SHIFTS.find(s => s.id === cls.shiftId) || TIME_SHIFTS[0];
        const slotId = `SCH${slotCounter.toString().padStart(4, '0')}`;
        slotCounter++;

        scheduleSlots.push({
          id: slotId,
          classId: cls.id,
          teacherId: cls.teacherId,
          roomId: cls.roomId,
          date: dateStr,
          shiftId: cls.shiftId,
          startTime: shift.startTime,
          endTime: shift.endTime,
          subject: cls.subject,
          topic: `Buổi ${slotCounter % 15 + 1}: Lý thuyết & Thực hành chuyên đề ${cls.subject}`,
          status: day <= 19 ? 'Đã hoàn thành' : 'Đã lên lịch',
        });
      }
    });
  }

  // 7. Điểm danh cho các buổi đã qua
  const attendanceRecords: AttendanceRecord[] = [];
  let attCounter = 1;

  scheduleSlots.filter(s => s.status === 'Đã hoàn thành').forEach(slot => {
    const cls = classes.find(c => c.id === slot.classId);
    if (!cls) return;

    cls.studentIds.forEach((stId, sIdx) => {
      const attId = `ATT${attCounter.toString().padStart(5, '0')}`;
      attCounter++;

      let status: AttendanceRecord['status'] = 'Có mặt';
      let checkinTime = `${slot.startTime}:05`;
      let note = 'Tham gia đầy đủ, tích cực';

      const rand = (sIdx + attCounter) % 25;
      if (rand === 0) {
        status = 'Vắng có phép';
        checkinTime = '';
        note = 'Có gửi đơn xin nghỉ vì lý do cá nhân';
      } else if (rand === 1) {
        status = 'Đi muộn';
        checkinTime = `${slot.startTime.split(':')[0]}:25`;
        note = 'Kẹt xe đến muộn 20 phút';
      } else if (rand === 2) {
        status = 'Vắng không phép';
        checkinTime = '';
        note = 'Không liên lạc được';
      }

      attendanceRecords.push({
        id: attId,
        scheduleSlotId: slot.id,
        classId: slot.classId,
        studentId: stId,
        date: slot.date,
        status,
        checkinTime: checkinTime || undefined,
        note,
        updatedBy: slot.teacherId,
        updatedAt: `${slot.date}T${slot.endTime}:00.000Z`,
      });
    });
  });

  // 8. Đơn xin nghỉ / đổi lịch
  const classRequests: ClassRequest[] = [];
  for (let i = 1; i <= 25; i++) {
    const st = students[i * 5];
    const clsId = st.enrolledClassIds[0] || classes[0].id;
    const cls = classes.find(c => c.id === clsId) || classes[0];
    const relatedSlot = scheduleSlots.find(s => s.classId === clsId && s.date > '2026-09-15') || scheduleSlots[0];

    const isLeave = i % 2 === 0;
    classRequests.push({
      id: `REQ${i.toString().padStart(3, '0')}`,
      studentId: st.id,
      classId: clsId,
      scheduleSlotId: relatedSlot.id,
      type: isLeave ? 'XIN_NGHI' : 'DOI_LICH',
      reason: isLeave 
        ? 'Em bị sốt và cần đi khám bệnh tại bệnh viện, xin phép thầy cô cho em nghỉ buổi học này.' 
        : 'Trùng lịch thi kết thúc học phần trên trường đại học, kính mong được đổi sang ca tiếp theo.',
      status: i <= 10 ? 'ĐÃ_DUYỆT' : (i <= 18 ? 'CHỜ_DUYỆT' : 'TỪ_CHỐI'),
      reviewedBy: cls.teacherId,
      reviewNote: i <= 10 ? 'Đồng ý cho nghỉ. Em nhớ xem lại bài giảng và ghi chép đầy đủ nhé.' : (i > 18 ? 'Không đủ điều kiện đổi lịch do lớp đã hết chỗ ngồi.' : undefined),
      createdAt: `2026-09-${getRandomNumber(10, 18).toString().padStart(2, '0')}T09:30:00.000Z`,
    });
  }

  // 9. Công nợ học phí
  const tuitionInvoices: TuitionInvoice[] = [];
  let invoiceCounter = 1;

  students.forEach((st, idx) => {
    st.enrolledClassIds.forEach(clsId => {
      const cls = classes.find(c => c.id === clsId);
      if (!cls) return;

      const invoiceId = `TUI${invoiceCounter.toString().padStart(4, '0')}`;
      invoiceCounter++;

      const isPaid = (idx + invoiceCounter) % 5 !== 0;
      const isOverdue = !isPaid && idx % 3 === 0;

      const amount = cls.tuitionFee;
      const paidAmount = isPaid ? amount : (idx % 2 === 0 ? amount / 2 : 0);
      const remainingAmount = amount - paidAmount;

      tuitionInvoices.push({
        id: invoiceId,
        studentId: st.id,
        classId: cls.id,
        title: `Học phí môn ${cls.subject} (Khóa 09/2026)`,
        amount,
        paidAmount,
        remainingAmount,
        dueDate: '2026-09-15',
        status: remainingAmount === 0 ? 'Đã nộp' : (isOverdue ? 'Quá hạn' : 'Còn nợ'),
        paidDate: paidAmount > 0 ? '2026-09-05' : undefined,
        paymentMethod: paidAmount > 0 ? 'Chuyển khoản QR' : undefined,
        transactionCode: paidAmount > 0 ? `MBVCB_${getRandomNumber(1000000, 9999999)}` : undefined,
      });
    });
  });

  // 10. Bảng lương giáo viên
  const payrollRecords: PayrollRecord[] = [];
  teachers.forEach((tc, idx) => {
    const slots = scheduleSlots.filter(s => s.teacherId === tc.id && s.status === 'Đã hoàn thành');
    const totalSlots = slots.length;
    const totalHours = totalSlots * 2;
    const grossSalary = totalHours * tc.hourlyRate;
    const bonus = totalSlots >= 12 ? 1000000 : 500000;
    const deduction = 0;
    const netSalary = grossSalary + bonus - deduction;

    payrollRecords.push({
      id: `PAY${(idx + 1).toString().padStart(3, '0')}`,
      teacherId: tc.id,
      month: '2026-09',
      totalSlots,
      totalHours,
      hourlyRate: tc.hourlyRate,
      grossSalary,
      bonus,
      deduction,
      netSalary,
      status: idx < 10 ? 'Đã thanh toán' : 'Đã chốt',
      paidDate: idx < 10 ? '2026-09-18' : undefined,
    });
  });

  // 11. Audit Logs mẫu
  const auditLogs: AuditLog[] = [
    {
      id: 'AUD0001',
      userId: 'ADMIN001',
      userName: 'Quản Trị Viên Hệ Thống',
      userRole: 'ADMIN',
      action: 'CREATE',
      targetResource: 'SCHEDULE',
      targetId: 'SCH0001',
      details: 'Khởi tạo thời khóa biểu tháng 09/2026 cho 30 lớp học',
      timestamp: '2026-08-28T10:00:00.000Z',
    },
    {
      id: 'AUD0002',
      userId: 'GV001',
      userName: teachers[0].name,
      userRole: 'TEACHER',
      action: 'ATTENDANCE_CHECK',
      targetResource: 'ATTENDANCE',
      targetId: 'CLS01',
      details: 'Thực hiện điểm danh buổi học 2026-09-02 cho lớp MATH101',
      timestamp: '2026-09-02T10:15:00.000Z',
    },
    {
      id: 'AUD0003',
      userId: 'ADMIN001',
      userName: 'Quản Trị Viên Hệ Thống',
      userRole: 'ADMIN',
      action: 'PAYMENT_PROCESS',
      targetResource: 'TUITION',
      targetId: 'TUI0001',
      details: 'Xác nhận thu học phí thành công qua QR Code MBVCB_4829124',
      timestamp: '2026-09-05T14:20:00.000Z',
    },
    {
      id: 'AUD0004',
      userId: 'GV002',
      userName: teachers[1].name,
      userRole: 'TEACHER',
      action: 'REQUEST_DECIDE',
      targetResource: 'REQUEST',
      targetId: 'REQ0001',
      details: 'Phê duyệt đơn xin nghỉ học cho sinh viên ST005',
      timestamp: '2026-09-11T16:00:00.000Z',
    }
  ];

  return {
    users,
    teachers,
    classrooms,
    students,
    classes,
    scheduleSlots,
    attendanceRecords,
    classRequests,
    tuitionInvoices,
    payrollRecords,
    auditLogs,
  };
}
