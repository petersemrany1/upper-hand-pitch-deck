import { expect, test } from 'bun:test';
import { canAutoJoin } from './norwood-live-autoconnect';
const shared={roomId:'room',offer:'v=0',answer:null,ended:false,patientPresent:true,repPresent:false,expiresAt:'2099-01-01'};
test('auto-connect requires a consenting patient’s active offer; never joins an occupied, expired or previously attempted room',()=>{
  expect(canAutoJoin(shared,new Set())).toBe(true);
  for(const state of [null,{...shared,offer:null},{...shared,answer:'v=0'},{...shared,ended:true},{...shared,patientPresent:false},{...shared,repPresent:true},{...shared,expiresAt:'2020-01-01'}])expect(canAutoJoin(state,new Set())).toBe(false);
  expect(canAutoJoin(shared,new Set(['room']))).toBe(false);
  expect(canAutoJoin({...shared,roomId:'new-room'},new Set(['room']))).toBe(true);
});
