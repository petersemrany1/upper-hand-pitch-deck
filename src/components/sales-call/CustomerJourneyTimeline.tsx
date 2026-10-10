import { formatSydney } from "@/lib/timezone";
import { journeyItems, type CustomerJourney } from "./customer-journey";
export function CustomerJourneyTimeline({data,loading,error,onRetry}:{data:CustomerJourney|null;loading:boolean;error:boolean;onRetry:()=>void}) {
  if(loading&&!data) return <div role="status" className="py-4 text-sm text-slate-600">Loading communication history…</div>;
  const items=data?journeyItems(data):[];
  return <>
    {error && <div role="alert" className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      {data?"History couldn’t refresh. The entries below may be out of date.":"Communication history couldn’t load."}
      <button onClick={onRetry} className="ml-2 font-semibold underline">Retry</button>
    </div>}
    {!error&&data&&items.length===0&&<p className="py-3 text-sm text-slate-600">No recorded communications found.</p>}
    <div className="space-y-2">{items.map(item=><article key={item.id} className="rounded-md border border-slate-200 bg-white p-3" style={{borderLeft:`3px solid ${item.kind==="call"?"#3b82f6":item.kind==="skip"?"#d97706":"#8b5cf6"}`}}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
        {item.status&&<span className={`text-xs ${item.status==="Not delivered"?"text-red-700":"text-slate-600"}`}>{item.status}</span>}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        <time dateTime={item.at}>{formatSydney(item.at,{dateStyle:"medium",timeStyle:"short"})}</time>
        {item.rep&&` · ${item.rep}`}{item.duration&&` · ${item.duration}`}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{item.summary}</p>
      {Boolean(item.media?.length)&&<div className="mt-2 flex flex-wrap gap-2">{item.media!.map((url,i)=><a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded border border-slate-200 p-1 text-xs text-blue-700">
        {/\.(png|jpe?g|gif|webp|avif)(?:[?#]|$)|\/mms-images\//i.test(url)&&<img src={url} alt={`Photo ${i+1}`} loading="lazy" className="h-16 w-20 rounded object-cover"/>}
        <span className="block px-1 py-1">View attachment {i+1}</span>
      </a>)}</div>}
      {item.detail&&item.detail.replace(/\s+/g," ").trim()!==item.summary&&<details className="mt-2 text-xs text-blue-700"><summary className="cursor-pointer">{item.kind==="call"?"Full call summary":"Full message"}</summary><p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{item.detail}</p></details>}
      {item.transcript&&<details className="mt-2 text-xs text-blue-700"><summary className="cursor-pointer">Call transcript</summary><p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{item.transcript}</p></details>}
    </article>)}</div>
  </>;
}
