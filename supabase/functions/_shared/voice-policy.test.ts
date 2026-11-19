import { describe, expect, test } from 'bun:test';
import { blockedMessage, inboundTwiml, outboundTwiml, repIdFromIdentity, spokenResponse, voicemailTwiml } from './voice-policy';
describe('voice safety responses',()=> {
  test('uses the signed identity rather than custom parameters',()=> {
    expect(repIdFromIdentity('client:rep_00000000000040008000000000000001')).toBe('00000000-0000-4000-8000-000000000001');
    expect(repIdFromIdentity('peter_browser')).toBeNull();
  });
  test('blocked calls never dial a destination',()=> {
    for(const reason of ['do_not_call','no_eligible_number','no_active_number']) {
      expect(spokenResponse(blockedMessage(reason))).not.toContain('<Dial');
      expect(spokenResponse(blockedMessage(reason))).toContain('<Hangup/>');
    }
  });
  test('outbound callback identifies destination leg and rings for thirty seconds',()=> {
    const xml=outboundTwiml('+61412000000','+61485000001','https://example.test/status','CA123');
    expect(xml).toContain('parentCallSid=CA123'); expect(xml).toContain('timeout="30"');
    expect(xml).toContain('answerOnBridge="true"'); expect(xml).not.toContain('938205');
  });
  test('callback uses actual rep grant identities, sanitises ids, dedupes and falls back to branded voicemail',()=> {
    const rep='00000000-0000-4000-8000-000000000001';
    const xml=inboundTwiml([rep,rep,'<bad>'],'https://example.test/status','https://example.test/action','CA123');
    expect(xml.match(/<Client /g)?.length).toBe(1);
    expect(xml).toContain('rep_00000000000040008000000000000001'); expect(xml).not.toContain('peter_browser');
    const voicemail=inboundTwiml([],'https://example.test/status','https://example.test/action','CA123');
    expect(voicemail).toContain('Hair Transplant Group'); expect(voicemail).toContain('<Record');
    expect(voicemail).toContain('action="https://example.test/action?voicemail=done"');
  });
  test('voicemail explicitly finishes instead of re-requesting the initial routing document',()=> {
    const xml=voicemailTwiml('https://example.test/status','https://example.test/inbound?source=call');
    expect(xml).toContain('action="https://example.test/inbound?source=call&amp;voicemail=done" method="POST"');
    expect(xml).toContain('recordingStatusCallback="https://example.test/status"');
  });
});
