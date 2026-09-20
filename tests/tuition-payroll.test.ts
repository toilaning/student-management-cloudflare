import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repositories/LocalRepository';
import { TuitionPayrollService } from '../src/services/TuitionPayrollService';

test('Tuition & Payroll Suite: Tính toán tài chính, học phí và lương giáo viên', async (t) => {
  const repo = LocalRepository.getInstance();
  const financeService = new TuitionPayrollService(repo);

  await t.test('1. Thống kê công nợ học phí của học viên chính xác', async () => {
    const invoices = await repo.getAllTuitionInvoices();
    assert.ok(invoices.length > 0, 'Phải có hóa đơn học phí');
    const studentId = invoices[0].studentId;

    const summary = await financeService.getStudentTuitionSummary(studentId);
    assert.equal(summary.studentId, studentId);
    assert.equal(summary.totalBilled, summary.totalPaid + summary.totalDebt, 'Tổng học phí = Đã nộp + Còn nợ');
    assert.ok(summary.invoiceCount > 0);
  });

  await t.test('2. Xử lý thanh toán học phí cập nhật số dư và trạng thái chính xác', async () => {
    // Tìm 1 hóa đơn còn nợ
    const allInvoices = await repo.getAllTuitionInvoices();
    let debtInvoice = allInvoices.find(inv => inv.remainingAmount > 0);
    if (!debtInvoice) {
      // Nếu không có, tạo mới 1 invoice để test
      debtInvoice = await repo.updateTuitionInvoice({
        id: 'TUI_TEST_001',
        studentId: 'ST001',
        classId: 'CLS01',
        title: 'Học phí Test',
        amount: 3000000,
        paidAmount: 1000000,
        remainingAmount: 2000000,
        dueDate: '2026-09-30',
        status: 'Còn nợ',
      });
    }

    const payAmount = 500000;
    const prevPaid = debtInvoice.paidAmount;
    const prevDebt = debtInvoice.remainingAmount;

    const updated = await financeService.processPayment(
      debtInvoice.id, 
      payAmount, 
      'Chuyển khoản QR', 
      'TEST_MOMO_999'
    );

    assert.equal(updated.paidAmount, prevPaid + payAmount, 'Số tiền đã trả phải tăng đúng lượng');
    assert.equal(updated.remainingAmount, prevDebt - payAmount, 'Số nợ phải giảm tương ứng');
    assert.equal(updated.paymentMethod, 'Chuyển khoản QR');
    assert.equal(updated.transactionCode, 'TEST_MOMO_999');

    // Thanh toán nốt số tiền còn lại
    if (updated.remainingAmount > 0) {
      const fullyPaid = await financeService.processPayment(
        updated.id, 
        updated.remainingAmount, 
        'Chuyển khoản QR'
      );
      assert.equal(fullyPaid.remainingAmount, 0);
      assert.equal(fullyPaid.status, 'Đã nộp');
    }
  });

  await t.test('3. Tính bảng lương giáo viên tháng 09/2026 dựa trên số ca hoàn thành', async () => {
    const teachers = await repo.getAllTeachers();
    assert.ok(teachers.length > 0);
    const teacher = teachers[0];

    const payroll = await financeService.calculateTeacherPayroll(teacher.id, '2026-09');
    assert.equal(payroll.teacherId, teacher.id);
    assert.equal(payroll.month, '2026-09');
    assert.equal(payroll.totalHours, payroll.totalSlots * 2, 'Tổng giờ = Tổng ca * 2');
    assert.equal(payroll.grossSalary, payroll.totalHours * teacher.hourlyRate, 'Lương gộp = Giờ * Đơn giá');
    assert.equal(payroll.netSalary, payroll.grossSalary + payroll.bonus - payroll.deduction, 'Thực nhận = Gộp + Thưởng - Khấu trừ');

    // Test chốt lương
    const finalized = await financeService.finalizePayroll(payroll.id, 'CHỐT');
    assert.equal(finalized.status, 'Đã chốt');

    // Test thanh toán lương
    const paid = await financeService.finalizePayroll(payroll.id, 'THANH_TOÁN');
    assert.equal(paid.status, 'Đã thanh toán');
    assert.ok(paid.paidDate);
  });

  await t.test('4. Tạo mới hóa đơn học phí (createInvoice) và ghi Audit Log', async () => {
    const studentId = 'ST001';
    const classId = 'CLS01';
    const originalAmount = 4000000;
    const discountAmount = 500000;
    const finalAmount = originalAmount - discountAmount;
    const dueDate = '2026-10-15';
    const notes = 'Miễn giảm 500k học bổng đầu vào';

    const newInvoice = await financeService.createInvoice({
      studentId,
      classId,
      title: 'Học phí Kỹ thuật Lập trình tháng 10/2026',
      amount: finalAmount,
      dueDate,
      notes,
    });

    assert.ok(newInvoice.id.startsWith('TUI'), 'Mã hóa đơn phải bắt đầu bằng TUI');
    assert.equal(newInvoice.studentId, studentId);
    assert.equal(newInvoice.classId, classId);
    assert.equal(newInvoice.amount, 3500000);
    assert.equal(newInvoice.paidAmount, 0);
    assert.equal(newInvoice.remainingAmount, 3500000);
    assert.equal(newInvoice.status, 'Còn nợ');
    assert.equal(newInvoice.dueDate, dueDate);

    // Kiểm tra đã lưu vào repo
    const fetched = await repo.getTuitionInvoiceById(newInvoice.id);
    assert.ok(fetched, 'Phải tìm thấy hóa đơn vừa tạo trong repo');
    assert.equal(fetched?.amount, 3500000);

    // Kiểm tra Audit Log
    const auditLogs = await repo.getAllAuditLogs();
    const invoiceLog = auditLogs.find(l => l.targetId === newInvoice.id && l.action === 'CREATE');
    assert.ok(invoiceLog, 'Phải có Audit Log CREATE cho hóa đơn vừa tạo');
    assert.equal(invoiceLog?.targetResource, 'TUITION_INVOICE');
    assert.ok(invoiceLog?.details.includes('3.500.000'));
  });
});
