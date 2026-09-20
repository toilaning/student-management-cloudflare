import test from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/repositories';
import { localRepo } from '../src/repositories/LocalRepository';
import { HomeworkTask, HomeworkSubmission, HomeworkSubmissionStatus } from '../src/types/homework';
import { GET as getTasks, POST as postTasks } from '../src/app/api/homework/tasks/route';
import { GET as getSubmissions, POST as postSubmissions } from '../src/app/api/homework/submissions/route';

test('Homework System Test Suite (Giai đoạn 2)', async (t) => {
  // Reset repository state before running tests
  await repo.resetData();

  await t.test('1. Kiểm tra mô hình dữ liệu (HomeworkTask & HomeworkSubmission)', async () => {
    const task: HomeworkTask = {
      id: 'HW_TEST_01',
      classId: 'CLS01',
      title: 'Vẽ tĩnh vật lọ hoa và quả',
      description: 'Chất liệu chì than 4B, chú ý bóng đổ và sắc độ trung gian',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'TEA001',
      createdAt: new Date().toISOString(),
    };

    assert.equal(task.id, 'HW_TEST_01');
    assert.equal(task.classId, 'CLS01');
    assert.ok(task.title.includes('tĩnh vật'));

    const sub: HomeworkSubmission = {
      id: 'SUB_TEST_01',
      taskId: 'HW_TEST_01',
      studentId: 'ST001',
      submittedAt: new Date().toISOString(),
      status: 'DA_NOP',
      discordMessageUrl: 'https://discord.com/channels/123/456/789',
      note: 'Bài tĩnh vật hoàn thành trên khổ A3',
    };

    assert.equal(sub.id, 'SUB_TEST_01');
    assert.equal(sub.status, 'DA_NOP');
    assert.ok(sub.discordMessageUrl?.includes('discord.com'));
  });

  await t.test('2. Kiểm tra Repository CRUD và Mock Seeds cho Homework', async () => {
    const allTasks = await repo.getAllHomeworkTasks();
    assert.ok(allTasks.length >= 3, 'Phải có ít nhất 3 bài tập mẫu trong seed');

    // Kiểm tra task theo classId
    const cls01Tasks = await repo.getHomeworkTasksByClassId('CLS01');
    assert.ok(cls01Tasks.length >= 2, 'Lớp CLS01 phải có ít nhất 2 bài tập');

    // Tạo task mới
    const created = await repo.createHomeworkTask({
      id: 'HW9999',
      classId: 'CLS03',
      title: 'Phối màu acrylic phong cảnh biển',
      description: 'Khổ toan 30x40cm',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'TEA002',
      createdAt: new Date().toISOString(),
    });

    assert.equal(created.id, 'HW9999');
    const fetched = await repo.getHomeworkTasksByClassId('CLS03');
    assert.equal(fetched.length, 1);
    assert.equal(fetched[0].title, 'Phối màu acrylic phong cảnh biển');

    // Kiểm tra submissions
    const hw1Subs = await repo.getHomeworkSubmissionsByTaskId('HW0001');
    assert.ok(hw1Subs.length >= 2, 'Task HW0001 phải có submissions từ seed');

    // Upsert submission
    const upserted = await repo.upsertHomeworkSubmission({
      id: '',
      taskId: 'HW9999',
      studentId: 'ST010',
      submittedAt: new Date().toISOString(),
      status: 'DA_NOP',
      discordMessageUrl: 'https://discord.com/channels/art/123',
      note: 'Nộp bài acrylic',
    });

    assert.ok(upserted.id.startsWith('SUB'));
    assert.equal(upserted.status, 'DA_NOP');

    // Cập nhật lại submission đó (chuyển note hoặc status)
    const updatedSub = await repo.upsertHomeworkSubmission({
      ...upserted,
      note: 'Đã bổ sung thêm chi tiết bóng phản quang',
    });
    assert.equal(updatedSub.id, upserted.id);
    assert.equal(updatedSub.note, 'Đã bổ sung thêm chi tiết bóng phản quang');
  });

  await t.test('3. Kiểm tra API GET & POST /api/homework/tasks', async () => {
    // GET all
    const reqGetAll = new Request('http://localhost:3000/api/homework/tasks');
    const resGetAll = await getTasks(reqGetAll);
    assert.equal(resGetAll.status, 200);
    const dataGetAll = await resGetAll.json();
    assert.equal(dataGetAll.success, true);
    assert.ok(Array.isArray(dataGetAll.data));
    assert.ok(dataGetAll.data.length > 0);

    // GET by classId
    const reqGetClass = new Request('http://localhost:3000/api/homework/tasks?classId=CLS01');
    const resGetClass = await getTasks(reqGetClass);
    assert.equal(resGetClass.status, 200);
    const dataGetClass = await resGetClass.json();
    assert.equal(dataGetClass.success, true);
    assert.ok(dataGetClass.data.every((t: HomeworkTask) => t.classId === 'CLS01'));

    // POST tạo task mới
    const reqPost = new Request('http://localhost:3000/api/homework/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: 'CLS02',
        title: 'Vẽ ký họa chuyển động',
        description: 'Vẽ dáng chạy, nhảy của nhân vật hoạt hình',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'TEA003',
      }),
    });

    const resPost = await postTasks(reqPost);
    assert.equal(resPost.status, 201);
    const dataPost = await resPost.json();
    assert.equal(dataPost.success, true);
    assert.equal(dataPost.data.title, 'Vẽ ký họa chuyển động');
    assert.ok(dataPost.data.id);

    // POST validation error (thiếu thông tin bắt buộc)
    const reqInvalid = new Request('http://localhost:3000/api/homework/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: 'CLS02',
        // missing title and deadline
      }),
    });
    const resInvalid = await postTasks(reqInvalid);
    assert.equal(resInvalid.status, 400);
    const dataInvalid = await resInvalid.json();
    assert.equal(dataInvalid.success, false);
  });

  await t.test('4. Kiểm tra API GET & POST /api/homework/submissions', async () => {
    // GET by taskId
    const reqGetTask = new Request('http://localhost:3000/api/homework/submissions?taskId=HW0001');
    const resGetTask = await getSubmissions(reqGetTask);
    assert.equal(resGetTask.status, 200);
    const dataGetTask = await resGetTask.json();
    assert.equal(dataGetTask.success, true);
    assert.ok(Array.isArray(dataGetTask.data));
    assert.ok(dataGetTask.data.length >= 2);

    // GET by studentId
    const reqGetStudent = new Request('http://localhost:3000/api/homework/submissions?studentId=ST001');
    const resGetStudent = await getSubmissions(reqGetStudent);
    assert.equal(resGetStudent.status, 200);
    const dataGetStudent = await resGetStudent.json();
    assert.equal(dataGetStudent.success, true);
    assert.ok(dataGetStudent.data.some((s: HomeworkSubmission) => s.studentId === 'ST001'));

    // POST upsert submission (tích hợp bot Discord nộp bài)
    const reqPostSub = new Request('http://localhost:3000/api/homework/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'HW0003',
        studentId: 'ST005',
        status: 'DA_NOP',
        discordMessageUrl: 'https://discord.com/channels/art/general/999888',
        note: 'Học sinh nộp bài qua bot Discord kênh #nop-bai-tap',
      }),
    });

    const resPostSub = await postSubmissions(reqPostSub);
    assert.equal(resPostSub.status, 200);
    const dataPostSub = await resPostSub.json();
    assert.equal(dataPostSub.success, true);
    assert.equal(dataPostSub.data.studentId, 'ST005');
    assert.equal(dataPostSub.data.status, 'DA_NOP');
    assert.equal(dataPostSub.data.discordMessageUrl, 'https://discord.com/channels/art/general/999888');

    // POST validation error (thiếu taskId hoặc studentId)
    const reqInvalid = new Request('http://localhost:3000/api/homework/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'HW0003',
        // missing studentId
      }),
    });
    const resInvalid = await postSubmissions(reqInvalid);
    assert.equal(resInvalid.status, 400);
  });

  await t.test('5. Kiểm tra logic tính toán deadline và quá hạn', async () => {
    const now = new Date();
    const futureDeadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const pastDeadline = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

    const isOverdue = (deadline: string) => new Date(deadline).getTime() < Date.now();

    assert.equal(isOverdue(futureDeadline), false, 'Hạn tương lai không thể là quá hạn');
    assert.equal(isOverdue(pastDeadline), true, 'Hạn quá khứ phải tính là quá hạn');

    // Kiểm tra task HW0002 trong seed có deadline đã qua
    const allTasks = await repo.getAllHomeworkTasks();
    const overdueTask = allTasks.find(t => t.id === 'HW0002');
    assert.ok(overdueTask);
    assert.equal(isOverdue(overdueTask.deadline), true);
  });
});
