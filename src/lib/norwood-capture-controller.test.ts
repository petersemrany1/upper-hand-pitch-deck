import { expect, test } from "bun:test";
import { NorwoodCaptureController, type CaptureState } from "./norwood-capture-controller";
import type { NorwoodView } from "./norwood-assessment";
import type { NorwoodPhotoCheck } from "./norwood-photo-check";
const deferred = <T>() => { let resolve!: (value:T)=>void, reject!: (error:Error)=>void; const promise = new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; };
function setup(view: NorwoodView = "front") {
  let opens=0, stops=0, shots=0, checks=0;
  const states: CaptureState[]=[], waits:number[]=[], submitted:string[][]=[];
  let response: () => Promise<NorwoodPhotoCheck> = async()=>({ready:true,message:"saved"});
  const camera={photo:()=>`original-${++shots}`,stop:()=>{stops++;}};
  const ports = {open:async(_signal:AbortSignal)=>{opens++;return camera;}, check:async(photos:string[],actual:NorwoodView)=>{expect(actual).toBe(view);checks++;submitted.push([...photos]);return response();},change:(s:CaptureState)=>states.push(s),wait:async(ms:number,_signal:AbortSignal)=>{waits.push(ms);}};
  const controller=new NorwoodCaptureController(view,ports);
  return {controller,ports,camera,states,waits,submitted,setResponse:(next:typeof response)=>{response=next;},counts:()=>({opens,stops,shots,checks})};
}
test("nothing opens or captures until the user chooses; opening never starts a timer",async()=>{
 const h=setup();expect(h.counts()).toEqual({opens:0,stops:0,shots:0,checks:0});
 await h.controller.take();expect(h.counts().checks).toBe(0);
 await h.controller.open();expect(h.controller.state.phase).toBe("camera");expect(h.counts().shots).toBe(0);expect(h.waits).toHaveLength(0);
 await h.controller.open();expect(h.counts().opens).toBe(1);h.controller.dispose();
});
test("all five poses capture a bounded three-frame burst after the correct timer, never audio",async()=>{
 for(const view of ["front","top","crown","left","right"] as NorwoodView[]){
  const h=setup(view);await h.controller.open();await h.controller.take();
  expect(h.submitted).toEqual([["original-1","original-2","original-3"]]);expect(h.counts().stops).toBe(1);
  expect(h.waits).toEqual([...Array(view==="top"||view==="crown"?8:5).fill(1000),650,650]);
  expect(h.states.at(-1)?.phase).toBe("checking");h.controller.dispose();
 }
});
test("a rejected angle pauses with its specific correction and never retries automatically",async()=>{
 const h=setup("crown");h.setResponse(async()=>({ready:false,message:"Show the back of the top."}));
 await h.controller.open();await h.controller.take();
 expect(h.controller.state).toEqual({phase:"retake",seconds:null,message:"Show the back of the top."});
 expect(h.counts().checks).toBe(1);await h.controller.retryConnection();expect(h.counts().checks).toBe(1);
 await h.controller.open();expect(h.counts().shots).toBe(3);h.controller.dispose();
});
test("service retry resends the identical originals without reopening the camera",async()=>{
 const h=setup();h.setResponse(async()=>{throw new Error("Service unavailable");});
 await h.controller.open();await h.controller.take();expect(h.controller.state.phase).toBe("connection");
 h.setResponse(async()=>({ready:true,message:"saved"}));await h.controller.retryConnection();
 expect(h.submitted[1]).toEqual(h.submitted[0]);expect(h.counts().opens).toBe(1);expect(h.counts().shots).toBe(3);h.controller.dispose();
});
test("pause during countdown discards the burst and releases the camera",async()=>{
 const h=setup();const gate=deferred<void>();h.ports.wait=()=>gate.promise;
 await h.controller.open();const taking=h.controller.take();h.controller.pause();gate.resolve();await taking;
 expect(h.counts().checks).toBe(0);expect(h.counts().stops).toBe(1);expect(h.controller.state.phase).toBe("guide");h.controller.dispose();
});
test("a late permission result is stopped after cancellation, with no stale UI updates",async()=>{
 const h=setup();const gate=deferred<typeof h.camera>();h.ports.open=()=>gate.promise;
 const opening=h.controller.open();h.controller.pause();gate.resolve(h.camera);await opening;
 expect(h.counts().stops).toBe(1);expect(h.controller.state.phase).toBe("guide");h.controller.dispose();
});
test("double taps and hidden-page pauses cannot create overlapping requests",async()=>{
 const h=setup();const gate=deferred<NorwoodPhotoCheck>();h.setResponse(()=>gate.promise);
 await h.controller.open();const taking=h.controller.take();await Promise.resolve();await h.controller.take();
 // Flush the synchronous test clock through the three-frame burst.
 for(let i=0;i<15;i++)await Promise.resolve();expect(h.counts().checks).toBe(1);
 h.controller.pause();await h.controller.open();await h.controller.usePhoto("another");expect(h.counts().checks).toBe(1);
 gate.reject(new Error("offline"));await taking;expect(h.controller.state.phase).toBe("camera_error");
 await h.controller.retryConnection();expect(h.counts().checks).toBe(1);h.controller.dispose();
});
test("switching view or unmounting cancels the previous controller and discards late results",async()=>{
 const h=setup();const gate=deferred<NorwoodPhotoCheck>();h.setResponse(()=>gate.promise);
 const taking=h.controller.usePhoto("native-original");h.controller.dispose();const count=h.states.length;
 gate.resolve({ready:false,message:"wrong angle"});await taking;expect(h.states).toHaveLength(count);
 await h.controller.open();await h.controller.usePhoto("other");expect(h.counts().checks).toBe(1);
});
test("phone-camera fallback uses the same validation and preserves its original on network retry",async()=>{
 const h=setup("top");h.setResponse(async()=>{throw new Error("offline");});
 await h.controller.usePhoto("native-original");expect(h.counts().opens).toBe(0);
 h.setResponse(async()=>({ready:false,message:"wrong angle"}));await h.controller.retryConnection();
 expect(h.submitted).toEqual([["native-original"],["native-original"]]);expect(h.controller.state.phase).toBe("retake");h.controller.dispose();
});
test("camera denial and a stopped camera surface recovery without a saved-photo claim",async()=>{
 const h=setup();h.ports.open=async()=>{throw new Error("NotAllowedError");};await h.controller.open();
 expect(h.controller.state.phase).toBe("camera_error");expect(h.controller.state.message).not.toContain("saved");
 h.ports.open=async()=>h.camera;h.camera.photo=()=>{throw new Error("track ended");};
 await h.controller.open();await h.controller.take();expect(h.controller.state.phase).toBe("camera_error");expect(h.counts().checks).toBe(0);h.controller.dispose();
});
