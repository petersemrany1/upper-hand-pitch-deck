export type DeliveryStatus={status:string;error:string|null};
export type DeliveryEvent={sms_phone:string;sms_body:string;appointment_id:string|null};
export type DeliveryResult={ok:boolean;sid?:string;status?:string;error?:string};
export async function deliverRescheduleOnce(deps:{
 claim():Promise<DeliveryEvent|null>;
 existing():Promise<DeliveryStatus>;
 send(event:DeliveryEvent):Promise<DeliveryResult>;
 finish(status:string,result:DeliveryResult):Promise<void>;
 log(event:DeliveryEvent,result:DeliveryResult):Promise<void>;
}):Promise<DeliveryStatus>{
 const event=await deps.claim();if(!event)return deps.existing();
 let result:DeliveryResult;
 try{result=await deps.send(event);}catch{
   const error="Sending outcome is uncertain. Check the SMS inbox before retrying.";
   await deps.finish("uncertain",{ok:false,error});return {status:"uncertain",error};
 }
 const status=result.ok?"accepted":"failed";
 try{await deps.finish(status,result);}catch{return {status:"uncertain",error:"Could not record SMS status; check the inbox before retrying"};}
 if(result.ok)await deps.log(event,result);
 return {status,error:result.error??null};
}
