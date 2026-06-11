// The 52-week plan calendar. One PlanDay per calendar day (364 total), each
// carrying its structural metadata. Session *content* lives in sessions.ts;
// this file is purely the skeleton (which day is which week/quarter/type/kind).
import { TOTAL_WEEKS, sessionKindForDow } from "./config";
import { dowOf, isoForDayIndex } from "./dates";
import { quarterOf, weekType } from "./progression";
import type { Dow, Quarter, SessionKind, WeekType } from "./types";

export interface PlanDay {
  /** 0-based offset from the plan start (0..363). */
  dayIndex: number;
  date: string; // ISO YYYY-MM-DD
  week: number; // 1..52
  quarter: Quarter;
  weekType: WeekType;
  dow: Dow;
  sessionKind: SessionKind;
  isCalibration: boolean;
  isTestWeek: boolean;
}

const TOTAL_DAYS = TOTAL_WEEKS * 7; // 364

let cached: PlanDay[] | null = null;

export function buildCalendar(): PlanDay[] {
  if (cached) return cached;
  const days: PlanDay[] = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const week = Math.floor(i / 7) + 1;
    const date = isoForDayIndex(i);
    const dow = dowOf(date);
    const type = weekType(week);
    days.push({
      dayIndex: i,
      date,
      week,
      quarter: quarterOf(week),
      weekType: type,
      dow,
      sessionKind: sessionKindForDow(dow),
      isCalibration: week === 1,
      isTestWeek: type === "test",
    });
  }
  cached = days;
  return days;
}

export function weekDays(week: number): PlanDay[] {
  return buildCalendar().filter((d) => d.week === week);
}

export function dayForDate(iso: string): PlanDay | null {
  return buildCalendar().find((d) => d.date === iso) ?? null;
}

export function dayForIndex(i: number): PlanDay | null {
  const cal = buildCalendar();
  return i >= 0 && i < cal.length ? cal[i]! : null;
}
