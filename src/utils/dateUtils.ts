export function formatDate(date: Date): string {
  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type DayOfWeek = 'SUN' | 'MON';

export function getWeekStart(date: Date, startingDayOfWeek: DayOfWeek = 'SUN'): Date {
  const d = new Date(date);
  const day = d.getDay();
  const startDay = startingDayOfWeek === 'SUN' ? 0 : 1;
  let diff = day - startDay;
  if (diff < 0) diff += 7;
  return new Date(d.setDate(d.getDate() - diff));
}

export function getWeekEnd(date: Date, startingDayOfWeek: DayOfWeek = 'SUN'): Date {
  const weekStart = getWeekStart(date, startingDayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

export function isToday(date: string): boolean {
  return date === formatDate(new Date());
}
