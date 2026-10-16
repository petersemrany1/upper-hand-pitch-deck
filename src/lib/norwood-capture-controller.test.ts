import { expect, test } from "bun:test";
import { NorwoodCaptureController, CaptureSamples, CAPTURE_MAX_FRAMES, CAPTURE_MAX_TICKS, type CaptureState } from "./norwood-capture-controller";
import type { NorwoodView } from "./norwood-assessment";
import type { NorwoodPhotoCheck } from "./norwood-photo-check";
const deferred = <T>() => { let resolve!: (value:T)=>void, reject!: (error:Error)=>void; const promise = new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; };
function setup(view: NorwoodView = "front") {
  let opens=0, stops=0, shots=0, checks=0;
  const states: CaptureState[]=[], submitted:string[][]=[];
  let response: () => Promise<NorwoodPhotoCheck> = async()=>({ready:true,message:"saved"});
  const camera={photo:()=>`original-${++shots}`,stop:()=>{stops++;}};
  const ports = {open:async(_signal:AbortSignal)=>{opens++;return camera;}, check:async(photos:string[],actual:NorwoodView)=>{expect(actual).toBe(view);checks++;submitted.push([...photos]);return response();},change:(s:CaptureState)=>states.push(s),wait:async(_ms:number,_signal:AbortSignal)=>{}};
  const controller=new NorwoodCaptureController(view,ports);
  return {controller,ports,camera,states,submitted,setResponse:(next:typeof response)=>{response=next;},counts:()=>({opens,stops,shots,checks})};
}
test("camera opens only on demand and waits for Start",async()=>{
 const h=setup();await h.controller.take();expect(h.counts()).toEqual({opens:0,stops:0,shots:0,checks:0});
 await h.controller.open();expect(h.controller.state.phase).toBe("camera");expect(h.counts().shots).toBe(0);
 await h.controller.open();expect(h.counts().opens).toBe(1);h.controller.dispose();
});
test("the patient can finish any angle after returning to the screen, with no shutter countdown",async()=>{
 for(const view of ["front","top","crown","left","right"] as NorwoodView[]){
  const h=setup(view), gate=deferred<void>();h.ports.wait=()=>gate.promise;
  await h.controller.open();const capture=h.controller.take();expect(h.controller.state.phase).toBe("scanning");
  expect(h.counts().shots).toBe(1);await h.controller.finish();gate.resolve();await capture;
  expect(h.submitted).toEqual([["original-1"]]);expect(h.counts().stops).toBe(1);h.controller.dispose();
 }
});
test("bounded sampling retains early and late evidence, never just the final face selfie",()=>{
 const samples=new CaptureSamples();for(let tick=0;tick<40;tick++) {samples.add(tick,`frame-${tick}`);expect(samples.photos().length).toBeLessThanOrEqual(CAPTURE_MAX_FRAMES);}
 const result=samples.photos().map(p=>Number(p.slice(6)));expect(result[0]).toBe(0);expect(result.at(-1)).toBe(39);
 expect(result.some(t=>t>=10&&t<=18)).toBe(true);expect(result.some(t=>t>=21&&t<=28)).toBe(true);
 expect(new Set(result).size).toBe(result.length);samples.clear();expect(samples.photos()).toEqual([]);
});
test("capture stops at the bound even when Done is never tapped",async()=>{
 const h=setup("crown");await h.controller.open();await h.controller.take();
 expect(h.counts().shots).toBe(CAPTURE_MAX_TICKS);expect(h.submitted[0]).toHaveLength(8);expect(h.counts().checks).toBe(1);expect(h.counts().stops).toBe(1);h.controller.dispose();
});
test("rejection shows the exact reviewed frame without pretending a photo was saved",async()=>{
 const h=setup();h.setResponse(async()=>({ready:false,message:"Push your hair back.",reviewIndex:2}));
 await h.controller.open();await h.controller.take();
 expect(h.controller.state.phase).toBe("retake");expect(h.controller.state.review).toBe(h.submitted[0][2]);
 expect(h.counts().checks).toBe(1);h.controller.pause();expect(h.controller.state.review).toBeUndefined();h.controller.dispose();
});
test("out-of-range or absent review indices never show an unrelated frame",async()=>{
 for(const index of [undefined,-1,99,1.5]) {const h=setup();h.setResponse(async()=>({ready:false,message:"Try again",reviewIndex:index}));await h.controller.usePhoto("photo");expect(h.controller.state.review).toBeUndefined();h.controller.dispose();}
});
test("technical retry retains identical originals without another movement",async()=>{
 const h=setup();h.setResponse(async()=>{throw new Error("offline");});await h.controller.open();await h.controller.take();
 expect(h.controller.state.phase).toBe("connection");h.setResponse(async()=>({ready:true,message:"saved"}));await h.controller.retryConnection();
 expect(h.submitted[1]).toEqual(h.submitted[0]);expect(h.counts().opens).toBe(1);h.controller.dispose();
});
test("pausing a movement discards unsent images and stops the camera",async()=>{
 const h=setup(),gate=deferred<void>();h.ports.wait=()=>gate.promise;await h.controller.open();const taking=h.controller.take();h.controller.pause();gate.resolve();await taking;
 await h.controller.finish();expect(h.counts().checks).toBe(0);expect(h.counts().stops).toBe(1);expect(h.controller.state.phase).toBe("guide");h.controller.dispose();
});
test("double Done taps and a late sampling tick cannot submit twice",async()=>{
 const h=setup(),frame=deferred<void>(),service=deferred<NorwoodPhotoCheck>();h.ports.wait=()=>frame.promise;h.setResponse(()=>service.promise);
 await h.controller.open();const taking=h.controller.take(), finishing=h.controller.finish();await h.controller.finish();await h.controller.open();await h.controller.usePhoto("other");
 frame.resolve();await taking;expect(h.counts().checks).toBe(1);service.resolve({ready:true,message:"saved"});await finishing;h.controller.dispose();
});
test("hiding during a request suppresses rejected-photo display and retained retry images",async()=>{
 for(const rejects of [false,true]){const h=setup(),service=deferred<NorwoodPhotoCheck>();h.setResponse(()=>service.promise);const checking=h.controller.usePhoto("private");h.controller.pause();
 if(rejects)service.reject(new Error("offline"));else service.resolve({ready:false,message:"Wrong angle",reviewIndex:0});await checking;
 expect(h.controller.state.review).toBeUndefined();await h.controller.retryConnection();expect(h.counts().checks).toBe(1);h.controller.dispose();}
});
test("late permission and unmounted requests cannot revive the camera or render photos",async()=>{
 const h=setup(),permission=deferred<typeof h.camera>();h.ports.open=()=>permission.promise;const opening=h.controller.open();h.controller.pause();permission.resolve(h.camera);await opening;expect(h.counts().stops).toBe(1);
 const service=deferred<NorwoodPhotoCheck>();h.setResponse(()=>service.promise);const checking=h.controller.usePhoto("private");h.controller.dispose();const states=h.states.length;
 service.resolve({ready:false,message:"retry",reviewIndex:0});await checking;expect(h.states).toHaveLength(states);expect(h.controller.state.review).toBeUndefined();
});
test("native camera fallback and camera errors use the same recoverable path",async()=>{
 const h=setup();h.ports.open=async()=>{throw new Error("denied");};await h.controller.open();expect(h.controller.state.phase).toBe("camera_error");
 h.setResponse(async()=>({ready:false,message:"wrong angle",reviewIndex:0}));await h.controller.usePhoto("native-photo");expect(h.controller.state.review).toBe("native-photo");
 h.ports.open=async()=>h.camera;h.camera.photo=()=>{throw new Error("track ended");};await h.controller.open();await h.controller.take();expect(h.controller.state.phase).toBe("camera_error");h.controller.dispose();
});

 test("a brief different pose survives a slow return to the screen instead of being discarded by time spacing",()=>{
 const samples=new CaptureSamples();
 for(let tick=0;tick<40;tick++) {const scalp=tick===11||tick===12; samples.add(tick,scalp?"scalp":"face",Array.from({length:144},(_,i)=>scalp?(i<72?50:-50):0));}
 expect(samples.photos()).toHaveLength(8);expect(samples.photos()).toContain("scalp");expect(samples.photos()[0]).toBe("face");expect(samples.photos().at(-1)).toBe("face");
 });
