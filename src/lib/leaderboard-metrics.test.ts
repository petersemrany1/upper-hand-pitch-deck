import {describe,it,expect} from 'bun:test';
import {salesCallCounts,dashboardMetrics,conversionPercent,type SalesCallMetric} from './leaderboard-metrics';
const call=(id:string,lead_id:string,duration:number,status='completed',extra:Partial<SalesCallMetric>={}):SalesCallMetric=>({id,lead_id,duration,duration_seconds:null,status,outcome:null,called_at:'2026-10-01T01:00:00Z',...extra});
describe('shared leaderboard/dashboard metrics',()=>{
 it('includes unsuccessful leads, deduplicates attempts and uses 15/120 second boundaries',()=>{
  const result=salesCallCounts([call('1','a',5),call('2','a',120),call('3','b',14),call('4','c',15),call('5','d',119),call('6','e',0,'busy')],new Set(),new Map());
  expect(result).toEqual({calls:5,attempted:5,notReached:2,connected:3,short:2,convos:1,holds:1});
  const dashboard=dashboardMetrics([{...result,bookings:1}]);
  expect(dashboard).toEqual({calls:5,connected:3,convos:1,bookings:1});
  expect(conversionPercent(dashboard.bookings,dashboard.calls)).toBe(20);
  expect(conversionPercent(dashboard.bookings,dashboard.connected)).toBe(33);
 });
 it('excludes pending, test and post-deposit calls, and honours manual connections',()=>{
  const result=salesCallCounts([call('1','test',200),call('2','pending',200,'in-progress'),call('3','paid',200),call('4','manual',0,'completed',{outcome:'connected'}),call('5','legacy',0,'completed',{duration:null,duration_seconds:120})],new Set(['test']),new Map([['paid',Date.parse('2026-10-01T00:00:00Z')]]));
  expect(result.calls).toBe(2);expect(result.connected).toBe(2);expect(result.convos).toBe(1);
 });
 it('uses leaderboard rounding and never forces conversion to 100%',()=>{
  expect(conversionPercent(17,36)).toBe(47);expect(conversionPercent(17,90)).toBe(19);expect(conversionPercent(0,0)).toBeNull();expect(conversionPercent(2,1)).toBe(200);
 });
});
