import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { HomeworkSubmission, HomeworkTask } from '@/types/homework';
import { verifyDiscordSecret } from '@/lib/discordAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Authenticate secret token
  const auth = verifyDiscordSecret(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await request.json();
    const discordId = body.discord_id || body.discordId;
    const studentId = body.student_id || body.studentId;
    const messageUrl = body.message_url || body.discordMessageUrl || body.messageUrl;
    const imageUrls: string[] = body.image_urls || (body.imageUrl ? [body.imageUrl] : []);
    const content = body.content || body.note || '';
    const submittedAt = body.submitted_at || body.submittedAt || new Date().toISOString();
    const explicitTaskId = body.task_id || body.taskId;

    if (!discordId && !studentId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu discord_id hoặc student_id' },
        { status: 400 }
      );
    }

    // 2. Find student
    const allStudents = await repo.getAllStudents();
    const student = allStudents.find(
      s => (discordId && s.discordId === discordId) || (studentId && s.id === studentId)
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy hồ sơ học sinh liên kết với tài khoản Discord này' },
        { status: 404 }
      );
    }

    // 3. Find suitable task
    const allTasks = await repo.getAllHomeworkTasks();
    let targetTask: HomeworkTask | null = null;

    if (explicitTaskId) {
      targetTask = allTasks.find(t => t.id === explicitTaskId) || null;
    }

    if (!targetTask) {
      // Find tasks belonging to student's enrolled classes
      const studentClassIds = student.enrolledClassIds || [];
      const classTasks = allTasks.filter(t => studentClassIds.length === 0 || studentClassIds.includes(t.classId));
      const pool = classTasks.length > 0 ? classTasks : allTasks;

      // Try matching taskId inside content (e.g. HW_..., HW..., TASK...)
      if (content && content.trim().length > 0) {
        const lowerContent = content.toLowerCase();

        // 3.1 Direct ID reference in content
        const directIdMatch = pool.find(t => lowerContent.includes(t.id.toLowerCase()));
        if (directIdMatch) {
          targetTask = directIdMatch;
        } else {
          // 3.2 Keyword / word overlap scoring
          let bestScore = 0;
          let bestTask: HomeworkTask | null = null;

          for (const task of pool) {
            const lowerTitle = task.title.toLowerCase();
            if (lowerContent.includes(lowerTitle)) {
              bestScore = 999;
              bestTask = task;
              break;
            }

            // Calculate word overlap
            const words = lowerTitle.split(/[\s,.-]+/).filter(w => w.length > 2);
            let matchCount = 0;
            for (const w of words) {
              if (lowerContent.includes(w)) {
                matchCount++;
              }
            }
            if (matchCount > 1 && matchCount > bestScore) {
              bestScore = matchCount;
              bestTask = task;
            }
          }

          if (bestTask) {
            targetTask = bestTask;
          }
        }
      }

      // 3.3 If still not matched, pick the soonest upcoming task or most recent
      if (!targetTask && pool.length > 0) {
        const now = Date.now();
        // Prioritize tasks with deadline in future
        const sorted = [...pool].sort((a, b) => {
          const timeA = new Date(a.deadline).getTime();
          const timeB = new Date(b.deadline).getTime();
          const diffA = timeA - now;
          const diffB = timeB - now;
          if (diffA >= 0 && diffB >= 0) return diffA - diffB;
          if (diffA >= 0) return -1;
          if (diffB >= 0) return 1;
          return diffB - diffA;
        });
        targetTask = sorted[0];
      }
    }

    if (!targetTask) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bài tập phù hợp để nộp' },
        { status: 404 }
      );
    }

    // 4. Upsert submission
    const existingSubmissions = await repo.getHomeworkSubmissionsByTaskId(targetTask.id);
    const existing = existingSubmissions.find(s => s.studentId === student.id);

    const submissionPayload: HomeworkSubmission = {
      id: existing?.id || `SUB_DISCORD_${Date.now()}_${student.id}`,
      taskId: targetTask.id,
      studentId: student.id,
      submittedAt: submittedAt,
      status: 'DA_NOP',
      discordMessageUrl: messageUrl || (imageUrls.length > 0 ? imageUrls[0] : undefined),
      note: content ? (existing?.note ? `${existing.note} | Discord: ${content}` : `Discord: ${content}`) : (existing?.note || 'Nộp qua Discord Bot'),
    };

    const saved = await repo.upsertHomeworkSubmission(submissionPayload);

    // 5. Add Audit Log
    await repo.addAuditLog({
      userId: 'DISCORD_BOT',
      userName: 'Discord Homework Bot',
      userRole: 'ADMIN' as any,
      action: 'HOMEWORK_SUBMIT',
      targetResource: 'HOMEWORK',
      targetId: targetTask.id,
      details: `Học sinh ${student.name} (${student.id}) đã nộp bài tập "${targetTask.title}" qua Discord`,
    });

    return NextResponse.json({
      success: true,
      message: 'Ghi nhận nộp bài tập thành công',
      task_id: targetTask.id,
      taskId: targetTask.id,
      task_title: targetTask.title,
      taskTitle: targetTask.title,
      student_id: student.id,
      studentId: student.id,
      student_name: student.name,
      studentName: student.name,
      submission: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi ghi nhận nộp bài qua Discord' },
      { status: 500 }
    );
  }
}
