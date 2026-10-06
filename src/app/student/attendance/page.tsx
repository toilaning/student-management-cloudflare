'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { StatCard } from '@/components/ui/Card';
import { AttendanceBadge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/ui/DataTable';
import { CheckCircle2, Clock, FileCheck, UserX, Calendar } from 'lucide-react';

export default function StudentAttendancePage() {
  const { currentUser, isReady } = useApp();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Ngày',
      render: (r) => (
        <span className="font-semibold text-foreground flex items-center gap-1.5 tabular">
          <Calendar size={14} className="text-muted-foreground shrink-0" />
          {r.date}
        </span>
      ),
    },
    {
      key: 'classId',
      header: 'Lớp',
      render: (r) => <span className="font-semibold text-primary">{r.classId}</span>,
    },
    {
      key: 'scheduleSlotId',
      header: 'Ca',
      render: (r) => <span className="text-muted-foreground">{r.scheduleSlotId}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => <AttendanceBadge status={r.status as AttendanceStatus} />,
    },
    {
      key: 'checkinTime',
      header: 'Giờ vào',
      render: (r) => (
        <span className="tabular text-muted-foreground font-mono">{r.checkinTime || '—'}</span>
      ),
    },
    {
      key: 'note',
      header: 'Ghi chú',
      render: (r) => (
        <span className="text-muted-foreground italic">{r.note || 'Không có ghi chú'}</span>
      ),
    },
  ];

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const res = await fetch(`/api/attendance?studentId=${currentUser?.id || ""}`);
        const data = await res.json();
        setRecords(data.records || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const present = records.filter(r => r.status === 'Có mặt').length;
  const late = records.filter(r => r.status === 'Đi muộn').length;
  const excused = records.filter(r => r.status === 'Vắng có phép').length;
  const unexcused = records.filter(r => r.status === 'Vắng không phép').length;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="Lịch Sử Chuyên Cần & Điểm Danh" 
          subtitle={`Theo dõi tình trạng đi học của ${currentUser?.name || ""} (${currentUser?.id || ""})`} 
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Có mặt"
              value={present}
              hint="buổi học"
              tone="success"
              icon={<CheckCircle2 size={20} />}
            />
            <StatCard
              label="Đi muộn"
              value={late}
              hint="buổi học"
              tone="warning"
              icon={<Clock size={20} />}
            />
            <StatCard
              label="Vắng có phép"
              value={excused}
              hint="đã gửi đơn"
              tone="info"
              icon={<FileCheck size={20} />}
            />
            <StatCard
              label="Vắng không phép"
              value={unexcused}
              hint="cần giải trình"
              tone="danger"
              icon={<UserX size={20} />}
            />
          </div>

          <DataTable<AttendanceRecord>
            columns={columns}
            rows={records}
            rowKey={(r) => r.id}
            loading={loading}
            emptyTitle="Chưa có dữ liệu điểm danh"
            emptyDescription="Lịch sử điểm danh các buổi học sẽ hiển thị tại đây."
          />
        </main>
      </div>
    </RoleGuard>
  );
}
