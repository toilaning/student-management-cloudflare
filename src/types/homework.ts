export type HomeworkSubmissionStatus = 'CHUA_NOP' | 'DA_NOP' | 'QUA_HAN';
export type HomeworkStatus = HomeworkSubmissionStatus;

export interface HomeworkTask {
  id: string;              // Format: HW0001, HW0002,...
  classId: string;         // Mã lớp học áp dụng (ví dụ: CLS0001, CLS0002)
  title: string;           // Tiêu đề bài tập (ví dụ: "Bài 01: Phác thảo dáng người cơ bản")
  description: string;     // Yêu cầu chi tiết: chất liệu (chì, màu nước, digital), góc vẽ, lưu ý chuyên môn
  deadline: string;        // ISO-8601 string hoặc YYYY-MM-DDTHH:mm
  createdBy: string;       // Tên hoặc User ID của Admin/Giáo viên giao bài
  createdAt: string;       // ISO-8601 string thời gian tạo
}

export interface HomeworkSubmission {
  id: string;                  // Format: SUB0001, SUB0002,...
  taskId: string;              // Tham chiếu HomeworkTask.id
  studentId: string;           // Tham chiếu Student.id (hoặc user ID học viên)
  submittedAt: string;         // ISO-8601 string (thời điểm nộp bài hoặc cập nhật trạng thái)
  status: HomeworkSubmissionStatus; // Trạng thái nộp bài
  discordMessageUrl?: string;  // Link message/ảnh bài vẽ nộp trên Discord (kênh #nop-bai-tap)
  note?: string;               // Ghi chú hoặc nhận xét của giáo viên / học sinh
}
