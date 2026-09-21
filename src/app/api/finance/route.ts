import { repo } from '@/repositories';
import { NextResponse } from 'next/server';
import { TuitionPayrollService } from '@/services/TuitionPayrollService';
import { TuitionStatus } from '@/types/finance';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: TuitionStatus[] = ['Đã nộp', 'Còn nợ', 'Quá hạn', 'Miễn giảm'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const summary = searchParams.get('summary');

  const financeService = new TuitionPayrollService(repo);

  if (studentId) {
    if (summary === 'true') {
      const data = await financeService.getStudentTuitionSummary(studentId);
      return NextResponse.json(data);
    }
    const invoices = await repo.getTuitionInvoicesByStudentId(studentId);
    return NextResponse.json({ invoices });
  }

  const invoices = await repo.getAllTuitionInvoices();
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const financeService = new TuitionPayrollService(repo);

    // Luồng: Cập nhật trạng thái thủ công (Status Override)
    if (body.action === "UPDATE_STATUS") {
      const { 
        invoiceId, 
        status, 
        paymentMethod, 
        paidDate, 
        transactionCode, 
        note, 
        reason,
        actorId = 'ADMIN001', 
        actorName = 'Quản trị viên' 
      } = body;

      if (!invoiceId) {
        return NextResponse.json({ error: 'Thiếu thông tin mã hóa đơn (invoiceId)' }, { status: 400 });
      }
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ 
          error: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}` 
        }, { status: 400 });
      }

      const invoice = await repo.getTuitionInvoiceById(invoiceId);
      if (!invoice) {
        return NextResponse.json({ error: `Không tìm thấy hóa đơn học phí với mã ${invoiceId}` }, { status: 404 });
      }

      const overrideReason = reason || note || '';
      if (overrideReason) {
        invoice.note = overrideReason;
      }

      if (status === 'Đã nộp') {
        invoice.paidAmount = invoice.amount;
        invoice.remainingAmount = 0;
        invoice.status = 'Đã nộp';
        invoice.paidDate = paidDate || new Date().toISOString().split('T')[0];
        invoice.paymentMethod = paymentMethod || 'Tiền mặt';
        invoice.transactionCode = transactionCode || `MANUAL-${Date.now()}`;
      } else if (status === 'Còn nợ') {
        invoice.paidAmount = 0;
        invoice.remainingAmount = invoice.amount;
        invoice.status = 'Còn nợ';
        invoice.paidDate = undefined;
        invoice.paymentMethod = undefined;
        invoice.transactionCode = undefined;
      } else if (status === 'Quá hạn') {
        invoice.status = 'Quá hạn';
        invoice.remainingAmount = invoice.amount - (invoice.paidAmount || 0);
      } else if (status === 'Miễn giảm') {
        invoice.status = 'Miễn giảm';
        invoice.paidAmount = invoice.amount;
        invoice.remainingAmount = 0;
        invoice.paidDate = paidDate || new Date().toISOString().split('T')[0];
        invoice.paymentMethod = paymentMethod || 'Tiền mặt';
      }

      await repo.updateTuitionInvoice(invoice);

      await repo.addAuditLog({
        action: 'UPDATE_STATUS',
        userId: actorId,
        userName: actorName,
        userRole: 'ADMIN',
        targetResource: 'TUITION',
        targetId: invoice.id,
        details: `Cập nhật thủ công trạng thái hóa đơn [${invoice.id}] thành "${invoice.status}"${overrideReason ? ` - Lý do: ${overrideReason}` : ''} (Đã nộp: ${invoice.paidAmount.toLocaleString('vi-VN')} đ, Phương thức: ${invoice.paymentMethod || 'N/A'})`,
      });

      return NextResponse.json({
        success: true,
        invoice,
        message: 'Đã cập nhật trạng thái hóa đơn thành công!',
      });
    }

    // Luồng: Học sinh tự chọn gói & mua gói (PURCHASE_PACKAGE)
    if (body.action === "PURCHASE_PACKAGE") {
      const { studentId, packageId } = body;
      if (!studentId || !packageId) {
        return NextResponse.json({ error: 'Thiếu thông tin studentId hoặc packageId' }, { status: 400 });
      }

      const pkg = await repo.getSessionPackageById(packageId);
      if (!pkg) {
        return NextResponse.json({ error: `Không tìm thấy gói buổi học ${packageId}` }, { status: 404 });
      }

      const next15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const newInvoice = await financeService.createInvoice({
        studentId,
        classId: 'CHUNG',
        packageId: pkg.id,
        sessionCount: pkg.sessionCount,
        usedSessions: 0,
        title: `Đăng ký ${pkg.name} (${pkg.sessionCount} buổi)`,
        amount: pkg.price,
        dueDate: next15Days,
        notes: `Học sinh tự chọn mua ${pkg.name}`,
      });

      await repo.addAuditLog({
        userId: studentId,
        userName: `Sinh viên ${studentId}`,
        userRole: 'STUDENT',
        action: 'PACKAGE_PURCHASE',
        targetResource: 'TUITION_INVOICE',
        targetId: newInvoice.id,
        details: `Học sinh ${studentId} đăng ký mua ${pkg.name} (${pkg.sessionCount} buổi) - Mã HĐ: ${newInvoice.id}, Giá: ${pkg.price.toLocaleString('vi-VN')} đ`,
      });

      return NextResponse.json({
        success: true,
        invoice: newInvoice,
        message: `Đã tạo hóa đơn cho ${pkg.name}!`,
      }, { status: 201 });
    }

    // Luồng 1: Tạo hóa đơn mới
    if (body.action === "CREATE" || (body.title && !body.invoiceId) || (body.studentId && (body.originalAmount !== undefined || body.amount !== undefined) && !body.invoiceId)) {
      const {
        studentId,
        classId,
        packageId,
        sessionCount,
        title,
        originalAmount,
        discountAmount = 0,
        finalAmount,
        amount,
        dueDate,
        notes,
      } = body;

      const calcAmount = finalAmount !== undefined 
        ? Number(finalAmount) 
        : (originalAmount !== undefined ? (Number(originalAmount) - Number(discountAmount || 0)) : Number(amount));

      const effectiveClassId = classId || 'CHUNG';
      const now = new Date();
      const defaultMonth = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

      const newInvoice = await financeService.createInvoice({
        studentId,
        classId: effectiveClassId,
        packageId,
        sessionCount: sessionCount ? Number(sessionCount) : undefined,
        usedSessions: 0,
        title: title || `Học phí khóa học - ${defaultMonth}`,
        amount: calcAmount,
        dueDate,
        notes,
      });

      return NextResponse.json({ 
        success: true, 
        invoice: newInvoice, 
        message: "Đã tạo hóa đơn học phí thành công!" 
      }, { status: 201 });
    }

    // Luồng 2: Thanh toán học phí cũ
    const { invoiceId, paymentAmount, paymentMethod, transactionCode } = body;

    const updated = await financeService.processPayment(
      invoiceId, 
      paymentAmount, 
      paymentMethod || "Chuyển khoản QR", 
      transactionCode
    );

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      invoiceId, 
      status, 
      paymentMethod, 
      paidDate, 
      transactionCode, 
      note, 
      reason, 
      actorId = 'ADMIN001', 
      actorName = 'Quản trị viên' 
    } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Thiếu thông tin mã hóa đơn (invoiceId)' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}` 
      }, { status: 400 });
    }

    const invoice = await repo.getTuitionInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: `Không tìm thấy hóa đơn học phí với mã ${invoiceId}` }, { status: 404 });
    }

    const overrideReason = reason || note || '';
    if (overrideReason) {
      invoice.note = overrideReason;
    }

    if (status === 'Đã nộp') {
      invoice.paidAmount = invoice.amount;
      invoice.remainingAmount = 0;
      invoice.status = 'Đã nộp';
      invoice.paidDate = paidDate || new Date().toISOString().split('T')[0];
      invoice.paymentMethod = paymentMethod || 'Tiền mặt';
      invoice.transactionCode = transactionCode || `MANUAL-${Date.now()}`;
    } else if (status === 'Còn nợ') {
      invoice.paidAmount = 0;
      invoice.remainingAmount = invoice.amount;
      invoice.status = 'Còn nợ';
      invoice.paidDate = undefined;
      invoice.paymentMethod = undefined;
      invoice.transactionCode = undefined;
    } else if (status === 'Quá hạn') {
      invoice.status = 'Quá hạn';
      invoice.remainingAmount = invoice.amount - (invoice.paidAmount || 0);
    } else if (status === 'Miễn giảm') {
      invoice.status = 'Miễn giảm';
      invoice.paidAmount = invoice.amount;
      invoice.remainingAmount = 0;
      invoice.paidDate = paidDate || new Date().toISOString().split('T')[0];
      invoice.paymentMethod = paymentMethod || 'Tiền mặt';
    }

    await repo.updateTuitionInvoice(invoice);

    await repo.addAuditLog({
      action: 'UPDATE_STATUS',
      userId: actorId,
      userName: actorName,
      userRole: 'ADMIN',
      targetResource: 'TUITION',
      targetId: invoice.id,
      details: `Cập nhật thủ công trạng thái hóa đơn [${invoice.id}] thành "${invoice.status}"${overrideReason ? ` - Lý do: ${overrideReason}` : ''} (Đã nộp: ${invoice.paidAmount.toLocaleString('vi-VN')} đ, Phương thức: ${invoice.paymentMethod || 'N/A'})`,
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Đã cập nhật trạng thái hóa đơn thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi cập nhật trạng thái hóa đơn' }, { status: 500 });
  }
}
