import {describe,it,expect} from 'bun:test';
import {periodDates,periodInstants,sydneyMidnight} from './reporting-period';
describe('Sydney reporting ranges',()=>{
 it('uses Monday to Sunday, including Sunday across the DST change',()=>{
  for(const now of ['2026-10-03T02:00:00Z','2026-10-04T12:00:00Z'])expect(periodDates('week','','',new Date(now))).toEqual({start:'2026-09-28',end:'2026-10-04'});
  expect(periodDates('week','','',new Date('2026-10-04T13:00:00Z'))).toEqual({start:'2026-10-05',end:'2026-10-11'});
 });
 it('includes full custom end date without crossing the next day at DST',()=>{
  const spring=periodInstants('custom','2026-10-04','2026-10-04')!;
  expect(spring).toEqual({from:'2026-10-03T14:00:00.000Z',to:'2026-10-04T13:00:00.000Z'});
  expect((Date.parse(spring.to!)-Date.parse(spring.from!))/3600000).toBe(23);
  const autumn=periodInstants('custom','2026-04-05','2026-04-05')!;
  expect((Date.parse(autumn.to!)-Date.parse(autumn.from!))/3600000).toBe(25);
 });
 it('rejects empty, reversed and invalid calendar dates',()=>{
  expect(periodDates('custom','','')).toBeNull();expect(periodDates('custom','2026-10-03','2026-10-01')).toBeNull();expect(periodDates('custom','2026-02-30','2026-03-01')).toBeNull();
 });
 it('handles month/year boundaries and leap years',()=>{
  expect(periodDates('month','','',new Date('2024-02-15'))).toEqual({start:'2024-02-01',end:'2024-02-29'});
  expect(periodDates('week','','',new Date('2027-01-01'))).toEqual({start:'2026-12-28',end:'2027-01-03'});
  expect(sydneyMidnight('2026-10-05')).toBe('2026-10-04T13:00:00.000Z');
 });
});
