import { APP_TIMEZONE, sydneyTodayISO } from './timezone';
export type ReportingPeriod = 'day' | 'week' | '30d' | '60d' | 'month' | 'year' | 'all' | 'custom';
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function periodDates(period: ReportingPeriod, start = '', end = '', now = new Date()) {
  const today = sydneyTodayISO(now);
  if (period === 'all') return { start: null, end: null };
  if (period === 'custom') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end || !Number.isFinite(Date.parse(`${start}T00:00:00Z`)) || !Number.isFinite(Date.parse(`${end}T00:00:00Z`)) || addDays(start,0)!==start || addDays(end,0)!==end) return null;
    return { start, end };
  }
  if (period === 'week') {
    const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
    return { start: monday, end: addDays(monday, 6) };
  }
  if (period === 'month') return { start: today.slice(0,7)+'-01', end: addDays(new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),1)).toISOString().slice(0,10),-1) };
  if (period === 'year') return { start: today.slice(0,4)+'-01-01', end: today.slice(0,4)+'-12-31' };
  return { start: addDays(today, period === '30d' ? -29 : period === '60d' ? -59 : 0), end: today };
}
export function sydneyMidnight(date: string): string {
  const base = new Date(`${date}T00:00:00Z`).getTime(); let instant = base;
  for (let i=0;i<3;i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:APP_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
    instant = base - (Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-instant);
  }
  return new Date(instant).toISOString();
}
export function periodInstants(period: ReportingPeriod, start = '', end = '', now = new Date()) {
  const dates = periodDates(period,start,end,now);
  return dates && { from: dates.start ? sydneyMidnight(dates.start) : null, to: dates.end ? sydneyMidnight(addDays(dates.end,1)) : null };
}
