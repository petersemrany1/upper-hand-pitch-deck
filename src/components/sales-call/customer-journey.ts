import type { LeadSkipEvent } from "./lead-skips";
export type JourneyCall = { id: string; called_at: string; direction: string; status: string | null; duration: number | null; outcome: string | null; rep_name: string | null;
  call_analysis: { summary?: string; patient_summary?: string; notes?: string; transcript?: string } | null };
export type JourneyMessage = { id: string; created_at: string; sent_at: string | null; direction: string; body: string | null; media_urls: unknown; status: string | null; twilio_message_sid?: string | null };
export type JourneyEmail = {id:string;created_at:string;email_accepted_at:string|null;email_to:string;email_subject:string;email_body:string;email_status:string;email_error:string|null};
export type CustomerJourney = { leadIds: string[]; threadIds: string[]; phoneKey: string | null; calls: JourneyCall[]; messages: JourneyMessage[]; skips: LeadSkipEvent[]; emails?: JourneyEmail[] };
export type JourneyItem = { id: string; at: string; kind: "call" | "message" | "skip" | "email"; title: string; summary: string; detail?: string; transcript?: string; status?: string; media?: string[]; rep?: string | null; duration?: string };
export function journeyPhone(value: unknown): string | null {
  const n = typeof value === "string" ? value.replace(/[^0-9]/g, "") : "";
  if (/^0[23478][0-9]{8}$/.test(n)) return "61"+n.slice(1);
  if (/^[23478][0-9]{8}$/.test(n)) return "61"+n;
  if (/^00[1-9][0-9]{9,14}$/.test(n)) return n.slice(2);
  return /^[1-9][0-9]{9,14}$/.test(n) ? n : null;
}
const clean = (s: unknown) => typeof s === "string" ? s.trim() : "";
export const shortText = (s: string, max = 260) => { const line=s.replace(/\s+/g," ").trim(); return line.length>max ? line.slice(0,max).trimEnd()+"…" : line; };
export function mediaUrls(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((u): u is string => typeof u === "string" && /^https:\/\//i.test(u)))] : [];
}
const imageUrl = (url: string) => /\.(png|jpe?g|gif|webp|avif)(?:[?#]|$)|\/mms-images\//i.test(url);
export function messageItem(m: JourneyMessage): JourneyItem {
  const incoming=m.direction==="inbound"; const media=mediaUrls(m.media_urls); const body=clean(m.body);
  const status=clean(m.status).toLowerCase();
  const noun=media.length ? (media.every(imageUrl) ? (media.length===1 ? "Photo" : `${media.length} photos`) : (media.length===1 ? "Attachment" : `${media.length} attachments`)) : "Text";
  const failed=/^(failed|undelivered|canceled|cancelled)/.test(status);
  const pending=["queued","accepted","sending","scheduled"].includes(status);
  const action=incoming ? "received" : failed ? "not delivered" : pending ? "queued" : ["sent","delivered","read"].includes(status) ? "sent" : "outgoing";
  const title=action==="outgoing" ? `Outgoing ${noun.toLowerCase()}` : `${noun} ${action}`;
  const delivery=incoming ? "" : failed ? "Not delivered" : status==="delivered"||status==="read" ? "Delivered" : status==="sent" ? "Sent" : pending ? "Pending delivery" : "Delivery not recorded";
  return {id:`message-${m.id}`,at:m.sent_at||m.created_at,kind:"message",title,summary:body ? shortText(body) : media.length ? "No accompanying text." : "Message content wasn’t recorded.",detail:body,status:delivery,media};
}
const outcomes:Record<string,string>={no_answer:"No answer",voicemail:"Voicemail",callback_scheduled:"Callback arranged",booked_deposit_paid:"Booked — deposit paid",booked_no_deposit:"Booked — awaiting deposit",had_convo_chase_up:"Follow-up needed",had_convo_no_sale:"Conversation — no sale",not_interested:"Not interested",dropped:"Dropped"};
function callItem(c: JourneyCall): JourneyItem {
  const analysis=c.call_analysis;const summary=clean(analysis?.patient_summary)||clean(analysis?.summary)||clean(analysis?.notes);
  const meaningful=summary && !/too brief to capture|don.?t have (a meaningful|enough)|not enough information|no patient (consultation|conversation)|routing\/hold message/i.test(summary);
  const outcome=outcomes[c.outcome||""] || clean(c.outcome).replace(/_/g," ");
  const status=clean(c.status).replace(/[-_]/g," ");
  const direction=c.direction==="inbound" ? "Incoming call" : "Outgoing call";
  const seconds=typeof c.duration==="number" ? c.duration : null;
  return {id:`call-${c.id}`,at:c.called_at,kind:"call",title:outcome ? `${direction} — ${outcome}` : direction,
    summary:meaningful ? shortText(summary,340) : outcome || (status ? `Call status: ${status}.` : "No call summary recorded yet."),
    detail:meaningful ? summary : undefined, transcript:clean(analysis?.transcript)||undefined,rep:c.rep_name,
    duration:seconds===null ? undefined : `${Math.floor(seconds/60)}m ${seconds%60}s`};
}
export function journeyItems(data: CustomerJourney): JourneyItem[] {
  const unique=<T extends {id:string}>(rows:T[])=>[...new Map(rows.map(r=>[r.id,r])).values()];
  // A provider SID can be logged through both the lead and inbox send paths.
  const byProvider=new Map<string,JourneyMessage>();
  for(const m of unique(data.messages)) {
    const key=m.twilio_message_sid||m.id;
    const prior=byProvider.get(key);
    byProvider.set(key,prior ? {...prior,body:prior.body||m.body,media_urls:[...new Set([...mediaUrls(prior.media_urls),...mediaUrls(m.media_urls)])]} : m);
  }
  const messages=[...byProvider.values()];
  return [...unique(data.calls).map(callItem),...messages.map(messageItem),...unique(data.emails||[]).map(e=>({id:`email-${e.id}`,at:e.email_accepted_at||e.created_at,kind:"email" as const,title:`Clinic email — ${e.email_subject}`,summary:`To: ${e.email_to}\n${shortText(e.email_body)}`,detail:`To: ${e.email_to}\n\n${e.email_body}`,status:e.email_status==="accepted"?"Accepted for sending":e.email_status==="failed"?"Not delivered":e.email_status==="pending"?"Pending delivery":"Check delivery"})),...unique(data.skips).map(e=>({id:`skip-${e.id}`,at:e.created_at,kind:"skip" as const,title:`Skipped by ${e.rep_name}`,summary:e.reason}))]
    .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id));
}
export function relevantJourneyChange(row: Record<string,unknown>, leadId:string, phone:string|null, data:CustomerJourney|null): boolean {
  const ids=data?.leadIds||[leadId];const key=data?.phoneKey||journeyPhone(phone);
  if(ids.includes(String(row.lead_id||""))) return true;
  if(data?.threadIds.includes(String(row.thread_id||""))) return true;
  const remote=row.phone || (row.direction==="inbound" ? row.from_number : row.to_number);
  return Boolean(key && journeyPhone(remote)===key);
}
