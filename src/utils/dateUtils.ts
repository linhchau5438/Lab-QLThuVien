import { BorrowRecord } from '../types/library';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatDateVN(dateISO: string | null | undefined): string {
  if (!dateISO) return '—';
  const parts = dateISO.split('-');
  if (parts.length !== 3) return dateISO;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function diffDays(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export function isRecordCurrentlyOverdue(record: BorrowRecord, refDateISO = getTodayISO()): boolean {
  if (record.status === 'returned') return false;
  return record.dueDate < refDateISO;
}

export function getOverdueDays(dueDate: string, compareDateISO = getTodayISO()): number {
  const days = diffDays(dueDate, compareDateISO);
  return days > 0 ? days : 0;
}

export function wasReturnedLate(dueDate: string, returnDate: string | null): boolean {
  if (!returnDate) return false;
  return returnDate > dueDate;
}

export function getMonthKey(dateISO: string): string {
  return dateISO.slice(0, 7); // YYYY-MM
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `Thg ${Number(m)}/${y.slice(2)}`;
}

export function formatMonthFullVN(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

export function getRecentMonthKeys(count: number, endMonthKey?: string): string[] {
  const base = endMonthKey || getTodayISO().slice(0, 7);
  const [y, m] = base.split('-').map(Number);
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(y, m - 1 - i, 1);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    result.push(`${yy}-${mm}`);
  }
  return result;
}
