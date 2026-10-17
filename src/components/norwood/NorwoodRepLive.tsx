import { LiveHeartbeatHealth, terminalLiveError, type LiveStopReason } from '@/lib/norwood-live-health';
import { useEffect, useRef, useState } from 'react';
import { Camera, Video, VideoOff, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { NORWOOD_VIEWS, type NorwoodView } from '@/lib/norwood-assessment';
import { LIVE_ANGLES, REVIEW_ANATOMY, type LiveRequest, type LiveState, type RepLiveApi } from '@/lib/norwood-live';
import { NorwoodLivePeer } from '@/lib/norwood-live-peer';
import { canAutoJoin } from '@/lib/norwood-live-autoconnect';
import { CapturePreview } from '@/lib/norwood-live-preview';
import { mergeSavedViews, nextCaptureView } from '@/lib/norwood-live-progress';
import './norwood-live.css';

export default function NorwoodRepLive({ leadId, assessmentId, api, savedViews = [] }: {
  leadId: string; assessmentId: string; api: RepLiveApi; savedViews?: NorwoodView[];
}) {
  const video = useRef<HTMLVideoElement>(null), client = useRef(crypto.randomUUID()), run = useRef(0);
  const peer = useRef<NorwoodLivePeer | undefined>(undefined), room = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), captureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{ id: string; view: NorwoodView } | undefined>(undefined), previewBuffer = useRef(new CapturePreview());
  const confirmed = useRef<NorwoodView[]>(savedViews);
  const phaseRef = useRef<'idle' | 'connecting' | 'live'>('idle'), attemptedRooms = useRef(new Set<string>());
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'live'>('idle');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [views, setViews] = useState<NorwoodView[]>(savedViews), [view, setView] = useState<NorwoodView>(NORWOOD_VIEWS.find(v => !savedViews.includes(v)) ?? 'right');
  const selected = useRef(view); selected.current = view;
  const [review,setReview]=useState<{id:string;view:NorwoodView;ticket:string}|null>(null),[reviewConfirmed,setReviewConfirmed]=useState(false);
  const [controlRecovering,setControlRecovering]=useState(false),[peerRecovering,setPeerRecovering]=useState(false);
  const reviewLock=useRef(false), leaseTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const retryButton = useRef<HTMLButtonElement>(null);
  const [previewReady,setPreviewReady]=useState(false);
  const [preview, setPreview] = useState<string | null>(null), [retake, setRetake] = useState(false), [videoReady, setVideoReady] = useState(false);

  useEffect(() => { if (retake) retryButton.current?.focus(); }, [retake]);

  const call = async (input: Omit<LiveRequest, 'clientId'>) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const reply = await Promise.race([api({ data: { ...input, clientId: client.current, leadId, assessmentId } }), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Camera connection timed out. Reconnect to continue.')), 12_000); })]);
      if (!reply.ok) throw new Error(reply.error); return reply.data;
    } finally { clearTimeout(timeout); }
  };
  function syncSaved(received: NorwoodView[]) {
    const saved = mergeSavedViews(confirmed.current, received);
    confirmed.current = saved; setViews(saved);
    if (pending.current && saved.includes(pending.current.view)) {
      clearTimeout(captureTimer.current); pending.current = undefined; setBusy(false); setRetake(false); setReview(null); setReviewConfirmed(false); setPreview(null); previewBuffer.current.clear();
      setMessage('Photo saved. Ready for the next angle.');
    }
    const next = nextCaptureView(selected.current, saved);
    if (next !== selected.current) {
      selected.current = next; setView(next);
      try { peer.current?.send({ type: 'guide', view: next }); } catch { /* Saved progress does not depend on video connectivity. */ }
    }
  }
  // A save survives a lost data-channel result, camera disconnect or page reload.
  useEffect(() => { syncSaved(savedViews); }, [savedViews.join(',')]);
  const stop = (reason = '', stopReason:LiveStopReason='user_stop') => {
    run.current++; clearTimeout(leaseTimer.current); setControlRecovering(false); setPeerRecovering(false); setReview(null); setReviewConfirmed(false); clearTimeout(timer.current); clearTimeout(captureTimer.current); pending.current = undefined;
    setBusy(false); setVideoReady(false); peer.current?.close(); peer.current = undefined;
    previewBuffer.current.clear(); setPreview(null); setRetake(false);
    if (video.current) video.current.srcObject = null;
    const id = room.current; room.current = undefined; if (id) void call({ action: 'stop', roomId: id, stopReason }).catch(() => {});
    phaseRef.current = 'idle'; setPhase('idle'); setError(reason);
  };
  useEffect(() => () => stop('','unmount'), [leadId, assessmentId]);

  async function join(foundState?: LiveState) {
    if (phaseRef.current !== 'idle') return;
    phaseRef.current = 'connecting';
    const version = ++run.current; setPhase('connecting'); setError(''); setMessage('');
    try {
      const found = foundState ? { state: foundState } : await call({ action: 'find' });
      if (run.current !== version) return;
      if (!found.state?.offer || found.state.ended || !found.state.patientPresent) {
        phaseRef.current = 'idle'; setPhase('idle'); return;
      }
      attemptedRooms.current.add(found.state.roomId);
      const joined = await call({ action: 'join', roomId: found.state.roomId });
      if (run.current !== version) { if (joined.state) void call({ action: 'stop', roomId: joined.state.roomId }).catch(() => {}); return; }
      if (!joined.state?.offer || !joined.iceServers) throw new Error('Patient camera is not ready yet.');
      const state = joined.state; room.current = state.roomId;
      leaseTimer.current=setTimeout(()=>{if(run.current===version)stop('Camera sharing ended. Saved photos are kept.','access_ended');},Math.max(0,Date.parse(state.expiresAt)-Date.now()));
      const connection = new NorwoodLivePeer(joined.iceServers, {
        connected: () => { if (run.current === version) { phaseRef.current = 'live'; setPhase('live'); connection.send({ type: 'guide', view: selected.current }); } },
        interrupted: reason => { if (run.current === version) stop('Camera disconnected. Saved photos are kept. Ask the patient to share again.',reason??'peer_failed'); },
        recovering: value => {if(run.current===version)setPeerRecovering(value);},
        stream: stream => { if (video.current && run.current === version) { video.current.srcObject = stream; void video.current.play().catch(() => {}); } },
        message: m => {
          if (run.current !== version) return;
          if (m.type === 'status') syncSaved(m.views);
          if (m.type === 'busy' && m.id === pending.current?.id) setMessage('Taking the photo, then checking the hairline or scalp…');
          if (m.type === 'photo-preview' && m.id === pending.current?.id) {
            const image = previewBuffer.current.add(m); if (image){setPreviewReady(false);setPreview(image);}
          }
          if (m.type === 'result' && m.id === pending.current?.id) {
            clearTimeout(captureTimer.current); setBusy(false);
            if (m.ready && m.views.includes(m.view)) {
              syncSaved(m.views);
            } else {
              setReview(m.reviewTicket?{id:m.id,view:m.view,ticket:m.reviewTicket}:null); setReviewConfirmed(false);
              pending.current = undefined; setRetake(true);
              setMessage(m.message || 'This angle could not be checked. Adjust the camera and retry.');
            }
          }
        },
      }); peer.current = connection;
      const started = Date.now(), health=new LiveHeartbeatHealth(); let hasConnected=false;
      const poll = async () => {
        if (run.current !== version) return;
        try {
          const result = await call({ action: 'poll', roomId: state.roomId }); if (run.current !== version) return;
          if (!result.state || result.state.ended || Date.parse(result.state.expiresAt)<=Date.now()) {stop('Patient stopped sharing. Saved photos are kept.','access_ended');return;}
          if(!result.state.patientPresent)throw new Error('Waiting for the patient’s connection.');
          if(connection.pc.connectionState==='connected')hasConnected=true;
          if (Date.now() - started > 40_000 && !hasConnected) {stop('Video did not connect. Ask the patient to share again.','setup_failed');return;}
          health.healthy();setControlRecovering(false);
        } catch (e) {
          if(run.current!==version)return;
          if(terminalLiveError(e)||health.shouldStop()){stop(terminalLiveError(e)?(e instanceof Error?e.message:'Camera access ended. Reconnect to continue.'):'Connection lost. Saved photos are kept. Ask the patient to share again.',terminalLiveError(e)?'access_ended':'heartbeat_timeout');return;}
          setControlRecovering(true);
        }
        if(run.current===version)timer.current=setTimeout(poll,2000);
      }; void poll();
      const answer = await connection.answer(state.offer!); if (run.current !== version) return;
      await call({ action: 'sdp', roomId: state.roomId, sdp: answer });
    } catch (e) { if (run.current === version) stop(e instanceof Error ? e.message : 'Could not connect the camera.','setup_failed'); }
  }
  const autoConnect = useRef({ call, join }); autoConnect.current = { call, join };
  useEffect(() => {
    let cancelled = false, watch: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (cancelled) return;
      if (phaseRef.current === 'idle' && !document.hidden) {
        const version = run.current;
        try {
          const found = await autoConnect.current.call({ action: 'find' });
          if (!cancelled && version === run.current && phaseRef.current === 'idle'
            && !document.hidden && canAutoJoin(found.state, attemptedRooms.current)) {
            await autoConnect.current.join(found.state!);
          }
        } catch {
          if (!cancelled && version === run.current) setError('Checking the camera connection…');
        }
      }
      if (!cancelled) watch = setTimeout(check, 2000);
    };
    void check();
    return () => { cancelled = true; clearTimeout(watch); };
  }, [leadId, assessmentId]);
  function take() {
    if (phase !== 'live' || busy || views.includes(view)) return;
    if (!video.current || video.current.readyState < 2) { setError('Wait for the live camera image before taking the photo.'); return; }
    const id = crypto.randomUUID(); pending.current = { id, view }; previewBuffer.current.begin(id);
    setReview(null); setReviewConfirmed(false); setBusy(true); setPreview(null); setRetake(false); setError(''); setMessage('Asking the phone to take this photo…');
    try {
      peer.current!.send({ type: 'capture', id, view });
      captureTimer.current = setTimeout(() => {
        setBusy(false); setRetake(true);
        setMessage('The photo check has not confirmed a save. Check the connection, then retry. Saved photos will update automatically.');
      }, 75_000);
    } catch { stop('Camera disconnected. Ask the patient to share again.'); }
  }
  async function acceptReviewedPhoto() {
    if(!review || !reviewConfirmed || !preview || !previewReady || busy || reviewLock.current || phaseRef.current!=='live')return;
    reviewLock.current=true; const version=run.current;setBusy(true);setError('');
    try{
      const reply=await call({action:'review',roomId:room.current,reviewTicket:review.ticket,reviewConfirmed:true});
      if(run.current!==version)return;
      if(!reply.reviewApproval)throw new Error('Photo approval could not be confirmed.');
      pending.current={id:review.id,view:review.view};
      peer.current!.send({type:'accept-photo',id:review.id,view:review.view,approval:reply.reviewApproval});
      setMessage('Saving the photo you reviewed…');
      captureTimer.current=setTimeout(()=>{if(run.current===version){setBusy(false);setMessage('Save not confirmed yet. Check the connection, then try again.');}},75_000);
    }catch(e){if(run.current===version){pending.current=undefined;setBusy(false);setError(e instanceof Error?e.message:'Could not save this photo.');}}
    finally{reviewLock.current=false;}
  }
  function retry() {
    setReview(null); setReviewConfirmed(false); setRetake(false); setPreview(null); previewBuffer.current.clear(); pending.current = undefined; setMessage('Adjust the camera together, then capture this angle again.');
    try { peer.current?.send({ type: 'guide', view }); } catch { stop('Camera disconnected. Ask the patient to share again.'); }
  }
  function choose(next: NorwoodView) {
    setReview(null); setReviewConfirmed(false); selected.current = next; setView(next); setRetake(false); setPreview(null); previewBuffer.current.clear(); setMessage('');
    try { peer.current?.send({ type: 'guide', view: next }); } catch { stop('Camera disconnected. Ask the patient to share again.'); }
  }
  if (views.length === 5) return <section className="nw-rep-live" aria-live="polite"><strong>All five photos checked</strong><p>The estimate will appear here shortly.</p></section>;
  return <section className="nw-rep-live" aria-label="Guide the patient camera">
    <div className="nw-rep-title"><strong>Guide the patient’s camera</strong><span>{views.length}/5 saved</span></div>
    <div className="nw-rep-video">
      <video ref={video} autoPlay playsInline muted aria-label="Patient live camera" onLoadedData={() => setVideoReady(true)} onEmptied={() => setVideoReady(false)}/>
      {retake && preview && <><img className="nw-rep-review" src={preview} onLoad={()=>setPreviewReady(true)} onError={()=>setPreviewReady(false)} alt={`The ${LIVE_ANGLES[view].name.toLowerCase()} photo the AI could not verify`}/><span className="nw-rep-review-label">Photo checked · not saved</span></>}
      {phase !== 'live' && <div><Video size={34}/><span>{phase === 'connecting' ? 'Connecting camera…' : 'Waiting for the patient to tap Show advisor'}</span></div>}
    </div>
    {phase === 'live' ? <>
      <div className="nw-rep-angles">{NORWOOD_VIEWS.map(v => <button key={v} disabled={busy} aria-pressed={view === v} onClick={() => choose(v)}>{views.includes(v) && <Check size={12}/>} {LIVE_ANGLES[v].name}</button>)}</div>
      <div className="nw-rep-direction"><b>Say: “{LIVE_ANGLES[view].instruction}”</b><p>{LIVE_ANGLES[view].check}</p></div>
    {retake && review && preview && <div className="nw-rep-framing-review"><label><input type="checkbox" checked={reviewConfirmed} disabled={busy||!previewReady} onChange={e=>setReviewConfirmed(e.target.checked)}/><span>I can see {REVIEW_ANATOMY[view]} clearly in this photo.</span></label><button className="nw-rep-capture" disabled={!reviewConfirmed||busy||!previewReady} onClick={()=>void acceptReviewedPhoto()}><Check size={18}/>{busy?'Saving reviewed photo…':'Use reviewed photo'}</button><small>This accepts the framing. The final AI assessment still checks all five photos.</small></div>}
    {retake && <div className="nw-rep-retake" role="alert"><AlertCircle size={20}/><div><strong>{review?'AI flagged the framing':`${LIVE_ANGLES[view].name} not saved`}</strong><p>{message}</p></div></div>}
      {retake ? <button ref={retryButton} className={review&&preview?"nw-rep-retry-secondary":"nw-rep-capture"} disabled={busy} onClick={retry}><RotateCcw size={18}/>Retry {LIVE_ANGLES[view].name.toLowerCase()}</button> : <button className="nw-rep-capture" disabled={busy || views.includes(view) || !videoReady} onClick={take}><Camera size={18}/>{busy ? 'Checking photo…' : views.includes(view) ? 'Photo saved' : !videoReady ? 'Waiting for camera image…' : `Capture ${LIVE_ANGLES[view].name.toLowerCase()}`}</button>}
    </> : <button className="nw-rep-capture" disabled={phase === 'connecting'} onClick={() => void join()}><Video size={18}/>{phase === 'connecting' ? 'Connecting…' : 'Check camera connection'}</button>}
    {(controlRecovering||peerRecovering)&&<p role="status">Reconnecting… Keep this screen open. Saved photos are kept.</p>}
    {(error || (!retake && message)) && <p role="status" className={error ? 'nw-rep-error' : ''}>{error || message}</p>}
    {phase !== 'idle' && <button className="nw-rep-end" onClick={() => stop()}><VideoOff size={15}/>End camera sharing</button>}
    <small>Connects automatically when this patient taps Show advisor. Keep their call on speaker or earbuds. Only scan once safely stopped.</small>
  </section>;
}
