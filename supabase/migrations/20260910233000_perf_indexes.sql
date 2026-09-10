-- Speed up the portal's hottest reads.
create index if not exists idx_call_records_lead_called_at on public.call_records (lead_id, called_at);
create index if not exists idx_call_records_direction_called_at on public.call_records (direction, called_at desc);
create index if not exists idx_call_records_called_at on public.call_records (called_at desc);
create index if not exists idx_call_records_phone on public.call_records (phone);
create index if not exists idx_meta_leads_rep_phone on public.meta_leads (rep_id) where phone is not null;
create index if not exists idx_meta_leads_created_at on public.meta_leads (created_at desc);
create index if not exists idx_sms_threads_unread on public.sms_threads (unread_count, last_message_at desc);
analyze public.call_records;
analyze public.meta_leads;
