import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { verifyDiscordSecret } from '@/lib/discordAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Authenticate secret token
  const auth = verifyDiscordSecret(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const hoursParam = searchParams.get('hours');
    const maxHours = hoursParam ? parseFloat(hoursParam) : 24;

    const allTasks = await repo.getAllHomeworkTasks();
    const allStudents = await repo.getAllStudents();
    const now = new Date();

    const pendingTasksOutput: any[] = [];

    for (const task of allTasks) {
      const deadlineDate = new Date(task.deadline);
      const diffMs = deadlineDate.getTime() - now.getTime();
      const hoursLeft = diffMs / (1000 * 60 * 60);

      // Check if task deadline is in the future within maxHours (or recently reached within 0 to maxHours)
      // Also allow tasks where hoursLeft >= 0 and hoursLeft <= maxHours
      if (hoursLeft >= -2 && hoursLeft <= maxHours) {
        // Find students enrolled in the class for this task
        const enrolledStudents = allStudents.filter(
          s => s.enrolledClassIds && s.enrolledClassIds.includes(task.classId)
        );

        // Get submissions for this task
        const submissions = await repo.getHomeworkSubmissionsByTaskId(task.id);
        const submittedStudentIds = new Set(
          submissions.filter(s => s.status === 'DA_NOP').map(s => s.studentId)
        );

        // Find pending students who haven't submitted DA_NOP and have a discordId
        const pendingStudents = enrolledStudents
          .filter(st => !submittedStudentIds.has(st.id) && !!st.discordId)
          .map(st => ({
            student_id: st.id,
            studentId: st.id,
            student_name: st.name,
            studentName: st.name,
            discord_id: st.discordId!,
            discordId: st.discordId!,
            discord_username: st.discordUsername,
            discordUsername: st.discordUsername,
          }));

        if (pendingStudents.length > 0) {
          pendingTasksOutput.push({
            task_id: task.id,
            taskId: task.id,
            task_title: task.title,
            taskTitle: task.title,
            class_id: task.classId,
            classId: task.classId,
            deadline: task.deadline,
            hours_left: Math.round(hoursLeft * 10) / 10,
            hoursLeft: Math.round(hoursLeft * 10) / 10,
            pending_students: pendingStudents,
            pendingStudents: pendingStudents,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      tasks: pendingTasksOutput,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi lấy danh sách bài tập cần nhắc nhở' },
      { status: 500 }
    );
  }
}
