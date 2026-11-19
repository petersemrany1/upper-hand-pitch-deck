export function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
export function repIdFromIdentity(value: string): string | null {
  const match = value.match(/^(?:client:)?rep_([a-f0-9]{32})$/i);
  if (!match) return null;
  const h = match[1];
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function blockedMessage(reason: string): string {
  switch (reason) {
    case 'do_not_call': return 'This contact is on the do not call list. The call has not been placed.';
    case 'no_eligible_number': return 'All active caller IDs have reached their daily limits or have been retired. No call has been placed. Please try again later.';
    default: return 'Calling is temporarily unavailable. No call has been placed. Please try again later.';
  }
}
export function spokenResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${escapeXml(message)}</Say><Hangup/></Response>`;
}
export function outboundTwiml(destination: string, callerId: string, callbackUrl: string, callSid: string): string {
  const child = escapeXml(`${callbackUrl}?parentCallSid=${encodeURIComponent(callSid)}`);
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial answerOnBridge="true" callerId="${escapeXml(callerId)}" record="record-from-answer" recordingStatusCallback="${escapeXml(callbackUrl)}" recordingStatusCallbackMethod="POST" trim="trim-silence" timeout="30"><Number statusCallback="${child}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${escapeXml(destination)}</Number></Dial></Response>`;
}
export function inboundTwiml(repIds: string[], callbackUrl: string, actionUrl: string, callSid: string): string {
  const clientIds = [...new Set(repIds)].filter(id => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id));
  if (!clientIds.length) return voicemailTwiml(callbackUrl);
  const child = escapeXml(`${callbackUrl}?parentCallSid=${encodeURIComponent(callSid)}`);
  const clients = clientIds.map(id => `<Client statusCallback="${child}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">rep_${id.replace(/-/g,'')}</Client>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial action="${escapeXml(actionUrl)}" method="POST" timeout="30" answerOnBridge="true" record="record-from-answer" recordingStatusCallback="${escapeXml(callbackUrl)}" recordingStatusCallbackMethod="POST" trim="trim-silence">${clients}</Dial></Response>`;
}
export function voicemailTwiml(callbackUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">You've reached Hair Transplant Group. Our team is unavailable right now. Please leave your name and callback number after the tone and we'll return your call.</Say><Record maxLength="120" playBeep="true" trim="trim-silence" recordingStatusCallback="${escapeXml(callbackUrl)}" recordingStatusCallbackMethod="POST"/><Hangup/></Response>`;
}
