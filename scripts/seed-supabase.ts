/**
 * Script seed dữ liệu đầy đủ vào Supabase Cloud (gọi 1 lần để vận hành trơn tru).
 *
 * Nguồn dữ liệu: generateSeedData() (20 GV, 10 phòng, 400 HV, 30 lớp, lịch tháng
 * 09/2026, điểm danh, hóa đơn, bảng lương, đơn xin nghỉ, audit logs).
 *
 * Cách chạy:
 *   npm run seed:supabase
 *
 * Lưu ý:
 *   - Yêu cầu SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong .env.local
 *   - Script XÓA toàn bộ dữ liệu cũ rồi ghi lại (idempotent, an toàn để chạy lại)
 *   - Chạy sau khi đã chạy supabase/OPTIMIZE_SUPABASE_20260928.sql (tạo/đảm bảo cột)
 */
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateSeedData } from '../src/repositories/seeds/seedData';
import { User } from '../src/types/auth';
import { Student } from '../src/types/student';
import { Teacher } from '../src/types/teacher';
import { Classroom, ClassEntity } from '../src/types/classroom';
import { ScheduleSlot, ClassRequest } from '../src/types/schedule';
import { AttendanceRecord } from '../src/types/attendance';
import { TuitionInvoice, PayrollRecord } from '../src/types/finance';
import { AuditLog } from '../src/types/audit';

// ---- Load .env.local ----
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- Mappers (khớp 100% SupabaseRepository.ts) ----
const mapUserToDb = (u: User) => ({
  id: u.id, username: u.username, password_hash: u.passwordHash, role: u.role,
  name: u.name, email: u.email, avatar: (u as any).avatar || null, is_active: u.isActive,
  updated_at: new Date().toISOString(),
});
const mapClassroomToDb = (r: Classroom) => ({
  id: r.id, name: r.name, capacity: r.capacity, facilities: r.facilities, status: r.status,
});
const mapTeacherToDb = (t: Teacher) => ({
  id: t.id, name: t.name, email: t.email, phone: t.phone, specialty: t.specialty,
  hourly_rate: t.hourlyRate, status: t.status, bio: t.bio || null,
  updated_at: new Date().toISOString(),
});
const mapStudentToDb = (s: Student) => ({
  id: s.id, name: s.name, email: s.email || null, phone: s.phone,
  date_of_birth: s.dateOfBirth || null, gender: s.gender || 'Nam', address: s.address || null,
  status: s.status, avatar_url: s.avatarUrl || null, parent_phone: s.parentPhone || null,
  assignment_url: s.assignmentUrl || null,
  home_town: s.homeTown || null, grade_level: s.gradeLevel || null,
  target_university: s.targetUniversity || null, custom_university: s.customUniversity || null,
  exam_block: s.examBlock || null, study_goal: s.studyGoal || null,
  facebook_url: s.facebookUrl || null, other_notes: s.otherNotes || null,
  registered_date: s.registeredDate || null,
  total_sessions_in_month: s.totalSessionsInMonth ?? 12,
  attended_sessions_in_month: s.attendedSessionsInMonth ?? 0,
  absent_sessions_in_month: s.absentSessionsInMonth ?? 0,
  remaining_sessions: s.remainingSessions ?? 12,
  updated_at: new Date().toISOString(),
});
const mapClassToDb = (c: ClassEntity) => ({
  id: c.id, code: c.code, name: c.name, subject: c.subject,
  teacher_id: c.teacherId, room_id: c.roomId, tuition_fee: c.tuitionFee,
  schedule_days: c.scheduleDays, shift_id: c.shiftId || 1,
  start_time: c.startTime || '18:30', end_time: c.endTime || '20:30',
  is_recurring: c.isRecurring !== undefined ? c.isRecurring : true,
  meeting_link: c.meetingLink || null, status: c.status,
  updated_at: new Date().toISOString(),
});
const mapScheduleSlotToDb = (s: ScheduleSlot) => ({
  id: s.id, class_id: s.classId, teacher_id: s.teacherId, room_id: s.roomId,
  date: s.date, shift_id: s.shiftId, start_time: s.startTime, end_time: s.endTime,
  subject: s.subject, topic: s.topic || null, meeting_link: s.meetingLink || null,
  status: s.status, updated_at: new Date().toISOString(),
});
const mapAttendanceToDb = (a: AttendanceRecord, checkinAsTimestamp = false) => ({
  id: a.id, schedule_slot_id: a.scheduleSlotId, class_id: a.classId, student_id: a.studentId,
  date: a.date, status: a.status,
  // checkin_time: nếu cột là TIMESTAMPTZ (drift cũ) thì ép về ISO datetime theo date, ngược lại giữ chuỗi HH:mm:ss
  checkin_time: a.checkinTime
    ? (checkinAsTimestamp ? `${a.date}T${a.checkinTime}+07:00` : a.checkinTime)
    : null,
  note: a.note || null,
  original_slot_id: a.originalSlotId || null, makeup_reason: a.makeupReason || null,
  method: a.method || 'MANUAL', updated_by: a.updatedBy,
  updated_at: a.updatedAt || new Date().toISOString(),
});
const mapClassRequestToDb = (r: ClassRequest) => ({
  id: r.id, student_id: r.studentId, class_id: r.classId, schedule_slot_id: r.scheduleSlotId,
  type: r.type, reason: r.reason, target_schedule_slot_id: r.targetScheduleSlotId || null,
  status: r.status, reviewed_by: r.reviewedBy || null, review_note: r.reviewNote || null,
  updated_at: new Date().toISOString(),
});
const mapTuitionInvoiceToDb = (inv: TuitionInvoice) => ({
  id: inv.id, student_id: inv.studentId, class_id: inv.classId, package_id: inv.packageId || null,
  title: inv.title, amount: inv.amount, paid_amount: inv.paidAmount,
  remaining_amount: inv.remainingAmount, due_date: inv.dueDate, status: inv.status,
  paid_date: inv.paidDate || null, payment_method: inv.paymentMethod || null,
  transaction_code: inv.transactionCode || null, note: inv.note || null,
  session_count: inv.sessionCount ?? 0, used_sessions: inv.usedSessions ?? 0,
  updated_at: new Date().toISOString(),
});
const mapPayrollToDb = (p: PayrollRecord) => ({
  id: p.id, teacher_id: p.teacherId, month: p.month, total_slots: p.totalSlots,
  total_hours: p.totalHours, hourly_rate: p.hourlyRate, gross_salary: p.grossSalary,
  bonus: p.bonus, deduction: p.deduction, net_salary: p.netSalary, status: p.status,
  paid_date: p.paidDate || null, updated_at: new Date().toISOString(),
});
const mapAuditLogToDb = (a: AuditLog) => ({
  action: a.action, user_id: a.userId, user_name: a.userName, user_role: a.userRole,
  target_resource: a.targetResource, target_id: a.targetId, details: a.details, timestamp: a.timestamp,
});

// ---- Helpers ----
async function insertInChunks(table: string, rows: any[], chunk = 200) {
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await client.from(table).insert(rows.slice(i, i + chunk));
    if (error) {
      console.error(`❌ Lỗi insert ${table}:`, error.message, error.details || '');
      throw error;
    }
  }
  if (rows.length) console.log(`   ✅ ${table}: ${rows.length} dòng`);
}

async function clearTable(table: string) {
  // class_students không có cột `id` (khóa chính ghép class_id+student_id)
  if (table === 'class_students') {
    const { error } = await client.from(table).delete().not('class_id', 'is', null);
    if (error) console.warn(`   ⚠️ clear ${table}: ${error.message}`);
    return;
  }
  const { error } = await client.from(table).delete().neq('id', '___PLACEHOLDER___');
  if (error) console.warn(`   ⚠️ clear ${table}: ${error.message}`);
}

async function main() {
  console.log('🚀 Bắt đầu seed dữ liệu Supabase...\n');
  const seed = generateSeedData();

  // Phát hiện kiểu cột checkin_time: TIMESTAMPTZ (drift cũ) hay VARCHAR (chuẩn)
  let checkinAsTimestamp = false;
  try {
    // Dùng một schedule_slot thật để tránh lỗi FK
    const { data: anySlot } = await client.from('schedule_slots').select('id,class_id,teacher_id,date,start_time,subject').limit(1);
    const s0 = anySlot?.[0];
    if (s0) {
      const probeId = 'ATT_PROBE_TYPE';
      const probe = {
        id: probeId, schedule_slot_id: s0.id, class_id: s0.class_id,
        student_id: 'ST001', date: s0.date, status: 'Có mặt',
        checkin_time: '08:00:05', method: 'MANUAL', updated_by: s0.teacher_id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await client.from('attendance_records').insert(probe).select();
      await client.from('attendance_records').delete().eq('id', probeId);
      if (error && /invalid input syntax|timestamp/i.test(error.message)) {
        checkinAsTimestamp = true;
      }
    }
  } catch {
    checkinAsTimestamp = true;
  }
  if (checkinAsTimestamp) {
    console.log('   ℹ️  checkin_time là TIMESTAMPTZ (chưa chạy OPTIMIZE SQL) -> ép ISO datetime.');
    console.log('   💡 Khuyến nghị chạy supabase/OPTIMIZE_SUPABASE_20260928.sql để chuyển về VARCHAR.\n');
  }

  const tables = [
    'audit_logs', 'notifications', 'attendance_records', 'class_requests',
    'tuition_invoices', 'teacher_payroll_periods', 'schedule_slots',
    'class_students', 'classes', 'students', 'teachers', 'classrooms', 'users',
  ];

  console.log('🧹 Xóa dữ liệu cũ...');
  for (const t of tables) await clearTable(t);

  console.log('\n📥 Ghi dữ liệu mới...');
  await insertInChunks('users', seed.users.map(mapUserToDb));
  await insertInChunks('classrooms', seed.classrooms.map(mapClassroomToDb));
  await insertInChunks('teachers', seed.teachers.map(mapTeacherToDb));
  await insertInChunks('students', seed.students.map(mapStudentToDb));
  await insertInChunks('classes', seed.classes.map(mapClassToDb));

  const classStudentsRows: { class_id: string; student_id: string }[] = [];
  seed.classes.forEach(c => c.studentIds.forEach(sId => classStudentsRows.push({ class_id: c.id, student_id: sId })));
  await insertInChunks('class_students', classStudentsRows);

  await insertInChunks('schedule_slots', seed.scheduleSlots.map(mapScheduleSlotToDb));
  await insertInChunks('attendance_records', seed.attendanceRecords.map(a => mapAttendanceToDb(a, checkinAsTimestamp)));
  await insertInChunks('class_requests', seed.classRequests.map(mapClassRequestToDb));
  await insertInChunks('tuition_invoices', seed.tuitionInvoices.map(mapTuitionInvoiceToDb));
  await insertInChunks('teacher_payroll_periods', seed.payrollRecords.map(mapPayrollToDb));
  await insertInChunks('audit_logs', seed.auditLogs.map(mapAuditLogToDb));

  console.log('\n✅ Seed hoàn tất!');
  console.log(`   - Users: ${seed.users.length}`);
  console.log(`   - Teachers: ${seed.teachers.length}`);
  console.log(`   - Students: ${seed.students.length}`);
  console.log(`   - Classes: ${seed.classes.length}`);
  console.log(`   - Class-students: ${classStudentsRows.length}`);
  console.log(`   - Schedule slots: ${seed.scheduleSlots.length}`);
  console.log(`   - Attendance: ${seed.attendanceRecords.length}`);
  console.log(`   - Invoices: ${seed.tuitionInvoices.length}`);
  console.log(`   - Payroll: ${seed.payrollRecords.length}`);
}

main().catch(e => {
  console.error('❌ Seed thất bại:', e.message);
  process.exit(1);
});