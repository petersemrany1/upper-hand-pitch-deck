import { expect, test } from "bun:test";
import { openNorwoodCamera } from "./norwood-camera";

async function withCamera(acquire: () => Promise<any>, run: () => Promise<void>) {
 const original=Object.getOwnPropertyDescriptor(globalThis,"navigator");
 Object.defineProperty(globalThis,"navigator",{configurable:true,value:{mediaDevices:{getUserMedia:async(options:any)=>{expect(options.audio).toBe(false);expect(options.video.facingMode.ideal).toBe("user");return acquire();}}}});
 try {await run();} finally {if(original)Object.defineProperty(globalThis,"navigator",original);else Reflect.deleteProperty(globalThis,"navigator");}
}
function fixture(){let stops=0;const track={readyState:"live",stop:()=>{stops++;track.readyState="ended";}};const stream={active:true,getTracks:()=>[track],getVideoTracks:()=>[track]};const video={srcObject:null,readyState:2,paused:false,videoWidth:720,videoHeight:1280,play:async()=>{}} as unknown as HTMLVideoElement;return {stream,video,track,stops:()=>stops};}
test("camera waits for real decoded frames, then releases every track on pause",async()=>{
 const f=fixture();(f.video as any).readyState=0;(f.video as any).videoWidth=0;
 await withCamera(async()=>f.stream,async()=>{
  const abort=new AbortController();let opened=false;
  const opening=openNorwoodCamera(f.video,abort.signal).then(camera=>{opened=true;return camera;});
  await new Promise(r=>setTimeout(r,70));expect(opened).toBe(false);
  (f.video as any).readyState=2;(f.video as any).videoWidth=720;
  const camera=await opening;expect(opened).toBe(true);camera.stop();expect(f.stops()).toBe(1);expect(f.video.srcObject).toBeNull();expect(()=>camera.photo()).toThrow("paused");
 });
});
test("camera permission that arrives after cancellation is immediately released",async()=>{
 const f=fixture();let give!:(s:any)=>void;
 await withCamera(()=>new Promise(r=>{give=r;}),async()=>{
  const abort=new AbortController();const opening=openNorwoodCamera(f.video,abort.signal);abort.abort();give(f.stream);
  await expect(opening).rejects.toThrow();expect(f.stops()).toBe(1);expect(f.video.srcObject).toBeNull();
 });
});
test("ended tracks cannot be submitted as valid camera frames",async()=>{
 const f=fixture();await withCamera(async()=>f.stream,async()=>{const camera=await openNorwoodCamera(f.video,new AbortController().signal);f.track.readyState="ended";expect(()=>camera.photo()).toThrow("paused");camera.stop();});
});
test("an unanswered camera permission request times out; a late stream is still stopped",async()=>{
 const f=fixture();let give!:(s:any)=>void;
 await withCamera(()=>new Promise(r=>{give=r;}),async()=>{
  const opening=openNorwoodCamera(f.video,new AbortController().signal);
  await expect(opening).rejects.toThrow("timed out");give(f.stream);await Promise.resolve();await Promise.resolve();expect(f.stops()).toBe(1);
 });
},20_000);
