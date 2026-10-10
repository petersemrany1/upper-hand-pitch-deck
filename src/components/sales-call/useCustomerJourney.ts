import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { relevantJourneyChange, type CustomerJourney } from "./customer-journey";

export async function fetchCustomerJourney(leadId: string): Promise<CustomerJourney> {
  const {data,error}=await (supabase as any).rpc("customer_journey",{p_lead:leadId});
  if(error) throw error;
  if(!data || !Array.isArray(data.calls) || !Array.isArray(data.messages) || !Array.isArray(data.skips)) throw new Error("History was not returned");
  return data;
}
export function refreshCustomerJourney(leadId: string) {
  window.dispatchEvent(new CustomEvent("customer-journey-changed",{detail:{leadId}}));
}
export function useCustomerJourney(leadId: string, phone: string|null, enabled: boolean) {
  const [state,setState]=useState<{leadId:string;data:CustomerJourney|null;error:boolean;loading:boolean}>({leadId,data:null,error:false,loading:true});
  const dataRef=useRef<CustomerJourney|null>(null);
  const reloadRef=useRef<()=>void>(()=>{});
  const refresh=useCallback(()=>reloadRef.current(),[]);
  useEffect(()=>{
    dataRef.current=null;
    setState({leadId,data:null,error:false,loading:true});
    if(!enabled) {reloadRef.current=()=>{};return;}
    let disposed=false,loading=false,again=false;
    let debounce:ReturnType<typeof setTimeout>|undefined;
    const load=async()=>{
      if(loading) {again=true;return;}
      loading=true;
      try {
        const data=await fetchCustomerJourney(leadId);
        if(disposed) return;
        dataRef.current=data;
        setState({leadId,data,error:false,loading:false});
      } catch {
        if(!disposed) setState({leadId,data:dataRef.current,error:true,loading:false});
      } finally {
        loading=false;
        if(again&&!disposed) {again=false;void load();}
      }
    };
    const schedule=()=>{clearTimeout(debounce);debounce=setTimeout(()=>void load(),200);};
    reloadRef.current=()=>void load();
    const visible=()=>{if(document.visibilityState!=="hidden") void load();};
    const changed=(event:Event)=>{const id=(event as CustomEvent<{leadId:string}>).detail?.leadId;if(id===leadId || dataRef.current?.leadIds.includes(id)) schedule();};
    let channel=supabase.channel(`journey-${leadId}`);
    for(const table of ["call_records","sms_messages","lead_skip_events"]){
      channel=channel.on("postgres_changes",{event:"*",schema:"public",table},payload=>{
        if(relevantJourneyChange(payload.new as Record<string,unknown>,leadId,phone,dataRef.current)
          || relevantJourneyChange(payload.old as Record<string,unknown>,leadId,phone,dataRef.current)) schedule();
      });
    }
    channel.subscribe();
    void load();
    // Realtime is an accelerator; reopen/focus/poll also recover missed events.
    const poll=setInterval(visible,30000);
    window.addEventListener("focus",visible);
    document.addEventListener("visibilitychange",visible);
    window.addEventListener("customer-journey-changed",changed);
    return ()=>{disposed=true;clearTimeout(debounce);clearInterval(poll);reloadRef.current=()=>{};window.removeEventListener("focus",visible);document.removeEventListener("visibilitychange",visible);window.removeEventListener("customer-journey-changed",changed);void supabase.removeChannel(channel);};
  },[leadId,phone,enabled]);
  return {data:state.leadId===leadId?state.data:null,error:state.leadId===leadId&&state.error,loading:state.leadId!==leadId||state.loading,refresh};
}
