import { HomeworkTask, HomeworkSubmission } from '@/types/homework';
import { SupabaseClient } from '@supabase/supabase-js';
import { IRepository } from './IRepository';
import { User } from '@/types/auth';
import { Student } from '@/types/student';
import { Teacher } from '@/types/teacher';
import { Classroom, ClassEntity } from '@/types/classroom';
import { ScheduleSlot, ClassRequest } from '@/types/schedule';
import { AttendanceRecord } from '@/types/attendance';
import { TuitionInvoice, PayrollRecord } from '@/types/finance';
import { AuditLog } from '@/types/audit';
import { AppNotification } from '@/types/notification';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { localRepo } from './LocalRepository';
import { generateSeedData } from './seeds/seedData';

// ============================================================================
// DATA MAPPERS (Database snake_case <-> Application camelCase)
// ============================================================================

function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    name: row.name,
    email: row.email,
    avatar: row.avatar || undefined,
    isActive: Boolean(row.is_active),
  };
}

function mapUserToDb(user: User): any {
  return {
    id: user.id,
    username: user.username,
    password_hash: user.passwordHash,
    role: user.role,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    is_active: user.isActive,
    updated_at: new Date().toISOString(),
  };
}

function mapClassroomFromDb(row: any): Classroom {
  return {
    id: row.id,
    name: row.name,
    capacity: Number(row.capacity),
    facilities: row.facilities || [],
    status: row.status,
  };
}

function mapClassroomToDb(room: Classroom): any {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    facilities: room.facilities,
    status: room.status,
  };
}

function mapTeacherFromDb(row: any): Teacher {
  const assignedClassIds = Array.isArray(row.classes)
    ? row.classes.map((c: any) => c.id)
    : (row.assignedClassIds || []);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    specialty: row.specialty,
    hourlyRate: Number(row.hourly_rate),
    status: row.status,
    bio: row.bio || undefined,
    assignedClassIds,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapTeacherToDb(teacher: Teacher): any {
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    specialty: teacher.specialty,
    hourly_rate: teacher.hourlyRate,
    status: teacher.status,
    bio: teacher.bio || null,
    updated_at: new Date().toISOString(),
  };
}

function mapStudentFromDb(row: any): Student {
  const enrolledClassIds = Array.isArray(row.class_students)
    ? row.class_students.map((cs: any) => cs.class_id)
    : (row.enrolledClassIds || []);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    dateOfBirth: typeof row.date_of_birth === 'string' ? row.date_of_birth.split('T')[0] : row.date_of_birth,
    gender: row.gender,
    address: row.address,
    status: row.status,
    enrolledClassIds,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapStudentToDb(student: Student): any {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    date_of_birth: student.dateOfBirth,
    gender: student.gender,
    address: student.address,
    status: student.status,
    avatar_url: student.avatarUrl || null,
    updated_at: new Date().toISOString(),
  };
}

function mapClassFromDb(row: any): ClassEntity {
  const studentIds = Array.isArray(row.class_students)
    ? row.class_students.map((cs: any) => cs.student_id)
    : (row.studentIds || []);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    subject: row.subject,
    teacherId: row.teacher_id,
    roomId: row.room_id,
    studentIds,
    tuitionFee: Number(row.tuition_fee),
    scheduleDays: row.schedule_days || [],
    shiftId: Number(row.shift_id),
    meetingLink: row.meeting_link || undefined,
    status: row.status,
  };
}

function mapClassToDb(cls: ClassEntity): any {
  return {
    id: cls.id,
    code: cls.code,
    name: cls.name,
    subject: cls.subject,
    teacher_id: cls.teacherId,
    room_id: cls.roomId,
    tuition_fee: cls.tuitionFee,
    schedule_days: cls.scheduleDays,
    shift_id: cls.shiftId,
    meeting_link: cls.meetingLink || null,
    status: cls.status,
    updated_at: new Date().toISOString(),
  };
}

function mapScheduleSlotFromDb(row: any): ScheduleSlot {
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    roomId: row.room_id,
    date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date,
    shiftId: Number(row.shift_id),
    startTime: row.start_time,
    endTime: row.end_time,
    subject: row.subject,
    topic: row.topic || undefined,
    meetingLink: row.meeting_link || undefined,
    status: row.status,
  };
}

function mapScheduleSlotToDb(slot: ScheduleSlot): any {
  return {
    id: slot.id,
    class_id: slot.classId,
    teacher_id: slot.teacherId,
    room_id: slot.roomId,
    date: slot.date,
    shift_id: slot.shiftId,
    start_time: slot.startTime,
    end_time: slot.endTime,
    subject: slot.subject,
    topic: slot.topic || null,
    meeting_link: slot.meetingLink || null,
    status: slot.status,
    updated_at: new Date().toISOString(),
  };
}

function mapAttendanceRecordFromDb(row: any): AttendanceRecord {
  return {
    id: row.id,
    scheduleSlotId: row.schedule_slot_id,
    classId: row.class_id,
    studentId: row.student_id,
    date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date,
    status: row.status,
    checkinTime: row.checkin_time || undefined,
    note: row.note || undefined,
    originalSlotId: row.original_slot_id || undefined,
    makeupReason: row.makeup_reason || undefined,
    method: row.method || 'MANUAL',
    updatedBy: row.updated_by,
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapAttendanceRecordToDb(rec: AttendanceRecord): any {
  return {
    id: rec.id,
    schedule_slot_id: rec.scheduleSlotId,
    class_id: rec.classId,
    student_id: rec.studentId,
    date: rec.date,
    status: rec.status,
    checkin_time: rec.checkinTime || null,
    note: rec.note || null,
    original_slot_id: rec.originalSlotId || null,
    makeup_reason: rec.makeupReason || null,
    method: rec.method || 'MANUAL',
    updated_by: rec.updatedBy,
    updated_at: rec.updatedAt || new Date().toISOString(),
  };
}

function mapClassRequestFromDb(row: any): ClassRequest {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    scheduleSlotId: row.schedule_slot_id,
    type: row.type,
    reason: row.reason,
    targetScheduleSlotId: row.target_schedule_slot_id || undefined,
    status: row.status,
    reviewedBy: row.reviewed_by || undefined,
    reviewNote: row.review_note || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapClassRequestToDb(req: ClassRequest): any {
  return {
    id: req.id,
    student_id: req.studentId,
    class_id: req.classId,
    schedule_slot_id: req.scheduleSlotId,
    type: req.type,
    reason: req.reason,
    target_schedule_slot_id: req.targetScheduleSlotId || null,
    status: req.status,
    reviewed_by: req.reviewedBy || null,
    review_note: req.reviewNote || null,
    updated_at: new Date().toISOString(),
  };
}

function mapTuitionInvoiceFromDb(row: any): TuitionInvoice {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    title: row.title,
    amount: Number(row.amount),
    paidAmount: Number(row.paid_amount),
    remainingAmount: Number(row.remaining_amount),
    dueDate: typeof row.due_date === 'string' ? row.due_date.split('T')[0] : row.due_date,
    status: row.status,
    paidDate: row.paid_date ? (typeof row.paid_date === 'string' ? row.paid_date.split('T')[0] : row.paid_date) : undefined,
    paymentMethod: row.payment_method || undefined,
    transactionCode: row.transaction_code || undefined,
  };
}

function mapTuitionInvoiceToDb(inv: TuitionInvoice): any {
  return {
    id: inv.id,
    student_id: inv.studentId,
    class_id: inv.classId,
    title: inv.title,
    amount: inv.amount,
    paid_amount: inv.paidAmount,
    remaining_amount: inv.remainingAmount,
    due_date: inv.dueDate,
    status: inv.status,
    paid_date: inv.paidDate || null,
    payment_method: inv.paymentMethod || null,
    transaction_code: inv.transactionCode || null,
    updated_at: new Date().toISOString(),
  };
}

function mapPayrollRecordFromDb(row: any): PayrollRecord {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    month: row.month,
    totalSlots: Number(row.total_slots),
    totalHours: Number(row.total_hours),
    hourlyRate: Number(row.hourly_rate),
    grossSalary: Number(row.gross_salary),
    bonus: Number(row.bonus),
    deduction: Number(row.deduction),
    netSalary: Number(row.net_salary),
    status: row.status,
    paidDate: row.paid_date ? (typeof row.paid_date === 'string' ? row.paid_date.split('T')[0] : row.paid_date) : undefined,
  };
}

function mapPayrollRecordToDb(rec: PayrollRecord): any {
  return {
    id: rec.id,
    teacher_id: rec.teacherId,
    month: rec.month,
    total_slots: rec.totalSlots,
    total_hours: rec.totalHours,
    hourly_rate: rec.hourlyRate,
    gross_salary: rec.grossSalary,
    bonus: rec.bonus,
    deduction: rec.deduction,
    net_salary: rec.netSalary,
    status: rec.status,
    paid_date: rec.paidDate || null,
    updated_at: new Date().toISOString(),
  };
}

function mapAuditLogFromDb(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    action: row.action,
    targetResource: row.target_resource,
    targetId: row.target_id,
    details: row.details,
    oldValue: row.old_value || undefined,
    newValue: row.new_value || undefined,
    ipAddress: row.ip_address || undefined,
    timestamp: row.timestamp || new Date().toISOString(),
  };
}

function mapAuditLogToDb(log: Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): any {
  return {
    id: log.id,
    user_id: log.userId,
    user_name: log.userName,
    user_role: log.userRole,
    action: log.action,
    target_resource: log.targetResource,
    target_id: log.targetId,
    details: log.details,
    old_value: log.oldValue || null,
    new_value: log.newValue || null,
    ip_address: log.ipAddress || null,
    timestamp: log.timestamp || new Date().toISOString(),
  };
}

function mapNotificationFromDb(row: any): AppNotification {
  return {
    id: row.id,
    recipientRole: row.recipient_role || undefined,
    recipientUserId: row.recipient_user_id || undefined,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link || undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapNotificationToDb(notif: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): any {
  return {
    id: notif.id,
    recipient_role: notif.recipientRole || null,
    recipient_user_id: notif.recipientUserId || null,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    link: notif.link || null,
    is_read: notif.isRead,
    created_at: notif.createdAt || new Date().toISOString(),
  };
}

// ============================================================================
// SUPABASE REPOSITORY IMPLEMENTATION
// ============================================================================


// --------------------------------------------------------------------------
// HOMEWORK MAPPERS
// --------------------------------------------------------------------------

function mapHomeworkTaskFromDb(row: any): HomeworkTask {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline,
    createdBy: row.created_by,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapHomeworkTaskToDb(task: HomeworkTask): any {
  return {
    id: task.id,
    class_id: task.classId,
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    created_by: task.createdBy,
    created_at: task.createdAt || new Date().toISOString(),
  };
}

function mapHomeworkSubmissionFromDb(row: any): HomeworkSubmission {
  return {
    id: row.id,
    taskId: row.task_id,
    studentId: row.student_id,
    submittedAt: row.submitted_at || new Date().toISOString(),
    status: row.status,
    discordMessageUrl: row.discord_message_url || undefined,
    note: row.note || undefined,
  };
}

function mapHomeworkSubmissionToDb(sub: HomeworkSubmission): any {
  return {
    id: sub.id,
    task_id: sub.taskId,
    student_id: sub.studentId,
    submitted_at: sub.submittedAt || new Date().toISOString(),
    status: sub.status,
    discord_message_url: sub.discordMessageUrl || null,
    note: sub.note || null,
  };
}

export class SupabaseRepository implements IRepository {
  private static instance: SupabaseRepository;
  private client: SupabaseClient | null = null;
  private fallbackToLocalOnFailure: boolean = true;

  private constructor() {
    this.client = getSupabaseAdminClient();
  }

  public static getInstance(): SupabaseRepository {
    if (!SupabaseRepository.instance) {
      SupabaseRepository.instance = new SupabaseRepository();
    }
    return SupabaseRepository.instance;
  }

  /**
   * Trả về Supabase Client hoặc null nếu chưa có cấu hình.
   */
  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.client = getSupabaseAdminClient();
    }
    return this.client;
  }

  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------

  public async getUserById(id: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getUserById(id);

    try {
      const clean = id.trim();
      const { data, error } = await client
        .from('users')
        .select('*')
        .or(`id.ilike.${clean},username.ilike.${clean}`)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getUserById(id);
        throw new Error(error.message);
      }

      return data ? mapUserFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getUserById(id);
      throw err;
    }
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getUserByUsername(username);

    try {
      const clean = username.trim();
      const { data, error } = await client
        .from('users')
        .select('*')
        .or(`username.ilike.${clean},id.ilike.${clean}`)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getUserByUsername(username);
        throw new Error(error.message);
      }

      return data ? mapUserFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getUserByUsername(username);
      throw err;
    }
  }

  public async authenticate(username: string, passwordHash: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) {
      return localRepo.authenticate(username, passwordHash);
    }

    try {
      const clean = username.trim();
      const { data, error } = await client
        .from('users')
        .select('*')
        .or(`username.ilike.${clean},id.ilike.${clean}`)
        .eq('is_active', true)
        .eq('password_hash', passwordHash)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.authenticate(username, passwordHash);
        throw new Error(error.message);
      }

      if (!data) return null;
      return mapUserFromDb(data);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.authenticate(username, passwordHash);
      throw err;
    }
  }

  public async getAllUsers(): Promise<User[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllUsers();

    try {
      const { data, error } = await client.from('users').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllUsers();
        throw new Error(error.message);
      }
      return (data || []).map(mapUserFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllUsers();
      throw err;
    }
  }

  public async updateUser(user: User): Promise<User> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateUser(user);

    try {
      const row = mapUserToDb(user);
      const { error } = await client.from('users').update(row).eq('id', user.id);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateUser(user);
        throw new Error(error.message);
      }
      return user;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateUser(user);
      throw err;
    }
  }

  public async createUser(user: User): Promise<User> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // createUser(user);

    try {
      const row = mapUserToDb(user);
      const { error } = await client.from('users').insert(row);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.createUser(user);
        throw new Error(error.message);
      }
      return user;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createUser(user);
      throw err;
    }
  }

  public async deleteUser(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // deleteUser(id);

    try {
      const { error } = await client.from('users').delete().eq('id', id);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.deleteUser(id);
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.deleteUser(id);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // STUDENTS
  // --------------------------------------------------------------------------

  public async getStudentById(id: string): Promise<Student | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getStudentById(id);

    try {
      const { data: student, error } = await client
        .from('students')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getStudentById(id);
        throw new Error(error.message);
      }
      if (!student) return null;

      const { data: classStudents } = await client
        .from('class_students')
        .select('class_id')
        .eq('student_id', id);

      const enrolledClassIds = (classStudents || []).map((cs: any) => cs.class_id);
      return mapStudentFromDb({ ...student, enrolledClassIds });
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getStudentById(id);
      throw err;
    }
  }

  public async getAllStudents(): Promise<Student[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllStudents();

    try {
      const { data: students, error } = await client.from('students').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllStudents();
        throw new Error(error.message);
      }

      const { data: classStudents } = await client.from('class_students').select('student_id, class_id');
      const studentMap = new Map<string, string[]>();
      (classStudents || []).forEach((cs: any) => {
        if (!studentMap.has(cs.student_id)) studentMap.set(cs.student_id, []);
        studentMap.get(cs.student_id)!.push(cs.class_id);
      });

      return (students || []).map((s: any) =>
        mapStudentFromDb({ ...s, enrolledClassIds: studentMap.get(s.id) || [] })
      );
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllStudents();
      throw err;
    }
  }

  public async updateStudent(student: Student): Promise<Student> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateStudent(student);

    try {
      const row = mapStudentToDb(student);
      const { error: updateErr } = await client.from('students').update(row).eq('id', student.id);
      if (updateErr) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateStudent(student);
        throw new Error(updateErr.message);
      }

      await client.from('class_students').delete().eq('student_id', student.id);
      if (student.enrolledClassIds && student.enrolledClassIds.length > 0) {
        const relationRows = student.enrolledClassIds.map(cId => ({
          class_id: cId,
          student_id: student.id,
        }));
        await client.from('class_students').insert(relationRows);
      }

      return student;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateStudent(student);
      throw err;
    }
  }

  public async createStudent(student: Student): Promise<Student> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // createStudent(student);

    try {
      const row = mapStudentToDb(student);
      const { error: insertErr } = await client.from('students').insert(row);
      if (insertErr) {
        if (this.fallbackToLocalOnFailure) return localRepo.createStudent(student);
        throw new Error(insertErr.message);
      }

      if (student.enrolledClassIds && student.enrolledClassIds.length > 0) {
        const relationRows = student.enrolledClassIds.map(cId => ({
          class_id: cId,
          student_id: student.id,
        }));
        await client.from('class_students').insert(relationRows);
      }

      return student;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createStudent(student);
      throw err;
    }
  }

  public async deleteStudent(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // deleteStudent(id);

    try {
      const { error } = await client.from('students').delete().eq('id', id);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.deleteStudent(id);
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.deleteStudent(id);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // TEACHERS
  // --------------------------------------------------------------------------

  public async getTeacherById(id: string): Promise<Teacher | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getTeacherById(id);

    try {
      const { data: teacher, error } = await client
        .from('teachers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getTeacherById(id);
        throw new Error(error.message);
      }
      if (!teacher) return null;

      const { data: classes } = await client
        .from('classes')
        .select('id')
        .eq('teacher_id', id);

      const assignedClassIds = (classes || []).map((c: any) => c.id);
      return mapTeacherFromDb({ ...teacher, assignedClassIds });
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getTeacherById(id);
      throw err;
    }
  }

  public async getAllTeachers(): Promise<Teacher[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllTeachers();

    try {
      const { data: teachers, error } = await client.from('teachers').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllTeachers();
        throw new Error(error.message);
      }

      const { data: classes } = await client.from('classes').select('id, teacher_id');
      const classMap = new Map<string, string[]>();
      (classes || []).forEach((c: any) => {
        if (!classMap.has(c.teacher_id)) classMap.set(c.teacher_id, []);
        classMap.get(c.teacher_id)!.push(c.id);
      });

      return (teachers || []).map((t: any) =>
        mapTeacherFromDb({ ...t, assignedClassIds: classMap.get(t.id) || [] })
      );
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllTeachers();
      throw err;
    }
  }

  public async updateTeacher(teacher: Teacher): Promise<Teacher> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateTeacher(teacher);

    try {
      const row = mapTeacherToDb(teacher);
      const { error } = await client.from('teachers').update(row).eq('id', teacher.id);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateTeacher(teacher);
        throw new Error(error.message);
      }
      return teacher;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateTeacher(teacher);
      throw err;
    }
  }

  public async createTeacher(teacher: Teacher): Promise<Teacher> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // createTeacher(teacher);

    try {
      const row = mapTeacherToDb(teacher);
      const { error } = await client.from('teachers').insert(row);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.createTeacher(teacher);
        throw new Error(error.message);
      }
      return teacher;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createTeacher(teacher);
      throw err;
    }
  }

  public async deleteTeacher(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // deleteTeacher(id);

    try {
      const { error } = await client.from('teachers').delete().eq('id', id);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.deleteTeacher(id);
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.deleteTeacher(id);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // CLASSROOMS & CLASSES
  // --------------------------------------------------------------------------

  public async getAllClassrooms(): Promise<Classroom[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllClassrooms();

    try {
      const { data, error } = await client.from('classrooms').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllClassrooms();
        throw new Error(error.message);
      }
      return (data || []).map(mapClassroomFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllClassrooms();
      throw err;
    }
  }

  public async getClassroomById(id: string): Promise<Classroom | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getClassroomById(id);

    try {
      const { data, error } = await client
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getClassroomById(id);
        throw new Error(error.message);
      }
      return data ? mapClassroomFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getClassroomById(id);
      throw err;
    }
  }

  public async getAllClasses(): Promise<ClassEntity[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllClasses();

    try {
      const { data: classes, error } = await client.from('classes').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllClasses();
        throw new Error(error.message);
      }

      const { data: classStudents } = await client.from('class_students').select('class_id, student_id');
      const classMap = new Map<string, string[]>();
      (classStudents || []).forEach((cs: any) => {
        if (!classMap.has(cs.class_id)) classMap.set(cs.class_id, []);
        classMap.get(cs.class_id)!.push(cs.student_id);
      });

      return (classes || []).map((c: any) =>
        mapClassFromDb({ ...c, studentIds: classMap.get(c.id) || [] })
      );
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllClasses();
      throw err;
    }
  }

  public async getClassById(id: string): Promise<ClassEntity | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getClassById(id);

    try {
      const { data: cls, error } = await client
        .from('classes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getClassById(id);
        throw new Error(error.message);
      }
      if (!cls) return null;

      const { data: classStudents } = await client
        .from('class_students')
        .select('student_id')
        .eq('class_id', id);

      const studentIds = (classStudents || []).map((cs: any) => cs.student_id);
      return mapClassFromDb({ ...cls, studentIds });
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getClassById(id);
      throw err;
    }
  }

  public async getClassesByTeacherId(teacherId: string): Promise<ClassEntity[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getClassesByTeacherId(teacherId);

    try {
      const { data: classes, error } = await client
        .from('classes')
        .select('*')
        .eq('teacher_id', teacherId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getClassesByTeacherId(teacherId);
        throw new Error(error.message);
      }

      const { data: classStudents } = await client.from('class_students').select('class_id, student_id');
      const classMap = new Map<string, string[]>();
      (classStudents || []).forEach((cs: any) => {
        if (!classMap.has(cs.class_id)) classMap.set(cs.class_id, []);
        classMap.get(cs.class_id)!.push(cs.student_id);
      });

      return (classes || []).map((c: any) =>
        mapClassFromDb({ ...c, studentIds: classMap.get(c.id) || [] })
      );
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getClassesByTeacherId(teacherId);
      throw err;
    }
  }

  public async getClassesByStudentId(studentId: string): Promise<ClassEntity[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getClassesByStudentId(studentId);

    try {
      const { data: classStudents, error: csErr } = await client
        .from('class_students')
        .select('class_id')
        .eq('student_id', studentId);

      if (csErr) {
        if (this.fallbackToLocalOnFailure) return localRepo.getClassesByStudentId(studentId);
        throw new Error(csErr.message);
      }

      if (!classStudents || classStudents.length === 0) return [];
      const classIds = classStudents.map((cs: any) => cs.class_id);

      const { data: classes, error: clsErr } = await client
        .from('classes')
        .select('*')
        .in('id', classIds);

      if (clsErr) {
        if (this.fallbackToLocalOnFailure) return localRepo.getClassesByStudentId(studentId);
        throw new Error(clsErr.message);
      }

      const { data: allClassStudents } = await client
        .from('class_students')
        .select('class_id, student_id')
        .in('class_id', classIds);

      const classMap = new Map<string, string[]>();
      (allClassStudents || []).forEach((cs: any) => {
        if (!classMap.has(cs.class_id)) classMap.set(cs.class_id, []);
        classMap.get(cs.class_id)!.push(cs.student_id);
      });

      return (classes || []).map((c: any) =>
        mapClassFromDb({ ...c, studentIds: classMap.get(c.id) || [] })
      );
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getClassesByStudentId(studentId);
      throw err;
    }
  }

  public async updateClass(classEntity: ClassEntity): Promise<ClassEntity> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateClass(classEntity);

    try {
      const row = mapClassToDb(classEntity);
      const { error: updateErr } = await client.from('classes').update(row).eq('id', classEntity.id);
      if (updateErr) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateClass(classEntity);
        throw new Error(updateErr.message);
      }

      await client.from('class_students').delete().eq('class_id', classEntity.id);
      if (classEntity.studentIds && classEntity.studentIds.length > 0) {
        const relationRows = classEntity.studentIds.map(stId => ({
          class_id: classEntity.id,
          student_id: stId,
        }));
        await client.from('class_students').insert(relationRows);
      }

      return classEntity;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateClass(classEntity);
      throw err;
    }
  }

  public async createClass(classEntity: ClassEntity): Promise<ClassEntity> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // createClass(classEntity);

    try {
      const row = mapClassToDb(classEntity);
      const { error: insertErr } = await client.from('classes').insert(row);
      if (insertErr) {
        if (this.fallbackToLocalOnFailure) return localRepo.createClass(classEntity);
        throw new Error(insertErr.message);
      }

      if (classEntity.studentIds && classEntity.studentIds.length > 0) {
        const relationRows = classEntity.studentIds.map(stId => ({
          class_id: classEntity.id,
          student_id: stId,
        }));
        await client.from('class_students').insert(relationRows);
      }

      return classEntity;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createClass(classEntity);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // SCHEDULE
  // --------------------------------------------------------------------------

  public async getAllScheduleSlots(): Promise<ScheduleSlot[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllScheduleSlots();

    try {
      const { data, error } = await client.from('schedule_slots').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllScheduleSlots();
        throw new Error(error.message);
      }
      return (data || []).map(mapScheduleSlotFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllScheduleSlots();
      throw err;
    }
  }

  public async getScheduleSlotById(id: string): Promise<ScheduleSlot | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getScheduleSlotById(id);

    try {
      const { data, error } = await client
        .from('schedule_slots')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotById(id);
        throw new Error(error.message);
      }
      return data ? mapScheduleSlotFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotById(id);
      throw err;
    }
  }

  public async getScheduleSlotsByTeacherId(teacherId: string): Promise<ScheduleSlot[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getScheduleSlotsByTeacherId(teacherId);

    try {
      const { data, error } = await client
        .from('schedule_slots')
        .select('*')
        .eq('teacher_id', teacherId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotsByTeacherId(teacherId);
        throw new Error(error.message);
      }
      return (data || []).map(mapScheduleSlotFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotsByTeacherId(teacherId);
      throw err;
    }
  }

  public async getScheduleSlotsByClassId(classId: string): Promise<ScheduleSlot[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getScheduleSlotsByClassId(classId);

    try {
      const { data, error } = await client
        .from('schedule_slots')
        .select('*')
        .eq('class_id', classId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotsByClassId(classId);
        throw new Error(error.message);
      }
      return (data || []).map(mapScheduleSlotFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotsByClassId(classId);
      throw err;
    }
  }

  public async getScheduleSlotsByStudentId(studentId: string): Promise<ScheduleSlot[]> {
    const studentClasses = await this.getClassesByStudentId(studentId);
    if (!studentClasses || studentClasses.length === 0) return [];
    const classIds = studentClasses.map(c => c.id);

    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getScheduleSlotsByStudentId(studentId);

    try {
      const { data, error } = await client
        .from('schedule_slots')
        .select('*')
        .in('class_id', classIds);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotsByStudentId(studentId);
        throw new Error(error.message);
      }
      return (data || []).map(mapScheduleSlotFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getScheduleSlotsByStudentId(studentId);
      throw err;
    }
  }

  public async createScheduleSlot(slot: ScheduleSlot): Promise<ScheduleSlot> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // createScheduleSlot(slot);

    try {
      const row = mapScheduleSlotToDb(slot);
      const { error } = await client.from('schedule_slots').insert(row);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.createScheduleSlot(slot);
        throw new Error(error.message);
      }
      return slot;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createScheduleSlot(slot);
      throw err;
    }
  }

  public async updateScheduleSlot(slot: ScheduleSlot): Promise<ScheduleSlot> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateScheduleSlot(slot);

    try {
      const row = mapScheduleSlotToDb(slot);
      const { error } = await client
        .from('schedule_slots')
        .update(row)
        .eq('id', slot.id);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateScheduleSlot(slot);
        throw new Error(error.message);
      }
      return slot;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateScheduleSlot(slot);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // ATTENDANCE
  // --------------------------------------------------------------------------

  public async getAttendanceBySlotId(slotId: string): Promise<AttendanceRecord[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAttendanceBySlotId(slotId);

    try {
      const { data, error } = await client
        .from('attendance_records')
        .select('*')
        .eq('schedule_slot_id', slotId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAttendanceBySlotId(slotId);
        throw new Error(error.message);
      }
      return (data || []).map(mapAttendanceRecordFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAttendanceBySlotId(slotId);
      throw err;
    }
  }

  public async getAttendanceByStudentId(studentId: string): Promise<AttendanceRecord[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAttendanceByStudentId(studentId);

    try {
      const { data, error } = await client
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAttendanceByStudentId(studentId);
        throw new Error(error.message);
      }
      return (data || []).map(mapAttendanceRecordFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAttendanceByStudentId(studentId);
      throw err;
    }
  }

  public async getAttendanceByClassId(classId: string): Promise<AttendanceRecord[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAttendanceByClassId(classId);

    try {
      const { data, error } = await client
        .from('attendance_records')
        .select('*')
        .eq('class_id', classId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAttendanceByClassId(classId);
        throw new Error(error.message);
      }
      return (data || []).map(mapAttendanceRecordFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAttendanceByClassId(classId);
      throw err;
    }
  }

  public async saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // saveAttendanceRecord(record);

    try {
      let row = mapAttendanceRecordToDb(record);
      let res = await client
        .from('attendance_records')
        .upsert(row, { onConflict: 'schedule_slot_id,student_id' });

      if (res.error && res.error.message && res.error.message.includes('schema cache')) {
        // Fallback tương thích nếu bảng Supabase chưa chạy migration các cột mới
        const compatRow = { ...row };
        delete compatRow.original_slot_id;
        delete compatRow.makeup_reason;
        delete compatRow.method;
        res = await client.from('attendance_records').upsert(compatRow, { onConflict: 'schedule_slot_id,student_id' });
      }

      if (res.error) {
        if (this.fallbackToLocalOnFailure) return localRepo.saveAttendanceRecord(record);
        throw new Error(res.error.message);
      }
      return record;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.saveAttendanceRecord(record);
      throw err;
    }
  }

  public async saveAttendanceBatch(records: AttendanceRecord[]): Promise<AttendanceRecord[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // saveAttendanceBatch(records);

    try {
      const rows = records.map(mapAttendanceRecordToDb);
      const { error } = await client
        .from('attendance_records')
        .upsert(rows, { onConflict: 'schedule_slot_id,student_id' });

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.saveAttendanceBatch(records);
        throw new Error(error.message);
      }
      return records;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.saveAttendanceBatch(records);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // REQUESTS
  // --------------------------------------------------------------------------

  public async getAllRequests(): Promise<ClassRequest[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllRequests();

    try {
      const { data, error } = await client.from('class_requests').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllRequests();
        throw new Error(error.message);
      }
      return (data || []).map(mapClassRequestFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllRequests();
      throw err;
    }
  }

  public async getRequestById(id: string): Promise<ClassRequest | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getRequestById(id);

    try {
      const { data, error } = await client
        .from('class_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getRequestById(id);
        throw new Error(error.message);
      }
      return data ? mapClassRequestFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getRequestById(id);
      throw err;
    }
  }

  public async getRequestsByStudentId(studentId: string): Promise<ClassRequest[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getRequestsByStudentId(studentId);

    try {
      const { data, error } = await client
        .from('class_requests')
        .select('*')
        .eq('student_id', studentId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getRequestsByStudentId(studentId);
        throw new Error(error.message);
      }
      return (data || []).map(mapClassRequestFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getRequestsByStudentId(studentId);
      throw err;
    }
  }

  public async getRequestsByTeacherId(teacherId: string): Promise<ClassRequest[]> {
    const teacherClasses = await this.getClassesByTeacherId(teacherId);
    if (!teacherClasses || teacherClasses.length === 0) return [];
    const classIds = teacherClasses.map(c => c.id);

    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getRequestsByTeacherId(teacherId);

    try {
      const { data, error } = await client
        .from('class_requests')
        .select('*')
        .in('class_id', classIds);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getRequestsByTeacherId(teacherId);
        throw new Error(error.message);
      }
      return (data || []).map(mapClassRequestFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getRequestsByTeacherId(teacherId);
      throw err;
    }
  }

  public async createRequest(request: ClassRequest): Promise<ClassRequest> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // createRequest(request);

    try {
      const row = mapClassRequestToDb(request);
      const { error } = await client.from('class_requests').insert(row);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.createRequest(request);
        throw new Error(error.message);
      }
      return request;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createRequest(request);
      throw err;
    }
  }

  public async updateRequest(request: ClassRequest): Promise<ClassRequest> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateRequest(request);

    try {
      const row = mapClassRequestToDb(request);
      const { error } = await client
        .from('class_requests')
        .update(row)
        .eq('id', request.id);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateRequest(request);
        throw new Error(error.message);
      }
      return request;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateRequest(request);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // FINANCE
  // --------------------------------------------------------------------------

  public async getAllTuitionInvoices(): Promise<TuitionInvoice[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllTuitionInvoices();

    try {
      const { data, error } = await client.from('tuition_invoices').select('*');
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllTuitionInvoices();
        throw new Error(error.message);
      }
      return (data || []).map(mapTuitionInvoiceFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllTuitionInvoices();
      throw err;
    }
  }

  public async getTuitionInvoicesByStudentId(studentId: string): Promise<TuitionInvoice[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getTuitionInvoicesByStudentId(studentId);

    try {
      const { data, error } = await client
        .from('tuition_invoices')
        .select('*')
        .eq('student_id', studentId);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getTuitionInvoicesByStudentId(studentId);
        throw new Error(error.message);
      }
      return (data || []).map(mapTuitionInvoiceFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getTuitionInvoicesByStudentId(studentId);
      throw err;
    }
  }

  public async getTuitionInvoiceById(id: string): Promise<TuitionInvoice | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getTuitionInvoiceById(id);

    try {
      const { data, error } = await client
        .from('tuition_invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getTuitionInvoiceById(id);
        throw new Error(error.message);
      }
      return data ? mapTuitionInvoiceFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getTuitionInvoiceById(id);
      throw err;
    }
  }

  public async createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
    const client = this.getClient();
    if (!client) {
      if (this.fallbackToLocalOnFailure) return localRepo.createTuitionInvoice(invoice);
      throw new Error("Supabase Cloud client is not configured.");
    }
    try {
      const dbRow = mapTuitionInvoiceToDb(invoice);
      const { data, error } = await client.from("tuition_invoices").insert([dbRow]).select().single();
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.createTuitionInvoice(invoice);
        throw new Error(error.message);
      }
      return data ? mapTuitionInvoiceFromDb(data) : invoice;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.createTuitionInvoice(invoice);
      throw err;
    }
  }

  public async updateTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updateTuitionInvoice(invoice);

    try {
      const row = mapTuitionInvoiceToDb(invoice);
      const { error } = await client
        .from('tuition_invoices')
        .update(row)
        .eq('id', invoice.id);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.updateTuitionInvoice(invoice);
        throw new Error(error.message);
      }
      return invoice;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updateTuitionInvoice(invoice);
      throw err;
    }
  }

  public async getAllPayrollRecords(month?: string): Promise<PayrollRecord[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllPayrollRecords(month);

    try {
      let query = client.from('teacher_payroll_periods').select('*');
      if (month) {
        query = query.eq('month', month);
      }
      const { data, error } = await query;
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllPayrollRecords(month);
        throw new Error(error.message);
      }
      return (data || []).map(mapPayrollRecordFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllPayrollRecords(month);
      throw err;
    }
  }

  public async getPayrollByTeacherId(teacherId: string, month?: string): Promise<PayrollRecord | null> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getPayrollByTeacherId(teacherId, month);

    try {
      let query = client.from('teacher_payroll_periods').select('*').eq('teacher_id', teacherId);
      if (month) {
        query = query.eq('month', month);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getPayrollByTeacherId(teacherId, month);
        throw new Error(error.message);
      }
      return data ? mapPayrollRecordFromDb(data) : null;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getPayrollByTeacherId(teacherId, month);
      throw err;
    }
  }

  public async updatePayrollRecord(record: PayrollRecord): Promise<PayrollRecord> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // updatePayrollRecord(record);

    try {
      const row = mapPayrollRecordToDb(record);
      const { error } = await client
        .from('teacher_payroll_periods')
        .update(row)
        .eq('id', record.id);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.updatePayrollRecord(record);
        throw new Error(error.message);
      }
      return record;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.updatePayrollRecord(record);
      throw err;
    }
  }

  public async savePayrollRecord(record: PayrollRecord): Promise<PayrollRecord> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // savePayrollRecord(record);

    try {
      const row = mapPayrollRecordToDb(record);
      const { error } = await client
        .from('teacher_payroll_periods')
        .upsert(row, { onConflict: 'teacher_id,month' });

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.savePayrollRecord(record);
        throw new Error(error.message);
      }
      return record;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.savePayrollRecord(record);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------------------------------

  public async getAllAuditLogs(): Promise<AuditLog[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getAllAuditLogs();

    try {
      const { data, error } = await client
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getAllAuditLogs();
        throw new Error(error.message);
      }
      return (data || []).map(mapAuditLogFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getAllAuditLogs();
      throw err;
    }
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // addAuditLog(log);

    try {
      const id = `AUD${Date.now().toString().slice(-6)}`;
      const timestamp = new Date().toISOString();
      const fullLog: AuditLog = { ...log, id, timestamp };
      const row = mapAuditLogToDb(fullLog);
      const { error } = await client.from('audit_logs').insert(row);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.addAuditLog(log);
        throw new Error(error.message);
      }
      return fullLog;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.addAuditLog(log);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------------------------------

  public async getNotifications(userId?: string, role?: string): Promise<AppNotification[]> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // getNotifications(userId, role);

    try {
      let query = client.from('notifications').select('*');
      if (userId && role) {
        query = query.or(`recipient_role.eq.ALL,recipient_role.eq.${role},recipient_user_id.eq.${userId}`);
      } else if (role) {
        query = query.or(`recipient_role.eq.ALL,recipient_role.eq.${role}`);
      } else if (userId) {
        query = query.or(`recipient_role.eq.ALL,recipient_user_id.eq.${userId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.getNotifications(userId, role);
        throw new Error(error.message);
      }
      return (data || []).map(mapNotificationFromDb);
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.getNotifications(userId, role);
      throw err;
    }
  }

  public async addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // addNotification(notification);

    try {
      const id = `NOTIF_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = new Date().toISOString();
      const fullNotif: AppNotification = { ...notification, id, createdAt };
      const row = mapNotificationToDb(fullNotif);

      const { error } = await client.from('notifications').insert(row);
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.addNotification(notification);
        throw new Error(error.message);
      }
      return fullNotif;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.addNotification(notification);
      throw err;
    }
  }

  public async markNotificationAsRead(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // markNotificationAsRead(id);

    try {
      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.markNotificationAsRead(id);
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.markNotificationAsRead(id);
      throw err;
    }
  }

  public async markAllNotificationsAsRead(userId?: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase Cloud client is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); // markAllNotificationsAsRead(userId);

    try {
      let query = client.from('notifications').update({ is_read: true });
      if (userId) {
        query = query.or(`recipient_user_id.eq.${userId},recipient_role.eq.ALL`);
      } else {
        query = query.neq('id', '');
      }

      const { error } = await query;
      if (error) {
        if (this.fallbackToLocalOnFailure) return localRepo.markAllNotificationsAsRead(userId);
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      if (this.fallbackToLocalOnFailure) return localRepo.markAllNotificationsAsRead(userId);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // RESET / RE-SEED
  // --------------------------------------------------------------------------

  public async resetData(): Promise<void> {
    const client = this.getClient();
    if (!client) {
      await localRepo.resetData();
      return;
    }

    try {
      const tables = [
        'audit_logs',
        'notifications',
        'attendance_records',
        'class_requests',
        'tuition_invoices',
        'teacher_payroll_periods',
        'schedule_slots',
        'class_students',
        'classes',
        'students',
        'teachers',
        'classrooms',
        'users',
      ];

      for (const table of tables) {
        const { error } = await client.from(table).delete().neq('id', '___PLACEHOLDER___');
        if (error) {
          console.warn(`[SupabaseRepository] Warning clearing table ${table}:`, error.message);
        }
      }

      const seed = generateSeedData();

      // 1. Users
      await client.from('users').insert(seed.users.map(mapUserToDb));
      // 2. Classrooms
      await client.from('classrooms').insert(seed.classrooms.map(mapClassroomToDb));
      // 3. Teachers
      await client.from('teachers').insert(seed.teachers.map(mapTeacherToDb));
      // 4. Students
      await client.from('students').insert(seed.students.map(mapStudentToDb));
      // 5. Classes
      await client.from('classes').insert(seed.classes.map(mapClassToDb));
      // 6. Class Students
      const classStudentsRows: { class_id: string; student_id: string }[] = [];
      seed.classes.forEach(c => {
        c.studentIds.forEach(sId => {
          classStudentsRows.push({ class_id: c.id, student_id: sId });
        });
      });
      for (let i = 0; i < classStudentsRows.length; i += 200) {
        await client.from('class_students').insert(classStudentsRows.slice(i, i + 200));
      }
      // 7. Schedule Slots
      for (let i = 0; i < seed.scheduleSlots.length; i += 200) {
        await client.from('schedule_slots').insert(seed.scheduleSlots.slice(i, i + 200).map(mapScheduleSlotToDb));
      }
      // 8. Attendance Records
      for (let i = 0; i < seed.attendanceRecords.length; i += 200) {
        await client.from('attendance_records').insert(seed.attendanceRecords.slice(i, i + 200).map(mapAttendanceRecordToDb));
      }
      // 9. Class Requests
      await client.from('class_requests').insert(seed.classRequests.map(mapClassRequestToDb));
      // 10. Tuition Invoices
      for (let i = 0; i < seed.tuitionInvoices.length; i += 200) {
        await client.from('tuition_invoices').insert(seed.tuitionInvoices.slice(i, i + 200).map(mapTuitionInvoiceToDb));
      }
      // 11. Payroll Records
      await client.from('teacher_payroll_periods').insert(seed.payrollRecords.map(mapPayrollRecordToDb));
      // 12. Audit Logs
      await client.from('audit_logs').insert(seed.auditLogs.map(mapAuditLogToDb));
    } catch (err: any) {
      console.error('[SupabaseRepository] resetData error:', err.message);
      if (this.fallbackToLocalOnFailure) {
        await localRepo.resetData();
      } else {
        throw err;
      }
    }
  }

  // --------------------------------------------------------------------------
  // HOMEWORK
  // --------------------------------------------------------------------------

  public async getAllHomeworkTasks(): Promise<HomeworkTask[]> {
    const client = this.getClient();
    if (!client) {
      return localRepo.getAllHomeworkTasks();
    }
    try {
      const { data, error } = await client.from('homework_tasks').select('*').order('created_at', { ascending: false });
      if (error) {
        return localRepo.getAllHomeworkTasks();
      }
      return (data || []).map(mapHomeworkTaskFromDb);
    } catch {
      return localRepo.getAllHomeworkTasks();
    }
  }

  public async getHomeworkTasksByClassId(classId: string): Promise<HomeworkTask[]> {
    const client = this.getClient();
    if (!client) {
      return localRepo.getHomeworkTasksByClassId(classId);
    }
    try {
      const { data, error } = await client.from('homework_tasks').select('*').eq('class_id', classId).order('created_at', { ascending: false });
      if (error) {
        return localRepo.getHomeworkTasksByClassId(classId);
      }
      return (data || []).map(mapHomeworkTaskFromDb);
    } catch {
      return localRepo.getHomeworkTasksByClassId(classId);
    }
  }

  public async createHomeworkTask(task: HomeworkTask): Promise<HomeworkTask> {
    const client = this.getClient();
    if (!client) {
      return localRepo.createHomeworkTask(task);
    }
    try {
      const row = mapHomeworkTaskToDb(task);
      const { data, error } = await client.from('homework_tasks').insert(row).select().single();
      if (error) {
        return localRepo.createHomeworkTask(task);
      }
      return data ? mapHomeworkTaskFromDb(data) : task;
    } catch {
      return localRepo.createHomeworkTask(task);
    }
  }

  public async getHomeworkSubmissionsByTaskId(taskId: string): Promise<HomeworkSubmission[]> {
    const client = this.getClient();
    if (!client) {
      return localRepo.getHomeworkSubmissionsByTaskId(taskId);
    }
    try {
      const { data, error } = await client.from('homework_submissions').select('*').eq('task_id', taskId).order('submitted_at', { ascending: false });
      if (error) {
        return localRepo.getHomeworkSubmissionsByTaskId(taskId);
      }
      return (data || []).map(mapHomeworkSubmissionFromDb);
    } catch {
      return localRepo.getHomeworkSubmissionsByTaskId(taskId);
    }
  }

  public async getHomeworkSubmissionsByStudentId(studentId: string): Promise<HomeworkSubmission[]> {
    const client = this.getClient();
    if (!client) {
      return localRepo.getHomeworkSubmissionsByStudentId(studentId);
    }
    try {
      const { data, error } = await client.from('homework_submissions').select('*').eq('student_id', studentId).order('submitted_at', { ascending: false });
      if (error) {
        return localRepo.getHomeworkSubmissionsByStudentId(studentId);
      }
      return (data || []).map(mapHomeworkSubmissionFromDb);
    } catch {
      return localRepo.getHomeworkSubmissionsByStudentId(studentId);
    }
  }

  public async upsertHomeworkSubmission(submission: HomeworkSubmission): Promise<HomeworkSubmission> {
    const client = this.getClient();
    if (!client) {
      return localRepo.upsertHomeworkSubmission(submission);
    }
    try {
      const row = mapHomeworkSubmissionToDb(submission);
      const { data, error } = await client.from('homework_submissions').upsert(row, { onConflict: 'task_id,student_id' }).select().single();
      if (error) {
        return localRepo.upsertHomeworkSubmission(submission);
      }
      return data ? mapHomeworkSubmissionFromDb(data) : submission;
    } catch {
      return localRepo.upsertHomeworkSubmission(submission);
    }
  }

}

export const supabaseRepo = SupabaseRepository.getInstance();
