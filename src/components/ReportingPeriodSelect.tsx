import type { ReportingPeriod } from '@/lib/reporting-period';
export function ReportingPeriodSelect({value,onChange,start,end,onStart,onEnd}:{value:ReportingPeriod;onChange:(v:ReportingPeriod)=>void;start:string;end:string;onStart:(v:string)=>void;onEnd:(v:string)=>void}) {
 return <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
  <select aria-label="Reporting period" value={value} onChange={e=>onChange(e.target.value as ReportingPeriod)} style={{padding:'6px 10px',border:'1px solid #e8e8e6',borderRadius:8,background:'#fff'}}>
   <option value="day">Today</option><option value="week">This week (Mon–Sun)</option><option value="month">This month</option><option value="30d">Past 30 days</option><option value="60d">Past 60 days</option><option value="year">This year</option><option value="all">All time</option><option value="custom">Custom dates</option>
  </select>
  {value==='custom' && <><label>From <input aria-label="Start date" type="date" value={start} max={end||undefined} onChange={e=>onStart(e.target.value)} /></label><label>To <input aria-label="End date" type="date" value={end} min={start||undefined} onChange={e=>onEnd(e.target.value)} /></label></>}
 </div>;
}
