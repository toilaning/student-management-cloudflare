import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { AttendanceRecord } from '@/types/attendance';
import { Student } from '@/types/student';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-09'; // YYYY-MM
    const classId = searchParams.get('classId');

    // 1. Lấy toàn bộ học viên & lớp học
    const [allStudents, allClasses, allSlots] = await Promise.all([
      repo.getAllStudents(),
      repo.getAllClasses(),
      repo.getAllScheduleSlots(),
    ]);

    // Lọc ca học trong tháng
    const slotsInMonth = allSlots.filter(s => s.date.startsWith(month));
    const slotIdsInMonth = new Set(slotsInMonth.map(s => s.id));

    // Lấy records điểm danh
    let records: AttendanceRecord[] = [];
    for (const cls of allClasses) {
      if (classId && classId !== 'ALL' && cls.id !== classId) continue;
      const clsRecords = await repo.getAttendanceByClassId(cls.id);
      records.push(...clsRecords);
    }

    // Lọc records thuộc tháng đã chọn
    const monthlyRecords = records.filter(r => r.date.startsWith(month) || slotIdsInMonth.has(r.scheduleSlotId));

    // Gom dữ liệu theo từng student
    const studentMap = new Map<string, Student>();
    allStudents.forEach(st => studentMap.set(st.id, st));

    // Tính toán thống kê theo từng học sinh
    const studentStats: Record<string, {
      studentId: string;
      studentName: string;
      enrolledClasses: string[];
      totalSlots: number;
      presentCount: number;
      lateCount: number;
      excusedCount: number;
      unexcusedCount: number;
      makeupCount: number;
      rate: number; // Tỷ lệ %
    }> = {};

    // Khởi tạo danh sách học viên
    allStudents.forEach(st => {
      if (classId && classId !== 'ALL') {
        if (!st.enrolledClassIds.includes(classId)) return;
      }
      studentStats[st.id] = {
        studentId: st.id,
        studentName: st.name,
        enrolledClasses: st.enrolledClassIds,
        totalSlots: 0,
        presentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        unexcusedCount: 0,
        makeupCount: 0,
        rate: 100,
      };
    });

    monthlyRecords.forEach(rec => {
      let stat = studentStats[rec.studentId];
      if (!stat) {
        const student = studentMap.get(rec.studentId);
        stat = {
          studentId: rec.studentId,
          studentName: student ? student.name : rec.studentId,
          enrolledClasses: student ? student.enrolledClassIds : [],
          totalSlots: 0,
          presentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          unexcusedCount: 0,
          makeupCount: 0,
          rate: 100,
        };
        studentStats[rec.studentId] = stat;
      }

      stat.totalSlots += 1;
      if (rec.status === 'Có mặt') stat.presentCount += 1;
      else if (rec.status === 'Đi muộn') stat.lateCount += 1;
      else if (rec.status === 'Vắng có phép') stat.excusedCount += 1;
      else if (rec.status === 'Vắng không phép') stat.unexcusedCount += 1;
      else if (rec.status === 'Điểm danh bù') stat.makeupCount += 1;
    });

    // Tính Attendance Rate (%)
    const items = Object.values(studentStats).map(stat => {
      const attended = stat.presentCount + stat.lateCount + stat.makeupCount;
      const rate = stat.totalSlots > 0 
        ? Math.round((attended / stat.totalSlots) * 100) 
        : 100;
      return {
        ...stat,
        rate,
      };
    });

    items.sort((a, b) => a.studentId.localeCompare(b.studentId));

    return NextResponse.json({
      success: true,
      month,
      classId: classId || 'ALL',
      totalStudents: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
