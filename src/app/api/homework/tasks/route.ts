import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { HomeworkTask } from '@/types/homework';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    let tasks: HomeworkTask[] = [];
    if (classId) {
      tasks = await repo.getHomeworkTasksByClassId(classId);
    } else {
      tasks = await repo.getAllHomeworkTasks();
    }

    return NextResponse.json({ success: true, data: tasks, tasks });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi tải danh sách bài tập' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, title, description, deadline, createdBy } = body;

    if (!classId || !title || !deadline) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc (classId, title, deadline)' },
        { status: 400 }
      );
    }

    const newTask: HomeworkTask = {
      id: body.id || `HW${Date.now()}`,
      classId,
      title: title.trim(),
      description: (description || '').trim(),
      deadline,
      createdBy: createdBy || 'ADMIN001',
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const saved = await repo.createHomeworkTask(newTask);

    return NextResponse.json(
      { success: true, data: saved, task: saved },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi tạo bài tập mới' },
      { status: 500 }
    );
  }
}
