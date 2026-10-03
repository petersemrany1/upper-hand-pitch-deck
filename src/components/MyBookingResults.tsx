import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { ReportingPeriodSelect } from './ReportingPeriodSelect';
import { periodDates, periodInstants, type ReportingPeriod } from '@/lib/reporting-period';
import { sydneyTodayISO } from '@/lib/timezone';
type Booking = {id:string;patient_name:string;booked_at:string;appointment_date:string;appointment_time:string;clinic:{clinic_name:string}|null};
export function MyBookingResults() {
 const [period,setPeriod]=useState<ReportingPeriod>('month');
 const [start,setStart]=useState(sydneyTodayISO()); const [end,setEnd]=useState(sydneyTodayISO());
 const [rows,setRows]=useState<Booking[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{const refresh=()=>setRefresh(n=>n+1);const t=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{clearInterval(t);window.removeEventListener('focus',refresh)}},[]);
 useEffect(()=>{let cancelled=false; const range=periodInstants(period,start,end);setLoading(true);setError('');
 if(!range){setError('Choose a valid start and end date.');setLoading(false);return;}
 (async()=>{try {
  const result:Booking[]=[];
  for(let offset=0;;offset+=500){let q=supabase.from('clinic_appointments').select('id,patient_name,booked_at,appointment_date,appointment_time,clinic:partner_clinics!clinic_appointments_clinic_id_fkey(clinic_name)').not('patient_name','ilike','%test%').not('patient_name','ilike','%demo%').order('booked_at',{ascending:false}).order('id').range(offset,offset+499);
   if(range.from) q=q.gte('booked_at',range.from); q=q.lt('booked_at',range.to && range.to<new Date().toISOString()?range.to:new Date().toISOString());
   const {data,error}=await q; if(error)throw error;result.push(...(data??[]) as Booking[]);if((data??[]).length<500)break;
  }
  if(!cancelled)setRows(result);
 }catch{if(!cancelled)setError('Bookings could not be loaded. Please refresh.');}finally{if(!cancelled)setLoading(false);}})();return()=>{cancelled=true};
 },[period,start,end,refresh]);
 const dates=periodDates(period,start,end);
 return <section style={{background:'#fff',border:'1px solid #e8e8e6',borderRadius:14,padding:20}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><h2 style={{fontWeight:600}}>Your bookings</h2><ReportingPeriodSelect value={period} onChange={setPeriod} start={start} end={end} onStart={setStart} onEnd={setEnd}/></div>
 <p style={{fontSize:12,color:'#666',marginTop:8}}>By date booked · Sydney time{dates?.start ? ` · ${dates.start} to ${dates.end} (inclusive)` : ''}. Rescheduling does not count as a new booking.</p>
 {error?<p role="alert">{error}</p>:loading?<p>Loading bookings…</p>:<>
 <p style={{fontSize:26,fontWeight:600,margin:'16px 0'}}>{rows.length} bookings <span style={{fontSize:14,fontWeight:400}}>· ${(rows.length*50).toLocaleString()} booking bonus</span></p>
 <div style={{maxHeight:340,overflow:'auto'}}><table style={{width:'100%',fontSize:13,textAlign:'left'}}><thead><tr><th>Client</th><th>Clinic</th><th>Appointment</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:'8px 0'}}>{r.patient_name}</td><td>{r.clinic?.clinic_name||'—'}</td><td>{r.appointment_date} · {r.appointment_time?.slice(0,5)}</td></tr>)}</tbody></table>{!rows.length&&<p>No bookings in this period.</p>}</div>
 </>}
 <Link to="/booked-appointments" style={{display:'inline-block',marginTop:16,textDecoration:'underline'}}>View and reschedule your appointments →</Link>
 </section>;
}
