import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually if not in process.env
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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

/**
 * Migration & Seeding Script: Load synthetic dataset to Google Apps Script / Google Sheets
 * Usage: npm run seed:gas
 */

import { generateSeedData } from "../src/repositories/seeds/seedData";

interface GasResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

async function callGas(webAppUrl: string, apiKey: string, service: string, action: string, params: any = {}, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          service,
          action,
          params,
        }),
      });

      if (!res.ok) {
        if (attempt < retries) {
          console.warn(`⚠️ HTTP ${res.status} khi gọi [${service}.${action}], đang thử lại lần ${attempt + 1}...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json: GasResponse = await res.json();
      if (!json.success) {
        throw new Error(`GAS Error [${json.error?.code}]: ${json.error?.message}`);
      }
      return json.data;
    } catch (err: any) {
      if (attempt < retries) {
        console.warn(`⚠️ Lỗi kết nối khi gọi [${service}.${action}] (${err.message}), thử lại lần ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const webAppUrl = process.env.GAS_WEB_APP_URL;
  const apiKey = process.env.GAS_API_KEY || "STUDENT_MANAGEMENT_SECRET_2026";

  console.log("==================================================");
  console.log("   STUDENT MANAGEMENT - GAS SEEDING & MIGRATION   ");
  console.log("==================================================");

  if (!webAppUrl) {
    console.warn("⚠️  GAS_WEB_APP_URL chưa được cấu hình!");
    console.log("Kiểm tra biến môi trường hoặc chạy ở chế độ Dry-Run / Local export.");
    console.log("Để nạp lên Google Sheets, vui lòng set GAS_WEB_APP_URL trong .env.local");
  }

  console.log("📦 Đang sinh dữ liệu mẫu Synthetic Dataset (Phase 1)...");
  const seed = generateSeedData();

  console.log(`✅ Đã sinh:`);
  console.log(`  - ${seed.users.length} Users`);
  console.log(`  - ${seed.teachers.length} Teachers`);
  console.log(`  - ${seed.students.length} Students`);
  console.log(`  - ${seed.classrooms.length} Classrooms`);
  console.log(`  - ${seed.classes.length} Classes`);
  console.log(`  - ${seed.scheduleSlots.length} Schedule Slots`);
  console.log(`  - ${seed.attendanceRecords.length} Attendance Records`);
  console.log(`  - ${seed.classRequests.length} Class Requests`);
  console.log(`  - ${seed.tuitionInvoices.length} Tuition Invoices`);
  console.log(`  - ${seed.payrollRecords.length} Payroll Records`);
  console.log(`  - ${seed.auditLogs.length} Audit Logs`);

  // Transform to 16 Sheets Schema
  // 1. Users
  const usersRows = seed.users.map(u => ({
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 2. Students
  const studentsRows = seed.students.map(s => ({
    id: s.id,
    userId: `usr_${s.id}`,
    name: s.name,
    email: s.email,
    phone: s.phone,
    dateOfBirth: s.dateOfBirth,
    address: s.address,
    guardianName: "Phụ Huynh " + s.name,
    guardianPhone: s.phone,
    status: s.status === "Đang học" ? "ACTIVE" : s.status === "Bảo lưu" ? "PAUSED" : "DROPPED",
    enrolledDate: s.createdAt ? s.createdAt.split("T")[0] : "2026-08-15",
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 3. Teachers
  const teachersRows = seed.teachers.map(t => ({
    id: t.id,
    userId: `usr_${t.id}`,
    name: t.name,
    email: t.email,
    phone: t.phone,
    specialty: t.specialty,
    degree: "Thạc sĩ / Cử nhân",
    baseSalary: 0,
    hourlyRate: t.hourlyRate,
    status: t.status === "Đang dạy" ? "ACTIVE" : "ON_LEAVE",
    joinedDate: t.createdAt ? t.createdAt.split("T")[0] : "2026-01-10",
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 4. TeacherRates
  const teacherRatesRows = seed.teachers.map((t) => ({
    id: `TR_${t.id}_01`,
    teacherId: t.id,
    subjectCode: t.specialty.substring(0, 10),
    classType: "STANDARD",
    ratePerHour: t.hourlyRate,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
  }));

  // 5. TeacherWorkLogs
  const teacherWorkLogsRows = seed.scheduleSlots.slice(0, 60).map((s) => ({
    id: `WL_${s.id}`,
    teacherId: s.teacherId,
    scheduleSlotId: s.id,
    classId: s.classId,
    date: s.date,
    durationHours: 2.0,
    appliedRate: 350000,
    totalAmount: 700000,
    status: "VERIFIED",
    note: `Dạy ca ${s.shiftId} ngày ${s.date}`,
  }));

  // 6. TeacherPayrollPeriods
  const payrollRows = seed.payrollRecords.map(p => ({
    id: p.id,
    teacherId: p.teacherId,
    month: p.month,
    totalHours: p.totalHours,
    teachingSalary: p.grossSalary,
    baseSalary: 0,
    bonus: p.bonus,
    deductions: p.deduction,
    finalAmount: p.netSalary,
    status: p.status,
    paidDate: p.paidDate || "",
    updatedAt: new Date().toISOString(),
  }));

  // 7. Classes
  const classesRows = seed.classes.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    subject: c.subject,
    teacherId: c.teacherId,
    classroomId: c.roomId,
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    maxCapacity: 30,
    fee: c.tuitionFee,
    status: c.status,
    createdAt: new Date().toISOString(),
  }));

  // 8. ClassStudents
  const classStudentsRows: any[] = [];
  seed.classes.forEach(c => {
    c.studentIds.forEach(sId => {
      classStudentsRows.push({
        id: `cs_${c.id}_${sId}`,
        classId: c.id,
        studentId: sId,
        enrolledAt: "2026-08-25T00:00:00.000Z",
        status: "ENROLLED",
      });
    });
  });

  // 9. Schedules
  const schedulesRows = seed.scheduleSlots.map(s => ({
    id: s.id,
    classId: s.classId,
    teacherId: s.teacherId,
    classroomId: s.roomId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    shift: s.shiftId,
    status: s.status,
    note: s.topic || "",
  }));

  // 10. Attendance
  const attendanceRows = seed.attendanceRecords.map(a => ({
    id: a.id,
    scheduleSlotId: a.scheduleSlotId,
    studentId: a.studentId,
    classId: a.classId,
    status: a.status,
    note: a.note || "",
    markedAt: a.updatedAt,
    markedBy: a.updatedBy,
  }));

  // 11. LeaveRequests
  const leaveRequestsRows = seed.classRequests.map(r => ({
    id: r.id,
    applicantId: r.studentId,
    applicantRole: "STUDENT",
    scheduleSlotId: r.scheduleSlotId,
    startDate: r.createdAt.split("T")[0],
    endDate: r.createdAt.split("T")[0],
    reason: r.reason,
    status: r.status,
    reviewedBy: r.reviewedBy || "",
    reviewNote: r.reviewNote || "",
    createdAt: r.createdAt,
  }));

  // 12. ScheduleChanges
  const scheduleChangesRows = [
    {
      id: "SC001",
      requesterId: "GV001",
      scheduleSlotId: "SCH0001",
      targetDate: "2026-09-08",
      targetStartTime: "10:15",
      targetEndTime: "12:15",
      targetRoomId: "P.102",
      targetTeacherId: "GV001",
      reason: "Bận lịch công tác đột xuất",
      status: "APPROVED",
      reviewedBy: "ADMIN001",
      createdAt: "2026-08-30T09:00:00.000Z",
    }
  ];

  // 13. Tuitions
  const tuitionsRows = seed.tuitionInvoices.map(t => ({
    id: t.id,
    studentId: t.studentId,
    classId: t.classId,
    title: t.title,
    amount: t.amount,
    paidAmount: t.paidAmount,
    remainingAmount: t.remainingAmount,
    dueDate: t.dueDate,
    status: t.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 14. Payments
  const paymentsRows = seed.tuitionInvoices
    .filter(t => t.paidAmount > 0)
    .map((t, idx) => ({
      id: `PAYM_${(idx + 1).toString().padStart(4, "0")}`,
      tuitionId: t.id,
      studentId: t.studentId,
      amount: t.paidAmount,
      method: t.paymentMethod === "Tiền mặt" ? "CASH" : "BANK_TRANSFER",
      referenceCode: t.transactionCode || `TXN_${Date.now()}_${idx}`,
      collectedBy: "ADMIN001",
      paymentDate: t.paidDate || "2026-09-05",
      note: "Thanh toán học phí đợt 1",
    }));

  // 15. Notifications
  const notificationsRows = [
    {
      id: "NOTIF_001",
      userId: "ADMIN001",
      role: "ALL",
      title: "Chào mừng năm học mới 2026-2027",
      message: "Hệ thống quản lý đào tạo trực tuyến đã chính thức đưa vào vận hành.",
      type: "SUCCESS",
      isRead: false,
      link: "/schedule",
      createdAt: "2026-08-25T08:00:00.000Z",
    },
    {
      id: "NOTIF_002",
      userId: "",
      role: "TEACHER",
      title: "Nhắc nhở điểm danh ca học",
      message: "Giáo viên vui lòng hoàn tất điểm danh trong vòng 24h sau ca dạy.",
      type: "WARNING",
      isRead: false,
      link: "/teacher/attendance",
      createdAt: "2026-09-01T07:30:00.000Z",
    }
  ];

  // 16. AuditLogs
  const auditLogsRows = seed.auditLogs.map(a => ({
    id: a.id,
    userId: a.userId,
    userName: a.userName,
    action: a.action,
    entity: a.targetResource,
    entityId: a.targetId,
    details: a.details,
    ipAddress: "127.0.0.1",
    timestamp: a.timestamp,
  }));

  const allDatasets: Record<string, any[]> = {
    Users: usersRows,
    Students: studentsRows,
    Teachers: teachersRows,
    TeacherRates: teacherRatesRows,
    TeacherWorkLogs: teacherWorkLogsRows,
    TeacherPayrollPeriods: payrollRows,
    Classes: classesRows,
    ClassStudents: classStudentsRows,
    Schedules: schedulesRows,
    Attendance: attendanceRows,
    LeaveRequests: leaveRequestsRows,
    ScheduleChanges: scheduleChangesRows,
    Tuitions: tuitionsRows,
    Payments: paymentsRows,
    Notifications: notificationsRows,
    AuditLogs: auditLogsRows,
  };

  if (!webAppUrl) {
    console.log("\n📊 [Dry Run] Tổng hợp số bản ghi chuẩn bị nạp:");
    for (const [sheet, rows] of Object.entries(allDatasets)) {
      console.log(`  - ${sheet}: ${rows.length} rows`);
    }
    console.log("\n🎉 Script chạy thành công ở chế độ Dry-Run!");
    return;
  }

  // Live migration to Google Sheets
  console.log("\n🚀 Bắt đầu nạp dữ liệu lên Google Sheets thông qua Web App...");
  
  // Step 1: Initialize Sheets
  console.log("🛠️  1. Khởi tạo cấu trúc 16 Sheets...");
  await callGas(webAppUrl, apiKey, "Setup", "initializeSheets");

  // Step 2: Clear old data and batch insert into each sheet
  for (const [sheetName, rows] of Object.entries(allDatasets)) {
    console.log(`📥  Nạp ${rows.length} dòng vào sheet [${sheetName}]...`);
    await callGas(webAppUrl, apiKey, "Database", "clearData", { sheetName });
    
    // Chunk in batches of 200 rows to avoid GAS execution timeout
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await new Promise(r => setTimeout(r, 1000));
      await callGas(webAppUrl, apiKey, "Database", "batchInsert", {
        sheetName,
        records: chunk,
      });
    }
  }

  console.log("\n✨ Chúc mừng! Đã nạp thành công toàn bộ 16 bảng dữ liệu lên Google Sheets!");
}

main().catch(err => {
  console.error("❌ Lỗi khi thực thi script seeding:", err);
  process.exit(1);
});
