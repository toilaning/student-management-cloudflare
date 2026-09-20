import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { verifyDiscordSecret } from '@/lib/discordAuth';
import { TIME_SHIFTS } from '@/types/schedule';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Xác thực Bearer Token
  const auth = verifyDiscordSecret(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discord_id') || searchParams.get('discordId');
    const studentId = searchParams.get('student_id') || searchParams.get('studentId');

    if (!discordId && !studentId) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp discord_id hoặc student_id' },
        { status: 400 }
      );
    }

    // 2. Tra cứu học sinh
    const allStudents = await repo.getAllStudents();
    const student = allStudents.find(
      s => (discordId && s.discordId === discordId) || (studentId && s.id === studentId)
    );

    if (!student) {
      return NextResponse.json({
        success: true,
        linked: false,
        message: 'Tài khoản Discord chưa được liên kết với hồ sơ học sinh trong hệ thống',
        student: null,
        classes: [],
      });
    }

    // 3. Lấy danh sách lớp học của học sinh
    const [allClasses, allTeachers] = await Promise.all([
      repo.getAllClasses(),
      repo.getAllTeachers(),
    ]);

    const teacherMap = new Map(allTeachers.map(t => [t.id, t]));

    // Học sinh có thể ghi danh qua enrolledClassIds hoặc studentIds trong lớp
    const studentClasses = allClasses.filter(c =>
      (student.enrolledClassIds && student.enrolledClassIds.includes(c.id)) ||
      (c.studentIds && c.studentIds.includes(student.id))
    );

    const shiftMap = new Map(TIME_SHIFTS.map(s => [s.id, s]));

    const dayNameMap: Record<number, string> = {
      2: 'Thứ 2',
      3: 'Thứ 3',
      4: 'Thứ 4',
      5: 'Thứ 5',
      6: 'Thứ 6',
      7: 'Thứ 7',
      8: 'Chủ Nhật',
    };

    const formattedClasses = studentClasses.map(cls => {
      const teacher = teacherMap.get(cls.teacherId);
      const shift = shiftMap.get(cls.shiftId);
      const shiftTimeStr = shift ? `${shift.startTime} - ${shift.endTime}` : `Ca ${cls.shiftId}`;
      const scheduleDaysStr = cls.scheduleDays && cls.scheduleDays.length > 0
        ? cls.scheduleDays.map(d => dayNameMap[d] || `Thứ ${d}`).join(', ')
        : 'Chưa xếp lịch';

      const meetingLink = cls.meetingLink || `https://discord.com/channels/edu-center/room-${cls.id.toLowerCase()}`;

      return {
        class_id: cls.id,
        classId: cls.id,
        class_code: cls.code,
        classCode: cls.code,
        class_name: cls.name,
        className: cls.name,
        course_name: cls.subject || cls.name,
        courseName: cls.subject || cls.name,
        teacher_id: cls.teacherId,
        teacherId: cls.teacherId,
        teacher_name: teacher ? teacher.name : cls.teacherId,
        teacherName: teacher ? teacher.name : cls.teacherId,
        schedule_days: scheduleDaysStr,
        scheduleDays: cls.scheduleDays || [],
        shift_time: shiftTimeStr,
        shiftTime: shiftTimeStr,
        shift_id: cls.shiftId,
        shiftId: cls.shiftId,
        room_id: cls.roomId,
        roomId: cls.roomId,
        meeting_link: meetingLink,
        meetingLink: meetingLink,
        status: cls.status,
      };
    });

    return NextResponse.json({
      success: true,
      linked: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        discord_id: student.discordId,
        discordId: student.discordId,
        discord_username: student.discordUsername,
        discordUsername: student.discordUsername,
        status: student.status,
      },
      classes: formattedClasses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý tra cứu lớp học của học sinh' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = verifyDiscordSecret(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await request.json();
    const discordId = body.discord_id || body.discordId;
    const studentId = body.student_id || body.studentId;

    if (!discordId && !studentId) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp discord_id hoặc student_id' },
        { status: 400 }
      );
    }

    const allStudents = await repo.getAllStudents();
    const student = allStudents.find(
      s => (discordId && s.discordId === discordId) || (studentId && s.id === studentId)
    );

    if (!student) {
      return NextResponse.json({
        success: true,
        linked: false,
        message: 'Tài khoản Discord chưa được liên kết với hồ sơ học sinh trong hệ thống',
        student: null,
        classes: [],
      });
    }

    const [allClasses, allTeachers] = await Promise.all([
      repo.getAllClasses(),
      repo.getAllTeachers(),
    ]);

    const teacherMap = new Map(allTeachers.map(t => [t.id, t]));
    const studentClasses = allClasses.filter(c =>
      (student.enrolledClassIds && student.enrolledClassIds.includes(c.id)) ||
      (c.studentIds && c.studentIds.includes(student.id))
    );

    const shiftMap = new Map(TIME_SHIFTS.map(s => [s.id, s]));
    const dayNameMap: Record<number, string> = {
      2: 'Thứ 2',
      3: 'Thứ 3',
      4: 'Thứ 4',
      5: 'Thứ 5',
      6: 'Thứ 6',
      7: 'Thứ 7',
      8: 'Chủ Nhật',
    };

    const formattedClasses = studentClasses.map(cls => {
      const teacher = teacherMap.get(cls.teacherId);
      const shift = shiftMap.get(cls.shiftId);
      const shiftTimeStr = shift ? `${shift.startTime} - ${shift.endTime}` : `Ca ${cls.shiftId}`;
      const scheduleDaysStr = cls.scheduleDays && cls.scheduleDays.length > 0
        ? cls.scheduleDays.map(d => dayNameMap[d] || `Thứ ${d}`).join(', ')
        : 'Chưa xếp lịch';

      const meetingLink = cls.meetingLink || `https://discord.com/channels/edu-center/room-${cls.id.toLowerCase()}`;

      return {
        class_id: cls.id,
        classId: cls.id,
        class_code: cls.code,
        classCode: cls.code,
        class_name: cls.name,
        className: cls.name,
        course_name: cls.subject || cls.name,
        courseName: cls.subject || cls.name,
        teacher_id: cls.teacherId,
        teacherId: cls.teacherId,
        teacher_name: teacher ? teacher.name : cls.teacherId,
        teacherName: teacher ? teacher.name : cls.teacherId,
        schedule_days: scheduleDaysStr,
        scheduleDays: cls.scheduleDays || [],
        shift_time: shiftTimeStr,
        shiftTime: shiftTimeStr,
        shift_id: cls.shiftId,
        shiftId: cls.shiftId,
        room_id: cls.roomId,
        roomId: cls.roomId,
        meeting_link: meetingLink,
        meetingLink: meetingLink,
        status: cls.status,
      };
    });

    return NextResponse.json({
      success: true,
      linked: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        discord_id: student.discordId,
        discordId: student.discordId,
        discord_username: student.discordUsername,
        discordUsername: student.discordUsername,
        status: student.status,
      },
      classes: formattedClasses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý tra cứu lớp học của học sinh' },
      { status: 500 }
    );
  }
}
