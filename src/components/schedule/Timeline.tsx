'use client';

import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { timeToMinutes } from '@/utils/date';

/** Khung giờ cố định của trục timeline: 06:00 -> 23:00, bước 30 phút => 35 cột tick.
 * Bao trùm mọi ca học (Ca 1: 08:00 -> Ca 5: 20:30) không bị clipping. */
export const TIMELINE_START_MINUTES = 6 * 60; // 360
export const TIMELINE_END_MINUTES = 23 * 60; // 1380
export const TIMELINE_STEP_MINUTES = 30;
export const TIMELINE_TOTAL_MINUTES = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES; // 1020

/** Số cột tick = (23h - 6h) / 30p + 1 = 35. */
export const TIMELINE_TICK_COUNT = TIMELINE_TOTAL_MINUTES / TIMELINE_STEP_MINUTES + 1;

/** Danh sách nhãn giờ trên trục (06:00, 06:30, ..., 23:00). Có thể dùng cho cả trục dọc lẫn trục ngang. */
export function buildTimelineTicks(): { minutes: number; label: string }[] {
  const ticks: { minutes: number; label: string }[] = [];
  for (let m = TIMELINE_START_MINUTES; m <= TIMELINE_END_MINUTES; m += TIMELINE_STEP_MINUTES) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    ticks.push({ minutes: m, label: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` });
  }
  return ticks;
}

/**
 * Clamp thời điểm bắt đầu/kết thúc của slot vào khung cố định 06:00 -> 23:00.
 * - Bắt đầu sớm hơn 06:00 => coi như 06:00.
 * - Kết thúc sau 23:00 (hoặc qua nửa đêm) => kéo tới 23:00 và đánh dấu "qua đêm".
 */
export function clampSlotToTimeline(slot: ScheduleSlot): {
  startMin: number;
  endMin: number;
  isOvernight: boolean;
} {
  const rawStart = timeToMinutes(slot.startTime || '00:00');
  let rawEnd = timeToMinutes(slot.endTime || '23:59');

  const isOvernight = rawEnd < rawStart || rawEnd > TIMELINE_END_MINUTES;

  const startMin = Math.max(TIMELINE_START_MINUTES, Math.min(rawStart, TIMELINE_END_MINUTES));
  const endMin = Math.max(TIMELINE_START_MINUTES, Math.min(rawEnd, TIMELINE_END_MINUTES));

  return { startMin, endMin, isOvernight };
}

/**
 * Bộ hiển thị giờ cột (dùng cho trục ngang 06:00->23:00).
 * Trả về % vị trí so với chiều rộng tổng của timeline.
 */
export function minuteToPercent(minutes: number): number {
  return (Math.min(Math.max(minutes, TIMELINE_START_MINUTES), TIMELINE_END_MINUTES) - TIMELINE_START_MINUTES) / TIMELINE_TOTAL_MINUTES * 100;
}

/** Slot render props truyền xuống cho block con (để từng trang tùy chỉnh nội dung). */
export interface TimelineSlotRenderProps {
  slot: ScheduleSlot;
  startMin: number;
  endMin: number;
  isOvernight: boolean;
}

/**
 * Trục giờ ngang (06:00 -> 23:00). Dùng trong admin + teacher (timeline 1 ngày).
 */
export function HorizontalTimelineAxis({ className = '' }: { className?: string }) {
  const ticks = buildTimelineTicks();
  return (
    <div className={`relative ${className}`}>
      {ticks.map(t => (
        <div
          key={t.minutes}
          className="absolute top-0 bottom-0 -translate-x-1/2"
          style={{ left: `${minuteToPercent(t.minutes)}%` }}
        >
          <div className="h-1.5 w-px bg-slate-200" />
          <span className="text-[9px] font-mono font-semibold text-slate-400 whitespace-nowrap -ml-2">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Đường lưới giờ (vạch dọc) cho block chứa các slot. */
export function TimelineGridLines() {
  const ticks = buildTimelineTicks();
  return (
    <div className="absolute inset-0 pointer-events-none">
      {ticks.map(t => (
        <div
          key={t.minutes}
          className="absolute top-0 bottom-0 w-px bg-slate-100"
          style={{ left: `${minuteToPercent(t.minutes)}%` }}
        />
      ))}
    </div>
  );
}