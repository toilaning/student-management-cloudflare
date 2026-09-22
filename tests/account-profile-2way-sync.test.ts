import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/repositories';
import { PUT as updateUserRoute, POST as createUserRoute } from '../src/app/api/users/route';
import { PUT as updateTeacherRoute } from '../src/app/api/teachers/route';
import { PATCH as updateStudentRoute } from '../src/app/api/students/[id]/route';

describe('Account & Profile 2-Way Synchronization Suite', () => {
  it('1. Đổi tên/email trong Quản lý tài khoản -> Tự động đồng bộ sang Quản lý học sinh', async () => {
    const studentId = 'ST_SYNC_TEST_01';
    
    // Tạo user học sinh mẫu
    await repo.createUser({
      id: studentId,
      username: 'st_sync_01',
      passwordHash: 'hash',
      role: 'STUDENT',
      name: 'Tên Ban Đầu Học Sinh',
      email: 'initial_st@school.edu.vn',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    await repo.createStudent({
      id: studentId,
      name: 'Tên Ban Đầu Học Sinh',
      phone: '0901112233',
      email: 'initial_st@school.edu.vn',
      dateOfBirth: '2008-05-10',
      gender: 'Nam',
      address: 'Hà Nội',
      status: 'Đang học',
      enrolledClassIds: [],
      createdAt: new Date().toISOString()
    });

    // Cập nhật tên tài khoản qua PUT /api/users
    const req = new Request('http://localhost/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: studentId,
        newName: 'Nguyễn Văn Học Sinh Mới',
        newEmail: 'new_student@school.edu.vn'
      })
    });

    const res = await updateUserRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    // Kiểm tra hồ sơ Student tương ứng tự động cập nhật
    const student = await repo.getStudentById(studentId);
    assert.equal(student?.name, 'Nguyễn Văn Học Sinh Mới');
    assert.equal(student?.email, 'new_student@school.edu.vn');
  });

  it('2. Đổi tên/email trong Quản lý tài khoản -> Tự động đồng bộ sang Quản lý giáo viên', async () => {
    const teacherId = 'GV_SYNC_TEST_01';

    await repo.createUser({
      id: teacherId,
      username: 'gv_sync_01',
      passwordHash: 'hash',
      role: 'TEACHER',
      name: 'Thầy Cũ',
      email: 'old_teacher@school.edu.vn',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    await repo.createTeacher({
      id: teacherId,
      name: 'Thầy Cũ',
      phone: '0909998877',
      email: 'old_teacher@school.edu.vn',
      specialty: 'Toán',
      hourlyRate: 300000,
      ratePerSession: 250000,
      status: 'Đang dạy',
      assignedClassIds: [],
      createdAt: new Date().toISOString()
    });

    const req = new Request('http://localhost/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: teacherId,
        newName: 'TS. Nguyễn Văn Mới',
        newEmail: 'new_teacher@school.edu.vn'
      })
    });

    const res = await updateUserRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    const teacher = await repo.getTeacherById(teacherId);
    assert.equal(teacher?.name, 'TS. Nguyễn Văn Mới');
    assert.equal(teacher?.email, 'new_teacher@school.edu.vn');
  });

  it('3. Đổi tên ở Quản lý giáo viên -> Tự động cập nhật ngược lại tài khoản User', async () => {
    const teacherId = 'GV_SYNC_BACK_01';

    await repo.createUser({
      id: teacherId,
      username: 'gv_sync_back_01',
      passwordHash: 'hash',
      role: 'TEACHER',
      name: 'Thầy Gốc',
      email: 'goc@school.edu.vn',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    await repo.createTeacher({
      id: teacherId,
      name: 'Thầy Gốc',
      phone: '0901231234',
      email: 'goc@school.edu.vn',
      specialty: 'Văn',
      hourlyRate: 300000,
      ratePerSession: 250000,
      status: 'Đang dạy',
      assignedClassIds: [],
      createdAt: new Date().toISOString()
    });

    const req = new Request('http://localhost/api/teachers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: teacherId,
        name: 'ThS. Trần Văn Đổi',
        specialty: 'Văn Học',
        email: 'doi@school.edu.vn'
      })
    });

    const res = await updateTeacherRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200);

    const user = await repo.getUserById(teacherId);
    assert.equal(user?.name, 'ThS. Trần Văn Đổi');
    assert.equal(user?.email, 'doi@school.edu.vn');
  });

  it('4. Đổi tên ở Quản lý học sinh -> Tự động cập nhật ngược lại tài khoản User', async () => {
    const studentId = 'ST_SYNC_BACK_01';

    await repo.createUser({
      id: studentId,
      username: 'st_sync_back_01',
      passwordHash: 'hash',
      role: 'STUDENT',
      name: 'Em Gốc',
      email: 'em_goc@school.edu.vn',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    await repo.createStudent({
      id: studentId,
      name: 'Em Gốc',
      phone: '0912345678',
      email: 'em_goc@school.edu.vn',
      dateOfBirth: '2008-01-01',
      gender: 'Nữ',
      address: 'Hà Nội',
      status: 'Đang học',
      enrolledClassIds: [],
      createdAt: new Date().toISOString()
    });

    const req = new Request(`http://localhost/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Em Đã Đổi Tên',
        email: 'em_doi@school.edu.vn'
      })
    });

    const res = await updateStudentRoute(req, { params: { id: studentId } });
    const data = await res.json();
    assert.equal(res.status, 200);

    const user = await repo.getUserById(studentId);
    assert.equal(user?.name, 'Em Đã Đổi Tên');
    assert.equal(user?.email, 'em_doi@school.edu.vn');
  });
});
