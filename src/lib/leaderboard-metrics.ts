export type SalesCallMetric = { id:string;lead_id:string|null;duration:number|null;duration_seconds:number|null;status:string|null;outcome:string|null;called_at:string };
/** Leaderboard sales-call rules. Group once per lead per rep; exclude service calls. */
export function salesCallCounts(calls: SalesCallMetric[], excluded: Set<string>, depositPaid: Map<string,number>) {
 const leads = new Map<string,{maxDur:number;reached:boolean}>();
 for(const c of calls) {
  if(c.lead_id && excluded.has(c.lead_id))continue;
  if(['ringing','initiated','queued','in-progress'].includes(c.status||''))continue;
  const paid = c.lead_id ? depositPaid.get(c.lead_id) : undefined;
  if(paid !== undefined && new Date(c.called_at).getTime()>paid)continue;
  const key=c.lead_id||c.id, duration=c.duration??c.duration_seconds??0;
  const failed=['no-answer','busy','failed','canceled'].includes(c.status||'');
  const previous=leads.get(key)||{maxDur:0,reached:false};
  leads.set(key,{maxDur:Math.max(previous.maxDur,duration),reached:previous.reached||c.outcome==='connected'||(!failed&&duration>=15)});
 }
 let connected=0,short=0,convos=0;
 for(const l of leads.values()) {if(l.reached){connected++;if(l.maxDur>=120)convos++;else short++;}}
 return {calls:leads.size,attempted:leads.size,notReached:leads.size-connected,connected,short,convos,holds:convos};
}
export function conversionPercent(bookings:number, denominator:number):number|null {
 return denominator>0 ? Math.round(bookings/denominator*100) : null;
}
export function dashboardMetrics(rows: {calls:number;short:number;convos:number;bookings:number}[]) {
 return rows.reduce((a,r)=>({calls:a.calls+r.calls,connected:a.connected+r.short+r.convos,convos:a.convos+r.convos,bookings:a.bookings+r.bookings}),{calls:0,connected:0,convos:0,bookings:0});
}
