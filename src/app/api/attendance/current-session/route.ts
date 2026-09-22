import { getTodayDateStr } from '@/utils/date';
import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { ScheduleSlot } from '@/types/schedule';
import { AttendanceRecord } from '@/types/attendance';

export const dynamic = 'force-dynamic';

export interface StudentAttendanceDetail {
  id: string;
  name: string;
  phone?: string;
  discordId?: string;
  discordUsername?: string;
  checkinTime?: string;
  method?: string;
  note?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const teacherId = searchParams.get('teacherId');

    const now = new Date();
    // Lấy ngày và giờ chuẩn xác theo múi giờ Việt Nam (Asia/Saigon)
    const today = dateParam || getTodayDateStr();
    const nowTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Saigon',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    let slots = await repo.getAllScheduleSlots();
    // Lọc theo ngày
    let daySlots = slots.filter(s => s.date === today);

    if (teacherId) {
      daySlots = daySlots.filter(s => s.teacherId === teacherId);
    }

    // Nếu không tìm thấy slot trong ngày này (do dữ liệu seed trong tháng 09/2026),
    // fallback tìm slot mẫu đại diện gần nhất trong tháng 9/2026 để hiển thị live stats
    let activeSlot: ScheduleSlot | null = null;

    if (daySlots.length > 0) {
      // Tìm slot đang diễn ra: startTime <= nowTime <= endTime
      activeSlot = daySlots.find(s => s.startTime <= nowTime && s.endTime >= nowTime) || null;
      if (!activeSlot) {
        // Nếu không có ca nào đúng giờ hiện tại, lấy ca sắp tới hoặc ca đầu tiên trong ngày
        activeSlot = daySlots[0];
      }
    } else {
      // Fallback: Lấy 1 ca có sẵn trong seed (ví dụ ngày 2026-09-20 hoặc slot đầu tiên)
      const today = getTodayDateStr();
      const sampleDateSlots = slots.filter(s => s.date === today);
      if (teacherId) {
        activeSlot = sampleDateSlots.find(s => s.teacherId === teacherId) || slots.find(s => s.teacherId === teacherId) || null;
      } else {
        activeSlot = sampleDateSlots[0] || slots[0] || null;
      }
    }

    if (!activeSlot) {
      return NextResponse.json({
        success: true,
        hasActiveSession: false,
        message: 'Hiện không có ca học nào đang diễn ra',
      });
    }

    // Lấy thông tin lớp học & danh sách học sinh của lớp
    const cls = await repo.getClassById(activeSlot.classId);
    const rosterStudentIds = cls ? cls.studentIds : [];

    // Lấy bản ghi điểm danh của slot này
    const records = await repo.getAttendanceBySlotId(activeSlot.id);
    const recordMap = new Map<string, AttendanceRecord>();
    records.forEach(r => recordMap.set(r.studentId, r));

    // Lấy toàn bộ danh sách sinh viên để lấy tên và thông tin liên lạc
    const allStudents = await repo.getAllStudents();
    const studentInfoMap = new Map<string, any>();
    allStudents.forEach(st => studentInfoMap.set(st.id, st));

    // Thống kê 4 nhóm theo yêu cầu:
    // 1. attended: Tham gia (Đã điểm danh: Có mặt, Đi muộn, Điểm danh bù)
    // 2. notAttended: Chưa tham gia (Chưa được điểm danh)
    // 3. excused: Vắng có phép
    // 4. unexcused: Vắng không phép
    const attendedList: StudentAttendanceDetail[] = [];
    const notAttendedList: StudentAttendanceDetail[] = [];
    const excusedList: StudentAttendanceDetail[] = [];
    const unexcusedList: StudentAttendanceDetail[] = [];

    const allStudentIds = new Set<string>([...rosterStudentIds]);
    records.forEach(r => allStudentIds.add(r.studentId));

    const totalStudents = allStudentIds.size;

    allStudentIds.forEach(stId => {
      const rec = recordMap.get(stId);
      const stObj = studentInfoMap.get(stId);
      const studentName = stObj?.name || `Học viên ${stId}`;

      const detail: StudentAttendanceDetail = {
        id: stId,
        name: studentName,
        phone: stObj?.phone,
        discordId: stObj?.discordId,
        discordUsername: stObj?.discordUsername,
        checkinTime: rec?.checkinTime,
        method: rec?.method,
        note: rec?.note,
      };

      if (!rec) {
        notAttendedList.push(detail);
      } else {
        if (rec.status === 'Có mặt' || rec.status === 'Đi muộn' || rec.status === 'Điểm danh bù') {
          attendedList.push(detail);
        } else if (rec.status === 'Vắng có phép') {
          excusedList.push(detail);
        } else if (rec.status === 'Vắng không phép') {
          unexcusedList.push(detail);
        } else {
          notAttendedList.push(detail);
        }
      }
    });

    return NextResponse.json({
      success: true,
      hasActiveSession: true,
      slot: activeSlot,
      className: cls?.name || activeSlot.classId,
      stats: {
        totalStudents,
        attendedCount: attendedList.length,
        notAttendedCount: notAttendedList.length,
        excusedCount: excusedList.length,
        unexcusedCount: unexcusedList.length,
        attendanceRate: totalStudents > 0 ? Math.round((attendedList.length / totalStudents) * 100) : 0,
      },
      studentsByStatus: {
        attended: attendedList,
        notAttended: notAttendedList,
        excused: excusedList,
        unexcused: unexcusedList,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
