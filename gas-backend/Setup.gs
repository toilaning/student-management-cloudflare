/**
 * Google Apps Script Setup & Schema Initialization
 * Automatically sets up 16 Sheets with headers, frozen row 1, and formatted columns.
 */

var SHEETS_SCHEMA = {
  Users: [
    "id",
    "username",
    "passwordHash",
    "name",
    "email",
    "role",
    "avatar",
    "createdAt",
    "updatedAt"
  ],
  Students: [
    "id",
    "userId",
    "name",
    "email",
    "phone",
    "dateOfBirth",
    "address",
    "guardianName",
    "guardianPhone",
    "status",
    "enrolledDate",
    "createdAt",
    "updatedAt"
  ],
  Teachers: [
    "id",
    "userId",
    "name",
    "email",
    "phone",
    "specialty",
    "degree",
    "baseSalary",
    "hourlyRate",
    "status",
    "joinedDate",
    "createdAt",
    "updatedAt"
  ],
  TeacherRates: [
    "id",
    "teacherId",
    "subjectCode",
    "classType",
    "ratePerHour",
    "effectiveFrom",
    "effectiveTo"
  ],
  TeacherWorkLogs: [
    "id",
    "teacherId",
    "scheduleSlotId",
    "classId",
    "date",
    "durationHours",
    "appliedRate",
    "totalAmount",
    "status",
    "note"
  ],
  TeacherPayrollPeriods: [
    "id",
    "teacherId",
    "month",
    "totalHours",
    "teachingSalary",
    "baseSalary",
    "bonus",
    "deductions",
    "finalAmount",
    "status",
    "paidDate",
    "updatedAt"
  ],
  Classes: [
    "id",
    "code",
    "name",
    "subject",
    "teacherId",
    "classroomId",
    "startDate",
    "endDate",
    "maxCapacity",
    "fee",
    "status",
    "createdAt"
  ],
  ClassStudents: [
    "id",
    "classId",
    "studentId",
    "enrolledAt",
    "status"
  ],
  Schedules: [
    "id",
    "classId",
    "teacherId",
    "classroomId",
    "date",
    "startTime",
    "endTime",
    "shift",
    "status",
    "note"
  ],
  Attendance: [
    "id",
    "scheduleSlotId",
    "studentId",
    "classId",
    "status",
    "note",
    "markedAt",
    "markedBy"
  ],
  LeaveRequests: [
    "id",
    "applicantId",
    "applicantRole",
    "scheduleSlotId",
    "startDate",
    "endDate",
    "reason",
    "status",
    "reviewedBy",
    "reviewNote",
    "createdAt"
  ],
  ScheduleChanges: [
    "id",
    "requesterId",
    "scheduleSlotId",
    "targetDate",
    "targetStartTime",
    "targetEndTime",
    "targetRoomId",
    "targetTeacherId",
    "reason",
    "status",
    "reviewedBy",
    "createdAt"
  ],
  Tuitions: [
    "id",
    "studentId",
    "classId",
    "title",
    "amount",
    "paidAmount",
    "remainingAmount",
    "dueDate",
    "status",
    "createdAt",
    "updatedAt"
  ],
  Payments: [
    "id",
    "tuitionId",
    "studentId",
    "amount",
    "method",
    "referenceCode",
    "collectedBy",
    "paymentDate",
    "note"
  ],
  Notifications: [
    "id",
    "userId",
    "role",
    "title",
    "message",
    "type",
    "isRead",
    "link",
    "createdAt"
  ],
  AuditLogs: [
    "id",
    "userId",
    "userName",
    "action",
    "entity",
    "entityId",
    "details",
    "ipAddress",
    "timestamp"
  ]
};

/**
 * Initialize all 16 sheets in current active Spreadsheet or by ID
 */
function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = Object.keys(SHEETS_SCHEMA);

  sheetNames.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    var headers = SHEETS_SCHEMA[name];

    if (!sheet) {
      sheet = ss.insertSheet(name);
    }

    // Set headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Freeze header row
    sheet.setFrozenRows(1);

    // Style header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#2563eb");
    headerRange.setFontColor("#ffffff");

    // Auto-fit columns
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
    }
  });

  // Remove default "Sheet1" if empty and other sheets exist
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Trang tính1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // Ignore
    }
  }

  Logger.log("All 16 sheets initialized successfully!");
  return { success: true, message: "16 sheets initialized successfully" };
}
