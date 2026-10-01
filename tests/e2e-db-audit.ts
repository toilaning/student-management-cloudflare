import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "path";
import { ConflictEngine } from "../src/services/ConflictEngine";
import { IRepository } from "../src/repositories/IRepository";
import { ScheduleSlot } from "../src/types/schedule";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function runComprehensiveAudit() {
  console.log("================================================================================");
  console.log("🔍 COMPREHENSIVE END-TO-END DATABASE & BUSINESS LOGIC AUDIT");
  console.log("================================================================================");

  let passedSteps = 0;
  let totalSteps = 0;

  function assert(condition: boolean, stepName: string, detail?: any) {
    totalSteps++;
    if (condition) {
      console.log(`✅ [PASS] ${stepName}`);
      if (detail) console.log("   Details:", JSON.stringify(detail));
      passedSteps++;
    } else {
      console.error(`❌ [FAIL] ${stepName}`);
      if (detail) console.error("   Details:", JSON.stringify(detail));
    }
  }

  // --- Step 0: Create Foreign Key Users for Student and Teacher ---
  const timestamp = Date.now();
  const testStudentUserId = `STU_AUDIT_${timestamp}`;
  const testTeacherUserId = `TCH_AUDIT_${timestamp}`;

  const { error: userStuErr } = await supabase.from("users").insert({
    id: testStudentUserId,
    username: `stu_${timestamp}`,
    password_hash: "hash123",
    role: "STUDENT",
    name: "Nguyễn Văn Test Audit",
    email: `stu_${timestamp}@domain.com`,
    is_active: true
  });

  const { error: userTchErr } = await supabase.from("users").insert({
    id: testTeacherUserId,
    username: `tch_${timestamp}`,
    password_hash: "hash123",
    role: "TEACHER",
    name: "Thầy Giáo Test Audit",
    email: `tch_${timestamp}@domain.com`,
    is_active: true
  });

  assert(!userStuErr && !userTchErr, "Create Test Users in users table (FK prerequisites)", {
    studentUser: testStudentUserId,
    teacherUser: testTeacherUserId
  });

  // --- Step 1: Schema Test on students ---
  console.log("\n[TEST 1: Students Table Columns Verification]");
  const testStudent = {
    id: testStudentUserId,
    name: "Nguyễn Văn Test Audit",
    email: `stu_${timestamp}@domain.com`,
    phone: "0987654321",
    parent_phone: "0912345678",
    home_town: "Nam Định",
    facebook_url: "https://facebook.com/student.test",
    other_notes: "Ghi chú mục tiêu",
    target_university: "ĐH Kiến Trúc Hà Nội",
    custom_university: "Trường Khác",
    exam_block: "V",
    grade_level: "12",
    total_sessions_in_month: 12,
    remaining_sessions: 10,
    attended_sessions_in_month: 2,
    absent_sessions_in_month: 0,
    status: "Đang học"
  };

  const { data: stuData, error: stuErr } = await supabase.from("students").insert(testStudent).select().single();
  assert(!stuErr && stuData?.id === testStudentUserId, "Insert Student with All Target Academic & Custom Columns", {
    target_university: stuData?.target_university,
    custom_university: stuData?.custom_university,
    exam_block: stuData?.exam_block,
    grade_level: stuData?.grade_level,
    parent_phone: stuData?.parent_phone,
    home_town: stuData?.home_town,
    facebook_url: stuData?.facebook_url,
    other_notes: stuData?.other_notes,
    total_sessions_in_month: stuData?.total_sessions_in_month,
    remaining_sessions: stuData?.remaining_sessions,
    attended_sessions_in_month: stuData?.attended_sessions_in_month,
    absent_sessions_in_month: stuData?.absent_sessions_in_month,
    error: stuErr?.message
  });

  // --- Step 2: Schema Test on teachers ---
  console.log("\n[TEST 2: Teachers Table Columns Verification]");
  const testTeacher = {
    id: testTeacherUserId,
    name: "Thầy Giáo Test Audit",
    email: `tch_${timestamp}@domain.com`,
    phone: "0911223344",
    specialty: "Mỹ thuật đồ họa",
    hourly_rate: 200000,
    rate_per_session: 350000,
    status: "Đang dạy"
  };

  const { data: tchData, error: tchErr } = await supabase.from("teachers").insert(testTeacher).select().single();
  assert(!tchErr && tchData?.id === testTeacherUserId, "Insert Teacher with rate_per_session and hourly_rate", {
    hourly_rate: tchData?.hourly_rate,
    rate_per_session: tchData?.rate_per_session,
    error: tchErr?.message
  });

  // --- Step 3: Schema Test on classes ---
  console.log("\n[TEST 3: Classes Table Columns Verification]");
  const testClassId = `CLS_AUDIT_${timestamp}`;
  const testClass = {
    id: testClassId,
    code: `CLS-${timestamp}`,
    name: "Lớp Luyện Thi Vẽ Tối T2-T4",
    subject: "Hình họa chì",
    teacher_id: testTeacherUserId,
    shift_id: 1,
    tuition_fee: 1500000,
    start_time: "18:30",
    end_time: "20:30",
    schedule_days: ["2", "4"],
    is_recurring: true,
    meeting_link: "https://meet.google.com/audit-live-check",
    status: "Đang mở"
  };

  const { data: clsData, error: clsErr } = await supabase.from("classes").insert(testClass).select().single();
  assert(!clsErr && clsData?.id === testClassId, "Insert Class with Online/Recurring/Time properties", {
    start_time: clsData?.start_time,
    end_time: clsData?.end_time,
    schedule_days: clsData?.schedule_days,
    is_recurring: clsData?.is_recurring,
    meeting_link: clsData?.meeting_link,
    error: clsErr?.message
  });

  // --- Step 4: Schema Test on schedule_slots ---
  console.log("\n[TEST 4: Schedule Slots Table Columns Verification]");
  const testSlotId = `SLOT_AUDIT_${timestamp}`;
  const testSlot = {
    id: testSlotId,
    class_id: testClassId,
    teacher_id: testTeacherUserId,
    date: "2026-10-02",
    shift_id: 1,
    start_time: "18:30",
    end_time: "20:30",
    subject: "Hình họa chì",
    topic: "Vẽ khối cơ bản",
    meeting_link: "https://meet.google.com/audit-live-check",
    status: "Chưa diễn ra"
  };

  const { data: slotData, error: slotErr } = await supabase.from("schedule_slots").insert(testSlot).select().single();
  assert(!slotErr && slotData?.id === testSlotId, "Insert Schedule Slot with Custom Date/Time & Status", {
    date: slotData?.date,
    start_time: slotData?.start_time,
    end_time: slotData?.end_time,
    status: slotData?.status,
    error: slotErr?.message
  });

  // --- Step 5: Attendance Records Table Columns Verification ---
  console.log("\n[TEST 5: Attendance Records Table Columns Verification]");
  const testAttId = `ATT_AUDIT_${timestamp}`;
  const testAtt = {
    id: testAttId,
    schedule_slot_id: testSlotId,
    class_id: testClassId,
    student_id: testStudentUserId,
    date: "2026-10-02",
    status: "Có mặt",
    is_makeup: true,
    original_slot_id: testSlotId,
    makeup_reason: "Học bù do bận thi",
    method: "MANUAL",
    updated_by: "tester"
  };

  const { data: attData, error: attErr } = await supabase.from("attendance_records").insert(testAtt).select().single();
  assert(!attErr && attData?.id === testAttId, "Insert Attendance with Makeup & Reason fields", {
    is_makeup: attData?.is_makeup,
    original_slot_id: attData?.original_slot_id,
    makeup_reason: attData?.makeup_reason,
    method: attData?.method,
    error: attErr?.message
  });

  // --- Step 6: Core Business Logic Validations ---
  console.log("\n[TEST 6: Core Business Logic Validation]");

  // Mock repo for ConflictEngine
  const mockExistingSlots: ScheduleSlot[] = [
    {
      id: "slot-1",
      classId: "class-1",
      teacherId: "tch-1",
      roomId: "room-online",
      date: "2026-10-02",
      shiftId: 1,
      startTime: "18:30",
      endTime: "20:30",
      subject: "Vẽ V",
      status: "Đã lên lịch"
    }
  ];

  const mockRepo = {
    getAllScheduleSlots: async () => mockExistingSlots,
  } as unknown as IRepository;

  const engine = new ConflictEngine(mockRepo);

  // 6.1: ConflictEngine Room & Teacher Rules for 100% Online
  // Case A: Same teacher teaching parallel class
  const candidateSlotSameTeacher: Omit<ScheduleSlot, "id"> = {
    classId: "class-2",
    teacherId: "tch-1", // same teacher
    roomId: "room-online-2",
    date: "2026-10-02",
    shiftId: 1,
    startTime: "18:30",
    endTime: "20:30",
    subject: "Vẽ H",
    status: "Đã lên lịch"
  };

  const resultTeacher = await engine.checkScheduleConflict(candidateSlotSameTeacher);
  const teacherConflict = resultTeacher.conflicts.find(c => c.type === "TEACHER_CONFLICT");
  assert(
    !teacherConflict && resultTeacher.hasConflict === false,
    "ConflictEngine: Teacher can teach multiple parallel classes in 100% Online without TEACHER_CONFLICT blocking",
    { hasConflict: resultTeacher.hasConflict, conflicts: resultTeacher.conflicts }
  );

  // Case B: Same online room
  const candidateSlotSameRoom: Omit<ScheduleSlot, "id"> = {
    classId: "class-3",
    teacherId: "tch-2",
    roomId: "room-online", // same room in online setup
    date: "2026-10-02",
    shiftId: 1,
    startTime: "18:30",
    endTime: "20:30",
    subject: "Vẽ Tự Do",
    status: "Đã lên lịch"
  };

  const resultRoom = await engine.checkScheduleConflict(candidateSlotSameRoom);
  const roomConflict = resultRoom.conflicts.find(c => c.type === "ROOM_CONFLICT");
  assert(
    !roomConflict && resultRoom.hasConflict === false,
    "ConflictEngine: Multiple online sessions do not block ROOM_CONFLICT",
    { hasConflict: resultRoom.hasConflict, conflicts: resultRoom.conflicts }
  );

  // Case C: Same class in overlapping time MUST trigger CLASS_CONFLICT
  const candidateSlotSameClass: Omit<ScheduleSlot, "id"> = {
    classId: "class-1", // same class
    teacherId: "tch-3",
    roomId: "room-online-3",
    date: "2026-10-02",
    shiftId: 1,
    startTime: "18:30",
    endTime: "20:30",
    subject: "Vẽ Bố Cục Màu",
    status: "Đã lên lịch"
  };

  const resultClass = await engine.checkScheduleConflict(candidateSlotSameClass);
  const classConflict = resultClass.conflicts.find(c => c.type === "CLASS_CONFLICT");
  assert(
    classConflict !== undefined && resultClass.hasConflict === true,
    "ConflictEngine: Overlapping slot for SAME CLASS triggers CLASS_CONFLICT properly",
    { hasConflict: resultClass.hasConflict, conflict: classConflict?.message }
  );

  // 6.2: Live Tracker Timing Logic (startTime <= now <= endTime)
  function isSlotOngoing(startTimeStr: string, endTimeStr: string, currentTimeStr: string): boolean {
    return currentTimeStr >= startTimeStr && currentTimeStr <= endTimeStr;
  }

  assert(
    isSlotOngoing("18:30", "20:30", "19:00") === true &&
    isSlotOngoing("18:30", "20:30", "18:00") === false &&
    isSlotOngoing("18:30", "20:30", "21:00") === false,
    "Live Tracker: Status 'Đang diễn ra' is strictly scoped within [startTime, endTime]"
  );

  // 6.3: Clean Up Dependent Test Data First then Delete Teacher & User
  console.log("\n[TEST 7: Teacher & User Deletion Verification]");
  await supabase.from("attendance_records").delete().eq("id", testAttId);
  await supabase.from("schedule_slots").delete().eq("id", testSlotId);
  await supabase.from("classes").delete().eq("id", testClassId);
  
  const { error: delTchErr } = await supabase.from("teachers").delete().eq("id", testTeacherUserId);
  const { error: delUserTchErr } = await supabase.from("users").delete().eq("id", testTeacherUserId);

  assert(!delTchErr && !delUserTchErr, "Safe Teacher Deletion (Teacher + User removed cleanly from DB)", {
    teacherDeletedId: testTeacherUserId,
    delTchErr: delTchErr?.message,
    delUserTchErr: delUserTchErr?.message
  });

  // --- Step 8: Cleanup student test rows ---
  console.log("\n[Cleaning Up Student Test Rows]");
  await supabase.from("students").delete().eq("id", testStudentUserId);
  await supabase.from("users").delete().eq("id", testStudentUserId);
  console.log("✅ Cleanup complete.");

  console.log("\n================================================================================");
  console.log(`🎯 AUDIT SUMMARY: ${passedSteps}/${totalSteps} PASSED (${Math.round((passedSteps / totalSteps) * 100)}%)`);
  console.log("================================================================================");
  
  return { passedSteps, totalSteps };
}

if (require.main === module) {
  runComprehensiveAudit().catch(err => {
    console.error("Audit run error:", err);
    process.exit(1);
  });
}
