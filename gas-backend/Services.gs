/**
 * Google Apps Script 15 Domain Services
 * Implements all domain business logic for Student Management.
 */

// Helper to remove passwordHash from user records
function sanitizeUser(user) {
  if (!user) return null;
  var clone = Object.assign({}, user);
  delete clone.passwordHash;
  return clone;
}

// 1. UserService
var UserService = {
  getUserById: function (id) {
    var u = Database.findOne("Users", "id", id);
    return sanitizeUser(u);
  },
  getUserByUsername: function (username) {
    var all = Database.readAll("Users");
    var clean = String(username).toLowerCase();
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].username).toLowerCase() === clean || String(all[i].id).toLowerCase() === clean) {
        return sanitizeUser(all[i]);
      }
    }
    return null;
  },
  authenticate: function (username, passwordHash) {
    var all = Database.readAll("Users");
    var clean = String(username).toLowerCase();
    for (var i = 0; i < all.length; i++) {
      var u = all[i];
      if (String(u.username).toLowerCase() === clean || String(u.id).toLowerCase() === clean) {
        if (!u.isActive) return null;
        if (u.passwordHash === passwordHash) {
          return sanitizeUser(u);
        }
        return null;
      }
    }
    return null;
  },
  getAllUsers: function () {
    var all = Database.readAll("Users");
    return all.map(sanitizeUser);
  },
  createUser: function (user) {
    var now = new Date().toISOString();
    user.createdAt = user.createdAt || now;
    user.updatedAt = now;
    Database.insert("Users", user);
    return sanitizeUser(user);
  },
  updateUser: function (user) {
    var now = new Date().toISOString();
    user.updatedAt = now;
    var updated = Database.update("Users", user.id, user);
    return sanitizeUser(updated || user);
  },
  deleteUser: function (id) {
    return Database.deleteOne("Users", id);
  }
};

// 2. StudentService
var StudentService = {
  getStudentById: function (id) {
    return Database.findOne("Students", "id", id);
  },
  getAllStudents: function () {
    return Database.readAll("Students");
  },
  createStudent: function (student) {
    var now = new Date().toISOString();
    student.createdAt = student.createdAt || now;
    student.updatedAt = now;
    return Database.insert("Students", student);
  },
  updateStudent: function (student) {
    var now = new Date().toISOString();
    student.updatedAt = now;
    return Database.update("Students", student.id, student) || student;
  },
  deleteStudent: function (id) {
    return Database.deleteOne("Students", id);
  }
};

// 3. TeacherService
var TeacherService = {
  getTeacherById: function (id) {
    return Database.findOne("Teachers", "id", id);
  },
  getAllTeachers: function () {
    return Database.readAll("Teachers");
  },
  createTeacher: function (teacher) {
    var now = new Date().toISOString();
    teacher.createdAt = teacher.createdAt || now;
    teacher.updatedAt = now;
    return Database.insert("Teachers", teacher);
  },
  updateTeacher: function (teacher) {
    var now = new Date().toISOString();
    teacher.updatedAt = now;
    return Database.update("Teachers", teacher.id, teacher) || teacher;
  },
  deleteTeacher: function (id) {
    return Database.deleteOne("Teachers", id);
  }
};

// 4. TeacherRateService
var TeacherRateService = {
  getRatesByTeacherId: function (teacherId) {
    return Database.findWhere("TeacherRates", function (r) {
      return String(r.teacherId) === String(teacherId);
    });
  },
  saveTeacherRate: function (rate) {
    if (rate.id && Database.findOne("TeacherRates", "id", rate.id)) {
      return Database.update("TeacherRates", rate.id, rate);
    }
    rate.id = rate.id || ("TR_" + new Date().getTime());
    return Database.insert("TeacherRates", rate);
  },
  deleteTeacherRate: function (id) {
    return Database.deleteOne("TeacherRates", id);
  }
};

// 5. TeacherWorkLogService
var TeacherWorkLogService = {
  getLogsByTeacherId: function (teacherId) {
    return Database.findWhere("TeacherWorkLogs", function (l) {
      return String(l.teacherId) === String(teacherId);
    });
  },
  logWorkHours: function (log) {
    log.id = log.id || ("WL_" + new Date().getTime());
    log.totalAmount = (Number(log.durationHours) || 0) * (Number(log.appliedRate) || 0);
    return Database.insert("TeacherWorkLogs", log);
  },
  batchVerifyWorkLogs: function (logIds, status) {
    var all = Database.readAll("TeacherWorkLogs");
    var toUpdate = [];
    for (var i = 0; i < all.length; i++) {
      if (logIds.indexOf(all[i].id) !== -1) {
        all[i].status = status || "VERIFIED";
        toUpdate.push(all[i]);
      }
    }
    return Database.batchUpdate("TeacherWorkLogs", toUpdate);
  }
};

// 6. TeacherPayrollPeriodService
var TeacherPayrollPeriodService = {
  getAllPayrollRecords: function (month) {
    var all = Database.readAll("TeacherPayrollPeriods");
    // Normalize format to match Next.js PayrollRecord
    var mapped = all.map(function (p) {
      return {
        id: p.id,
        teacherId: p.teacherId,
        month: p.month,
        totalSlots: Number(p.totalSlots || Math.round(Number(p.totalHours || 0) / 2)),
        totalHours: Number(p.totalHours || 0),
        hourlyRate: Number(p.hourlyRate || (Number(p.totalHours) ? Math.round(Number(p.teachingSalary || 0) / Number(p.totalHours)) : 0)),
        grossSalary: Number(p.teachingSalary || p.grossSalary || 0),
        bonus: Number(p.bonus || 0),
        deduction: Number(p.deductions || p.deduction || 0),
        netSalary: Number(p.finalAmount || p.netSalary || 0),
        status: p.status,
        paidDate: p.paidDate || undefined
      };
    });
    if (month) {
      return mapped.filter(function (p) { return p.month === month; });
    }
    return mapped;
  },
  getPayrollByTeacherId: function (teacherId, month) {
    var list = TeacherPayrollPeriodService.getAllPayrollRecords(month);
    for (var i = 0; i < list.length; i++) {
      if (list[i].teacherId === teacherId) {
        return list[i];
      }
    }
    return null;
  },
  savePayrollRecord: function (record) {
    var raw = {
      id: record.id,
      teacherId: record.teacherId,
      month: record.month,
      totalHours: record.totalHours || (record.totalSlots * 2),
      teachingSalary: record.grossSalary,
      baseSalary: 0,
      bonus: record.bonus || 0,
      deductions: record.deduction || 0,
      finalAmount: record.netSalary,
      status: record.status,
      paidDate: record.paidDate || "",
      updatedAt: new Date().toISOString()
    };
    if (Database.findOne("TeacherPayrollPeriods", "id", record.id)) {
      Database.update("TeacherPayrollPeriods", record.id, raw);
    } else {
      Database.insert("TeacherPayrollPeriods", raw);
    }
    return record;
  },
  updatePayrollRecord: function (record) {
    return TeacherPayrollPeriodService.savePayrollRecord(record);
  }
};

// 7. ClassService
var ClassService = {
  getAllClasses: function () {
    var classes = Database.readAll("Classes");
    var classStudents = Database.readAll("ClassStudents");
    
    // Group studentIds by classId
    var csMap = {};
    for (var i = 0; i < classStudents.length; i++) {
      var cs = classStudents[i];
      if (cs.status !== "DROPPED") {
        if (!csMap[cs.classId]) csMap[cs.classId] = [];
        csMap[cs.classId].push(cs.studentId);
      }
    }

    return classes.map(function (c) {
      var sIds = csMap[c.id] || [];
      // Support studentIds parsed if stored as JSON in Classes.studentIds
      if (c.studentIds && typeof c.studentIds === "string") {
        try {
          var parsed = JSON.parse(c.studentIds);
          if (Array.isArray(parsed) && parsed.length > 0) sIds = parsed;
        } catch (e) {}
      }
      var schedDays = [2, 4, 6];
      if (c.scheduleDays) {
        try {
          schedDays = typeof c.scheduleDays === "string" ? JSON.parse(c.scheduleDays) : c.scheduleDays;
        } catch (e) {}
      }
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        subject: c.subject,
        teacherId: c.teacherId,
        roomId: c.classroomId || c.roomId,
        studentIds: sIds,
        tuitionFee: Number(c.fee || c.tuitionFee || 0),
        scheduleDays: schedDays,
        shiftId: Number(c.shiftId || 1),
        meetingLink: c.meetingLink || "",
        status: c.status
      };
    });
  },
  getClassById: function (id) {
    var all = ClassService.getAllClasses();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  },
  getClassesByTeacherId: function (teacherId) {
    var all = ClassService.getAllClasses();
    return all.filter(function (c) { return c.teacherId === teacherId; });
  },
  getClassesByStudentId: function (studentId) {
    var all = ClassService.getAllClasses();
    return all.filter(function (c) { return c.studentIds.indexOf(studentId) !== -1; });
  },
  createClass: function (classEntity) {
    var raw = {
      id: classEntity.id,
      code: classEntity.code,
      name: classEntity.name,
      subject: classEntity.subject,
      teacherId: classEntity.teacherId,
      classroomId: classEntity.roomId,
      startDate: classEntity.startDate || new Date().toISOString().split("T")[0],
      endDate: classEntity.endDate || "",
      maxCapacity: classEntity.maxCapacity || 30,
      fee: classEntity.tuitionFee,
      status: classEntity.status,
      createdAt: new Date().toISOString()
    };
    Database.insert("Classes", raw);

    // If studentIds supplied, also insert ClassStudents
    if (classEntity.studentIds && classEntity.studentIds.length > 0) {
      var csRows = classEntity.studentIds.map(function (sId) {
        return {
          id: "cs_" + classEntity.id + "_" + sId,
          classId: classEntity.id,
          studentId: sId,
          enrolledAt: new Date().toISOString(),
          status: "ENROLLED"
        };
      });
      Database.batchInsert("ClassStudents", csRows);
    }
    return classEntity;
  },
  updateClass: function (classEntity) {
    var raw = {
      code: classEntity.code,
      name: classEntity.name,
      subject: classEntity.subject,
      teacherId: classEntity.teacherId,
      classroomId: classEntity.roomId,
      fee: classEntity.tuitionFee,
      status: classEntity.status
    };
    Database.update("Classes", classEntity.id, raw);

    // Update ClassStudents if studentIds is passed
    if (classEntity.studentIds) {
      // Find current students for class
      var currentCS = Database.findWhere("ClassStudents", function (cs) { return cs.classId === classEntity.id; });
      var existingSIds = currentCS.map(function (cs) { return cs.studentId; });
      var newSIds = classEntity.studentIds.filter(function (id) { return existingSIds.indexOf(id) === -1; });

      if (newSIds.length > 0) {
        var toInsert = newSIds.map(function (sId) {
          return {
            id: "cs_" + classEntity.id + "_" + sId,
            classId: classEntity.id,
            studentId: sId,
            enrolledAt: new Date().toISOString(),
            status: "ENROLLED"
          };
        });
        Database.batchInsert("ClassStudents", toInsert);
      }
    }
    return classEntity;
  }
};

// 8. ClassStudentService
var ClassStudentService = {
  enrollStudent: function (classId, studentId) {
    var existing = Database.findWhere("ClassStudents", function (cs) {
      return cs.classId === classId && cs.studentId === studentId;
    });
    if (existing.length > 0) {
      existing[0].status = "ENROLLED";
      return Database.update("ClassStudents", existing[0].id, existing[0]);
    }
    var newRecord = {
      id: "cs_" + classId + "_" + studentId,
      classId: classId,
      studentId: studentId,
      enrolledAt: new Date().toISOString(),
      status: "ENROLLED"
    };
    return Database.insert("ClassStudents", newRecord);
  },
  dropStudent: function (classId, studentId) {
    var existing = Database.findWhere("ClassStudents", function (cs) {
      return cs.classId === classId && cs.studentId === studentId;
    });
    if (existing.length > 0) {
      existing[0].status = "DROPPED";
      return Database.update("ClassStudents", existing[0].id, existing[0]);
    }
    return null;
  },
  getStudentsInClass: function (classId) {
    var list = Database.findWhere("ClassStudents", function (cs) {
      return cs.classId === classId && cs.status !== "DROPPED";
    });
    var studentIds = list.map(function (cs) { return cs.studentId; });
    var allStudents = Database.readAll("Students");
    return allStudents.filter(function (s) { return studentIds.indexOf(s.id) !== -1; });
  }
};

// 9. ScheduleService
var ScheduleService = {
  getAllScheduleSlots: function () {
    var slots = Database.readAll("Schedules");
    return slots.map(function (s) {
      return {
        id: s.id,
        classId: s.classId,
        teacherId: s.teacherId,
        roomId: s.classroomId || s.roomId,
        date: s.date,
        shiftId: Number(s.shift || s.shiftId || 1),
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject || "",
        topic: s.topic || "",
        meetingLink: s.meetingLink || "",
        status: s.status
      };
    });
  },
  getScheduleSlotById: function (id) {
    var all = ScheduleService.getAllScheduleSlots();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  },
  getSlotsByTeacherId: function (teacherId) {
    var all = ScheduleService.getAllScheduleSlots();
    return all.filter(function (s) { return s.teacherId === teacherId; });
  },
  getSlotsByClassId: function (classId) {
    var all = ScheduleService.getAllScheduleSlots();
    return all.filter(function (s) { return s.classId === classId; });
  },
  getSlotsByStudentId: function (studentId) {
    var classes = ClassService.getClassesByStudentId(studentId);
    var classIds = classes.map(function (c) { return c.id; });
    var all = ScheduleService.getAllScheduleSlots();
    return all.filter(function (s) { return classIds.indexOf(s.classId) !== -1; });
  },
  createScheduleSlot: function (slot) {
    var raw = {
      id: slot.id,
      classId: slot.classId,
      teacherId: slot.teacherId,
      classroomId: slot.roomId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      shift: slot.shiftId,
      status: slot.status,
      note: slot.topic || ""
    };
    Database.insert("Schedules", raw);
    return slot;
  },
  updateScheduleSlot: function (slot) {
    var raw = {
      classId: slot.classId,
      teacherId: slot.teacherId,
      classroomId: slot.roomId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      shift: slot.shiftId,
      status: slot.status,
      note: slot.topic || ""
    };
    Database.update("Schedules", slot.id, raw);
    return slot;
  }
};

// 10. AttendanceService
var AttendanceService = {
  getAttendanceBySlotId: function (slotId) {
    return Database.findWhere("Attendance", function (a) {
      return a.scheduleSlotId === slotId;
    });
  },
  getAttendanceByStudentId: function (studentId) {
    return Database.findWhere("Attendance", function (a) {
      return a.studentId === studentId;
    });
  },
  getAttendanceByClassId: function (classId) {
    return Database.findWhere("Attendance", function (a) {
      return a.classId === classId;
    });
  },
  saveAttendanceRecord: function (record) {
    var raw = {
      id: record.id,
      scheduleSlotId: record.scheduleSlotId,
      studentId: record.studentId,
      classId: record.classId,
      status: record.status,
      note: record.note || "",
      markedAt: record.updatedAt || new Date().toISOString(),
      markedBy: record.updatedBy || ""
    };
    if (Database.findOne("Attendance", "id", record.id)) {
      Database.update("Attendance", record.id, raw);
    } else {
      Database.insert("Attendance", raw);
    }
    return record;
  },
  saveAttendanceBatch: function (records) {
    if (!records || records.length === 0) return [];
    var rawRecords = records.map(function (record) {
      return {
        id: record.id,
        scheduleSlotId: record.scheduleSlotId,
        studentId: record.studentId,
        classId: record.classId,
        status: record.status,
        note: record.note || "",
        markedAt: record.updatedAt || new Date().toISOString(),
        markedBy: record.updatedBy || ""
      };
    });

    var all = Database.readAll("Attendance");
    var existingIds = {};
    for (var i = 0; i < all.length; i++) {
      existingIds[all[i].id] = true;
    }

    var toInsert = [];
    var toUpdate = [];

    for (var j = 0; j < rawRecords.length; j++) {
      if (existingIds[rawRecords[j].id]) {
        toUpdate.push(rawRecords[j]);
      } else {
        toInsert.push(rawRecords[j]);
      }
    }

    if (toInsert.length > 0) Database.batchInsert("Attendance", toInsert);
    if (toUpdate.length > 0) Database.batchUpdate("Attendance", toUpdate);

    return records;
  }
};

// 11. LeaveRequestService
var LeaveRequestService = {
  getAllRequests: function () {
    var all = Database.readAll("LeaveRequests");
    return all.map(function (r) {
      return {
        id: r.id,
        studentId: r.applicantId,
        classId: r.classId || "",
        scheduleSlotId: r.scheduleSlotId,
        type: r.type || "XIN_NGHI",
        reason: r.reason,
        status: r.status,
        reviewedBy: r.reviewedBy || undefined,
        reviewNote: r.reviewNote || undefined,
        createdAt: r.createdAt
      };
    });
  },
  getRequestById: function (id) {
    var all = LeaveRequestService.getAllRequests();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  },
  getRequestsByStudentId: function (studentId) {
    var all = LeaveRequestService.getAllRequests();
    return all.filter(function (r) { return r.studentId === studentId; });
  },
  getRequestsByTeacherId: function (teacherId) {
    var classes = ClassService.getClassesByTeacherId(teacherId);
    var classIds = classes.map(function (c) { return c.id; });
    var all = LeaveRequestService.getAllRequests();
    return all.filter(function (r) { return classIds.indexOf(r.classId) !== -1; });
  },
  createRequest: function (request) {
    var raw = {
      id: request.id,
      applicantId: request.studentId,
      applicantRole: "STUDENT",
      scheduleSlotId: request.scheduleSlotId,
      startDate: request.createdAt ? request.createdAt.split("T")[0] : "",
      endDate: request.createdAt ? request.createdAt.split("T")[0] : "",
      reason: request.reason,
      status: request.status,
      reviewedBy: request.reviewedBy || "",
      reviewNote: request.reviewNote || "",
      createdAt: request.createdAt || new Date().toISOString()
    };
    Database.insert("LeaveRequests", raw);
    return request;
  },
  updateRequest: function (request) {
    var raw = {
      reason: request.reason,
      status: request.status,
      reviewedBy: request.reviewedBy || "",
      reviewNote: request.reviewNote || ""
    };
    Database.update("LeaveRequests", request.id, raw);
    return request;
  }
};

// 12. ScheduleChangeService
var ScheduleChangeService = {
  createScheduleChangeRequest: function (req) {
    req.id = req.id || ("SC_" + new Date().getTime());
    req.createdAt = req.createdAt || new Date().toISOString();
    return Database.insert("ScheduleChanges", req);
  },
  reviewScheduleChangeRequest: function (id, status, reviewerId) {
    return Database.update("ScheduleChanges", id, {
      status: status,
      reviewedBy: reviewerId
    });
  }
};

// 13. TuitionService
var TuitionService = {
  getAllTuitionInvoices: function () {
    var list = Database.readAll("Tuitions");
    return list.map(function (t) {
      return {
        id: t.id,
        studentId: t.studentId,
        classId: t.classId,
        title: t.title,
        amount: Number(t.amount || 0),
        paidAmount: Number(t.paidAmount || 0),
        remainingAmount: Number(t.remainingAmount || 0),
        dueDate: t.dueDate,
        status: t.status,
        paidDate: t.paidDate || undefined,
        paymentMethod: t.paymentMethod || undefined,
        transactionCode: t.transactionCode || undefined
      };
    });
  },
  getTuitionInvoicesByStudentId: function (studentId) {
    var all = TuitionService.getAllTuitionInvoices();
    return all.filter(function (t) { return t.studentId === studentId; });
  },
  getTuitionInvoiceById: function (id) {
    var all = TuitionService.getAllTuitionInvoices();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  },
  createTuitionInvoice: function (invoice) {
    var now = new Date().toISOString();
    var raw = {
      id: invoice.id,
      studentId: invoice.studentId,
      classId: invoice.classId,
      title: invoice.title,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      createdAt: now,
      updatedAt: now
    };
    Database.insert("Tuitions", raw);
    return invoice;
  },
  updateTuitionInvoice: function (invoice) {
    var raw = {
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      status: invoice.status,
      updatedAt: new Date().toISOString()
    };
    Database.update("Tuitions", invoice.id, raw);
    return invoice;
  }
};

// 14. PaymentService
var PaymentService = {
  recordPayment: function (payment) {
    payment.id = payment.id || ("PAYM_" + new Date().getTime());
    payment.paymentDate = payment.paymentDate || new Date().toISOString();
    Database.insert("Payments", payment);

    // Automatically update Tuition record
    if (payment.tuitionId) {
      var tuition = Database.findOne("Tuitions", "id", payment.tuitionId);
      if (tuition) {
        var currentPaid = Number(tuition.paidAmount || 0) + Number(payment.amount || 0);
        var totalAmount = Number(tuition.amount || 0);
        var remaining = Math.max(0, totalAmount - currentPaid);
        var newStatus = remaining === 0 ? "Đã nộp" : (currentPaid > 0 ? "Còn nợ" : tuition.status);
        Database.update("Tuitions", payment.tuitionId, {
          paidAmount: currentPaid,
          remainingAmount: remaining,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      }
    }
    return payment;
  },
  getPaymentsByTuitionId: function (tuitionId) {
    return Database.findWhere("Payments", function (p) {
      return p.tuitionId === tuitionId;
    });
  }
};

// 15. NotificationService & AuditLogService
var NotificationService = {
  getNotifications: function (userId, role) {
    var all = Database.readAll("Notifications");
    return all.filter(function (n) {
      if (n.role === "ALL" || n.recipientRole === "ALL") return true;
      if (role && (n.role === role || n.recipientRole === role)) return true;
      if (userId && (n.userId === userId || n.recipientUserId === userId)) return true;
      return false;
    }).sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  },
  addNotification: function (notification) {
    var id = "NOTIF_" + new Date().getTime() + "_" + Math.random().toString(36).substring(2, 6);
    var full = {
      id: id,
      userId: notification.recipientUserId || notification.userId || "",
      role: notification.recipientRole || notification.role || "ALL",
      title: notification.title,
      message: notification.message,
      type: notification.type || "INFO",
      isRead: false,
      link: notification.link || "",
      createdAt: new Date().toISOString()
    };
    Database.insert("Notifications", full);
    return full;
  },
  markAsRead: function (id) {
    return !!Database.update("Notifications", id, { isRead: true });
  },
  markAllAsRead: function (userId) {
    var all = Database.readAll("Notifications");
    var toUpdate = [];
    for (var i = 0; i < all.length; i++) {
      if (!userId || all[i].userId === userId || all[i].role === "ALL") {
        all[i].isRead = true;
        toUpdate.push(all[i]);
      }
    }
    if (toUpdate.length > 0) {
      Database.batchUpdate("Notifications", toUpdate);
    }
    return true;
  }
};

var AuditLogService = {
  getAllAuditLogs: function () {
    var logs = Database.readAll("AuditLogs");
    return logs.sort(function (a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  },
  addAuditLog: function (log) {
    var count = Database.readAll("AuditLogs").length;
    var newLog = {
      id: "AUD" + String(count + 1).padStart(4, "0"),
      userId: log.userId,
      userName: log.userName,
      action: log.action,
      entity: log.targetResource || log.entity || "",
      entityId: log.targetId || log.entityId || "",
      details: typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || ""),
      ipAddress: log.ipAddress || "",
      timestamp: new Date().toISOString()
    };
    Database.insert("AuditLogs", newLog);
    return newLog;
  }
};
