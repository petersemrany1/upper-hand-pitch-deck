import {expect,test} from 'bun:test';
import {LiveHeartbeatHealth,terminalLiveError} from './norwood-live-health';
test('brief outages recover without closing, continuous outages are bounded',()=>{
 const h=new LiveHeartbeatHealth();expect(h.shouldStop(1000)).toBe(false);expect(h.shouldStop(29000)).toBe(false);expect(h.shouldStop(31000)).toBe(true);
 h.healthy();expect(h.shouldStop(32000)).toBe(false);expect(h.shouldStop(61999)).toBe(false);h.healthy();expect(h.shouldStop(90000)).toBe(false);
});
test('revocation and access failures never enter network recovery',()=>{
 for(const text of ['This camera session was replaced.','Camera sharing stopped.','Camera access required','This link has expired','Please ask your advisor','Unauthenticated'])expect(terminalLiveError(new Error(text))).toBe(true);
 for(const text of ['Failed to fetch','Connection interrupted.','Waiting for the patient’s connection.','Live camera setup is unavailable.'])expect(terminalLiveError(new Error(text))).toBe(false);
});
