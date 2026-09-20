/**
 * Google Apps Script Web App Router & Dispatcher
 * Entry points: doGet, doPost
 * Authentication: API Key
 * Standard JSON Response format
 */

function getScriptApiKey() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty("API_KEY") || "STUDENT_MANAGEMENT_SECRET_2026";
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data) {
  return createJsonResponse({
    success: true,
    data: data
  });
}

function errorResponse(code, message, details) {
  return createJsonResponse({
    success: false,
    error: {
      code: code,
      message: message,
      details: details || null
    }
  });
}

/**
 * Handle GET requests (Healthcheck, ping, simple query)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = params.action || "ping";

    if (action === "ping") {
      return successResponse({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        message: "Google Apps Script Backend is healthy and running"
      });
    }

    if (action === "initSheets") {
      var key = params.apiKey;
      if (key !== getScriptApiKey()) {
        return errorResponse("UNAUTHORIZED", "Invalid API Key");
      }
      var res = initializeSheets();
      return successResponse(res);
    }

    return errorResponse("BAD_REQUEST", "Unknown action: " + action);
  } catch (err) {
    return errorResponse("SERVER_ERROR", err.message, err.stack);
  }
}

/**
 * Handle POST requests (Central dispatcher for 15 services)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse("BAD_REQUEST", "Missing request body");
    }

    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return errorResponse("BAD_REQUEST", "Invalid JSON body: " + parseErr.message);
    }

    // Verify API Key
    var apiKey = payload.apiKey;
    if (!apiKey || apiKey !== getScriptApiKey()) {
      return errorResponse("UNAUTHORIZED", "Xác thực API Key thất bại");
    }

    var service = payload.service;
    var action = payload.action;
    var params = payload.params || {};

    // Special global action: resetData / seedDatabase
    if (action === "resetData" || action === "initializeSheets") {
      initializeSheets();
      return successResponse({ message: "Sheets initialized" });
    }

    // Dispatcher
    switch (service) {
      // 1. UserService
      case "UserService":
        switch (action) {
          case "getUserById":
            return successResponse(UserService.getUserById(params.id));
          case "getUserByUsername":
            return successResponse(UserService.getUserByUsername(params.username));
          case "authenticate":
            return successResponse(UserService.authenticate(params.username, params.passwordHash));
          case "getAllUsers":
            return successResponse(UserService.getAllUsers());
          case "createUser":
            return successResponse(UserService.createUser(params.user));
          case "updateUser":
            return successResponse(UserService.updateUser(params.user));
          case "deleteUser":
            return successResponse(UserService.deleteUser(params.id));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 2. StudentService
      case "StudentService":
        switch (action) {
          case "getStudentById":
            return successResponse(StudentService.getStudentById(params.id));
          case "getAllStudents":
            return successResponse(StudentService.getAllStudents());
          case "createStudent":
            return successResponse(StudentService.createStudent(params.student));
          case "updateStudent":
            return successResponse(StudentService.updateStudent(params.student));
          case "deleteStudent":
            return successResponse(StudentService.deleteStudent(params.id));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 3. TeacherService
      case "TeacherService":
        switch (action) {
          case "getTeacherById":
            return successResponse(TeacherService.getTeacherById(params.id));
          case "getAllTeachers":
            return successResponse(TeacherService.getAllTeachers());
          case "createTeacher":
            return successResponse(TeacherService.createTeacher(params.teacher));
          case "updateTeacher":
            return successResponse(TeacherService.updateTeacher(params.teacher));
          case "deleteTeacher":
            return successResponse(TeacherService.deleteTeacher(params.id));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 4. TeacherRateService
      case "TeacherRateService":
        switch (action) {
          case "getRatesByTeacherId":
            return successResponse(TeacherRateService.getRatesByTeacherId(params.teacherId));
          case "saveTeacherRate":
            return successResponse(TeacherRateService.saveTeacherRate(params.rate));
          case "deleteTeacherRate":
            return successResponse(TeacherRateService.deleteTeacherRate(params.id));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 5. TeacherWorkLogService
      case "TeacherWorkLogService":
        switch (action) {
          case "getLogsByTeacherId":
            return successResponse(TeacherWorkLogService.getLogsByTeacherId(params.teacherId));
          case "logWorkHours":
            return successResponse(TeacherWorkLogService.logWorkHours(params.log));
          case "batchVerifyWorkLogs":
            return successResponse(TeacherWorkLogService.batchVerifyWorkLogs(params.logIds, params.status));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 6. TeacherPayrollPeriodService
      case "TeacherPayrollPeriodService":
        switch (action) {
          case "getAllPayrollRecords":
            return successResponse(TeacherPayrollPeriodService.getAllPayrollRecords(params.month));
          case "getPayrollByTeacherId":
            return successResponse(TeacherPayrollPeriodService.getPayrollByTeacherId(params.teacherId, params.month));
          case "savePayrollRecord":
            return successResponse(TeacherPayrollPeriodService.savePayrollRecord(params.record));
          case "updatePayrollRecord":
            return successResponse(TeacherPayrollPeriodService.updatePayrollRecord(params.record));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 7. ClassService
      case "ClassService":
        switch (action) {
          case "getAllClasses":
            return successResponse(ClassService.getAllClasses());
          case "getClassById":
            return successResponse(ClassService.getClassById(params.id));
          case "getClassesByTeacherId":
            return successResponse(ClassService.getClassesByTeacherId(params.teacherId));
          case "getClassesByStudentId":
            return successResponse(ClassService.getClassesByStudentId(params.studentId));
          case "createClass":
            return successResponse(ClassService.createClass(params.classEntity));
          case "updateClass":
            return successResponse(ClassService.updateClass(params.classEntity));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 8. ClassStudentService
      case "ClassStudentService":
        switch (action) {
          case "enrollStudent":
            return successResponse(ClassStudentService.enrollStudent(params.classId, params.studentId));
          case "dropStudent":
            return successResponse(ClassStudentService.dropStudent(params.classId, params.studentId));
          case "getStudentsInClass":
            return successResponse(ClassStudentService.getStudentsInClass(params.classId));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 9. ScheduleService
      case "ScheduleService":
        switch (action) {
          case "getAllScheduleSlots":
            return successResponse(ScheduleService.getAllScheduleSlots());
          case "getScheduleSlotById":
            return successResponse(ScheduleService.getScheduleSlotById(params.id));
          case "getSlotsByTeacherId":
            return successResponse(ScheduleService.getSlotsByTeacherId(params.teacherId));
          case "getSlotsByClassId":
            return successResponse(ScheduleService.getSlotsByClassId(params.classId));
          case "getSlotsByStudentId":
            return successResponse(ScheduleService.getSlotsByStudentId(params.studentId));
          case "createScheduleSlot":
            return successResponse(ScheduleService.createScheduleSlot(params.slot));
          case "updateScheduleSlot":
            return successResponse(ScheduleService.updateScheduleSlot(params.slot));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 10. AttendanceService
      case "AttendanceService":
        switch (action) {
          case "getAttendanceBySlotId":
            return successResponse(AttendanceService.getAttendanceBySlotId(params.slotId));
          case "getAttendanceByStudentId":
            return successResponse(AttendanceService.getAttendanceByStudentId(params.studentId));
          case "getAttendanceByClassId":
            return successResponse(AttendanceService.getAttendanceByClassId(params.classId));
          case "saveAttendanceRecord":
            return successResponse(AttendanceService.saveAttendanceRecord(params.record));
          case "saveAttendanceBatch":
            return successResponse(AttendanceService.saveAttendanceBatch(params.records));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 11. LeaveRequestService
      case "LeaveRequestService":
        switch (action) {
          case "getAllRequests":
            return successResponse(LeaveRequestService.getAllRequests());
          case "getRequestById":
            return successResponse(LeaveRequestService.getRequestById(params.id));
          case "getRequestsByStudentId":
            return successResponse(LeaveRequestService.getRequestsByStudentId(params.studentId));
          case "getRequestsByTeacherId":
            return successResponse(LeaveRequestService.getRequestsByTeacherId(params.teacherId));
          case "createRequest":
            return successResponse(LeaveRequestService.createRequest(params.request));
          case "updateRequest":
            return successResponse(LeaveRequestService.updateRequest(params.request));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 12. ScheduleChangeService
      case "ScheduleChangeService":
        switch (action) {
          case "createScheduleChangeRequest":
            return successResponse(ScheduleChangeService.createScheduleChangeRequest(params.req));
          case "reviewScheduleChangeRequest":
            return successResponse(ScheduleChangeService.reviewScheduleChangeRequest(params.id, params.status, params.reviewerId));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 13. TuitionService
      case "TuitionService":
        switch (action) {
          case "getAllTuitionInvoices":
            return successResponse(TuitionService.getAllTuitionInvoices());
          case "getTuitionInvoicesByStudentId":
            return successResponse(TuitionService.getTuitionInvoicesByStudentId(params.studentId));
          case "getTuitionInvoiceById":
            return successResponse(TuitionService.getTuitionInvoiceById(params.id));
          case "createTuitionInvoice":
            return successResponse(TuitionService.createTuitionInvoice(params.invoice));
          case "updateTuitionInvoice":
            return successResponse(TuitionService.updateTuitionInvoice(params.invoice));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 14. PaymentService
      case "PaymentService":
        switch (action) {
          case "recordPayment":
            return successResponse(PaymentService.recordPayment(params.payment));
          case "getPaymentsByTuitionId":
            return successResponse(PaymentService.getPaymentsByTuitionId(params.tuitionId));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // 15. NotificationService & AuditLogService
      case "NotificationService":
        switch (action) {
          case "getNotifications":
            return successResponse(NotificationService.getNotifications(params.userId, params.role));
          case "addNotification":
            return successResponse(NotificationService.addNotification(params.notification));
          case "markAsRead":
            return successResponse(NotificationService.markAsRead(params.id));
          case "markAllAsRead":
            return successResponse(NotificationService.markAllAsRead(params.userId));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      case "AuditLogService":
        switch (action) {
          case "getAllAuditLogs":
            return successResponse(AuditLogService.getAllAuditLogs());
          case "addAuditLog":
            return successResponse(AuditLogService.addAuditLog(params.log));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for " + service);
        }

      // Database Direct Batch Operation (for Seeding & Migration)
      case "Database":
        switch (action) {
          case "batchInsert":
            return successResponse(Database.batchInsert(params.sheetName, params.records));
          case "clearData":
            Database.clearData(params.sheetName);
            return successResponse({ message: "Cleared " + params.sheetName });
          case "readAll":
            return successResponse(Database.readAll(params.sheetName));
          default:
            return errorResponse("NOT_FOUND", "Unknown action " + action + " for Database");
        }

      default:
        return errorResponse("NOT_FOUND", "Unknown service: " + service);
    }
  } catch (err) {
    return errorResponse("INTERNAL_ERROR", err.message, err.stack);
  }
}
