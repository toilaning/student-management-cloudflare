import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { TuitionInvoice, TuitionStatus } from '@/types/finance';

export const dynamic = 'force-dynamic';

/**
 * Endpoint tiếp nhận Webhook ngân hàng (SePay, Casso, Bank Gateway)
 * Hỗ trợ các định dạng webhook biến động số dư phổ biến
 * Payload format:
 * {
 *   gateway?: string,
 *   accountNumber?: string,
 *   transferType?: 'in' | 'out',
 *   transferAmount?: number,
 *   accumulated?: number,
 *   subAccount?: string | null,
 *   referenceCode?: string,
 *   code?: string,
 *   content?: string,
 *   description?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Chuẩn hóa các trường đầu vào
    const transferType = (body.transferType || body.type || 'in').toLowerCase();
    // Bỏ qua nếu là giao dịch tiền ra (out)
    if (transferType === 'out') {
      return NextResponse.json({
        success: false,
        message: 'Bỏ qua giao dịch chuyển tiền đi (transferType = out)',
      }, { status: 200 });
    }

    const transferAmount = Number(body.transferAmount !== undefined ? body.transferAmount : (body.amount !== undefined ? body.amount : 0));
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Số tiền giao dịch không hợp lệ hoặc nhỏ hơn 0',
      }, { status: 400 });
    }

    const rawContent = (body.content || body.description || body.code || '').trim();
    const referenceCode = (body.referenceCode || body.transactionCode || body.id || `TXN_${Date.now()}`).toString();
    const gateway = (body.gateway || 'BANK_GATEWAY').toString();

    // 2. Phân tích nội dung tìm Mã Sinh Viên (STxxx) hoặc Mã Hóa Đơn (TUIxxx / INVxxx)
    const upperContent = rawContent.toUpperCase();

    const allInvoices = await repo.getAllTuitionInvoices();
    let targetInvoices: TuitionInvoice[] = [];
    let matchedInvoiceId: string | null = null;
    let matchedStudentId: string | null = null;

    // 2.1. Tìm kiếm trực tiếp mã hóa đơn có trong nội dung
    // Ưu tiên khớp chính xác ID hóa đơn tồn tại trong hệ thống
    const directInvoice = allInvoices.find(inv => {
      const idUpper = inv.id.toUpperCase();
      const invVariant = idUpper.replace('TUI', 'INV');
      return upperContent.includes(idUpper) || upperContent.includes(invVariant);
    });

    if (directInvoice) {
      targetInvoices.push(directInvoice);
      matchedInvoiceId = directInvoice.id;
      matchedStudentId = directInvoice.studentId;
    } else {
      // Regex trích xuất nếu không trùng ID trực tiếp
      const invoiceRegexMatch = upperContent.match(/\b(?:TUI|INV)[A-Z0-9_-]+\b/i);
      if (invoiceRegexMatch) {
        matchedInvoiceId = invoiceRegexMatch[0];
        // Thử tìm lại lần nữa với ID đã trích xuất
        const found = allInvoices.find(i => 
          i.id.toUpperCase() === matchedInvoiceId!.toUpperCase() ||
          i.id.toUpperCase().replace(/[-_]/g, '') === matchedInvoiceId!.toUpperCase().replace(/[-_]/g, '') ||
          i.id.toUpperCase().replace('TUI', 'INV') === matchedInvoiceId!.toUpperCase()
        );
        if (found) {
          targetInvoices.push(found);
          matchedInvoiceId = found.id;
          matchedStudentId = found.studentId;
        }
      }
    }

    // 2.2. Nếu chưa tìm thấy hóa đơn, tìm theo Mã Sinh Viên
    if (targetInvoices.length === 0) {
      // Thử tìm sinh viên tồn tại trong hệ thống trước
      const allStudents = await repo.getAllStudents();
      const directStudent = allStudents.find(st => upperContent.includes(st.id.toUpperCase()));
      if (directStudent) {
        matchedStudentId = directStudent.id;
      } else {
        const studentRegexMatch = upperContent.match(/\bST[A-Z0-9_-]+\b/i);
        if (studentRegexMatch) {
          matchedStudentId = studentRegexMatch[0];
        }
      }

      if (matchedStudentId) {
        const studentIdClean = matchedStudentId.toUpperCase();
        // Sắp xếp các hóa đơn còn nợ theo thứ tự ngày hạn chót hoặc ID tăng dần (FIFO)
        const studentUnpaidInvoices = allInvoices
          .filter(i => 
            (i.studentId.toUpperCase() === studentIdClean || i.studentId.toUpperCase().replace(/[-_]/g, '') === studentIdClean.replace(/[-_]/g, '')) && 
            i.remainingAmount > 0
          )
          .sort((a, b) => {
            const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (dateDiff !== 0) return dateDiff;
            return a.id.localeCompare(b.id);
          });

        if (studentUnpaidInvoices.length > 0) {
          targetInvoices = studentUnpaidInvoices;
        }
      }
    }

    // Nếu không tìm thấy thông tin phù hợp
    if (targetInvoices.length === 0) {
      await repo.addAuditLog({
        userId: 'SYSTEM_BANK_WEBHOOK',
        userName: 'Ngân hàng Tự động (Webhook)',
        userRole: 'SYSTEM',
        action: 'PAYMENT_PROCESS',
        targetResource: 'TUITION',
        targetId: referenceCode,
        details: `[CẢNH BÁO] Nhận biến động số dư +${transferAmount.toLocaleString('vi-VN')} VNĐ qua ${gateway}. Nội dung: "${rawContent}". Không tìm thấy hóa đơn hoặc sinh viên phù hợp.`,
      });

      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy hóa đơn hoặc sinh viên phù hợp từ nội dung giao dịch',
        content: rawContent,
      }, { status: 404 });
    }

    // 3. Tiến hành gạch nợ lần lượt theo số tiền nhận được
    let remainingTransfer = transferAmount;
    const reconciledInvoices: Array<{
      id: string;
      studentId: string;
      paidAmountAdded: number;
      remainingAmount: number;
      status: TuitionStatus;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    for (const inv of targetInvoices) {
      if (remainingTransfer <= 0) break;

      const debtAmount = inv.remainingAmount > 0 ? inv.remainingAmount : Math.max(0, inv.amount - inv.paidAmount);
      if (debtAmount <= 0) continue;

      const deductAmount = Math.min(debtAmount, remainingTransfer);
      inv.paidAmount = inv.paidAmount + deductAmount;
      inv.remainingAmount = Math.max(0, inv.amount - inv.paidAmount);
      inv.status = (inv.remainingAmount === 0 ? 'DA_NOP' : 'CON_NO') as TuitionStatus;
      inv.paidDate = todayStr;
      inv.paymentMethod = 'Chuyển khoản QR';
      inv.transactionCode = referenceCode;

      await repo.updateTuitionInvoice(inv);

      remainingTransfer -= deductAmount;
      reconciledInvoices.push({
        id: inv.id,
        studentId: inv.studentId,
        paidAmountAdded: deductAmount,
        remainingAmount: inv.remainingAmount,
        status: inv.status,
      });

      if (matchedInvoiceId) {
        break;
      }
    }

    // Nếu tất cả hóa đơn đã trả hết nợ từ trước mà người dùng vẫn chuyển thêm tiền
    if (reconciledInvoices.length === 0 && targetInvoices.length > 0) {
      const inv = targetInvoices[0];
      inv.paidAmount += transferAmount;
      inv.remainingAmount = 0;
      inv.status = 'DA_NOP' as TuitionStatus;
      inv.paidDate = todayStr;
      inv.paymentMethod = 'Chuyển khoản QR';
      inv.transactionCode = referenceCode;
      await repo.updateTuitionInvoice(inv);
      reconciledInvoices.push({
        id: inv.id,
        studentId: inv.studentId,
        paidAmountAdded: transferAmount,
        remainingAmount: 0,
        status: 'DA_NOP',
      });
    }

    const primaryInvoice = reconciledInvoices[0];

    // 4. Ghi Audit Log với action 'PAYMENT_PROCESS' và chi tiết nguồn 'BANK_WEBHOOK_AUTO'
    await repo.addAuditLog({
      userId: 'SYSTEM_BANK_WEBHOOK',
      userName: 'Ngân hàng Tự động (Webhook)',
      userRole: 'SYSTEM',
      action: 'PAYMENT_PROCESS',
      targetResource: 'TUITION',
      targetId: primaryInvoice ? primaryInvoice.id : 'MULTIPLE',
      details: `[BANK_WEBHOOK_AUTO] Gạch nợ tự động thành công +${transferAmount.toLocaleString('vi-VN')} VNĐ qua ${gateway}. Mã GD: ${referenceCode}. Nội dung: "${rawContent}". Hóa đơn xử lý: ${reconciledInvoices.map(r => `${r.id} (+${r.paidAmountAdded.toLocaleString('vi-VN')} đ, Còn nợ: ${r.remainingAmount.toLocaleString('vi-VN')} đ)`).join('; ')}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Đã tự động gạch nợ học phí thành công',
      invoiceId: primaryInvoice?.id,
      studentId: primaryInvoice?.studentId || matchedStudentId,
      amountPaid: transferAmount,
      reconciledInvoices,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Lỗi xử lý webhook gạch nợ ngân hàng',
    }, { status: 500 });
  }
}
