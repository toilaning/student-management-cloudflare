import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { HomeworkSubmission } from '@/types/homework';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const studentId = searchParams.get('studentId');

    let submissions: HomeworkSubmission[] = [];

    if (taskId && studentId) {
      const byTask = await repo.getHomeworkSubmissionsByTaskId(taskId);
      submissions = byTask.filter(s => s.studentId === studentId);
    } else if (taskId) {
      submissions = await repo.getHomeworkSubmissionsByTaskId(taskId);
    } else if (studentId) {
      submissions = await repo.getHomeworkSubmissionsByStudentId(studentId);
    } else {
      // Return all submissions by collecting tasks
      const allTasks = await repo.getAllHomeworkTasks();
      const map = new Map<string, HomeworkSubmission>();
      for (const t of allTasks) {
        const subs = await repo.getHomeworkSubmissionsByTaskId(t.id);
        subs.forEach(s => map.set(s.id, s));
      }
      submissions = Array.from(map.values());
    }

    return NextResponse.json({ success: true, data: submissions, submissions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy danh sách nộp bài' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, studentId, status, discordMessageUrl, note } = body;

    if (!taskId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc (taskId, studentId)' },
        { status: 400 }
      );
    }

    const submissionPayload: HomeworkSubmission = {
      id: body.id || '',
      taskId,
      studentId,
      status: status || 'DA_NOP',
      submittedAt: body.submittedAt || new Date().toISOString(),
      discordMessageUrl: discordMessageUrl || undefined,
      note: note || undefined,
    };

    const saved = await repo.upsertHomeworkSubmission(submissionPayload);

    return NextResponse.json(
      { success: true, data: saved, submission: saved },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi cập nhật bài nộp' },
      { status: 500 }
    );
  }
}
