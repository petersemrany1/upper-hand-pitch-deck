import { useEffect, useRef, useState } from 'react';
import { Camera, Video, VideoOff, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { NORWOOD_VIEWS, type NorwoodView } from '@/lib/norwood-assessment';
import { LIVE_ANGLES, type LiveRequest, type RepLiveApi } from '@/lib/norwood-live';
import { NorwoodLivePeer } from '@/lib/norwood-live-peer';
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
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'live'>('idle');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [views, setViews] = useState<NorwoodView[]>(savedViews), [view, setView] = useState<NorwoodView>(NORWOOD_VIEWS.find(v => !savedViews.includes(v)) ?? 'right');
  const selected = useRef(view); selected.current = view;
  const retryButton = useRef<HTMLButtonElement>(null);
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
      clearTimeout(captureTimer.current); pending.current = undefined; setBusy(false); setRetake(false); setPreview(null); previewBuffer.current.clear();
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
  const stop = (reason = '') => {
    run.current++; clearTimeout(timer.current); clearTimeout(captureTimer.current); pending.current = undefined;
    setBusy(false); setVideoReady(false); peer.current?.close(); peer.current = undefined;
    previewBuffer.current.clear(); setPreview(null); setRetake(false);
    if (video.current) video.current.srcObject = null;
    const id = room.current; room.current = undefined; if (id) void call({ action: 'stop', roomId: id }).catch(() => {});
    setPhase('idle'); setError(reason);
  };
  useEffect(() => () => stop(), [leadId, assessmentId]);

  async function join() {
    if (phase !== 'idle') return;
    const version = ++run.current; setPhase('connecting'); setError(''); setMessage('');
    try {
      let found = await call({ action: 'find' });
      for (let attempt = 0; !found.state?.offer && attempt < 25; attempt++) {
        if (run.current !== version) return; await new Promise(resolve => setTimeout(resolve, 2000));
        if (run.current !== version) return; found = await call({ action: 'find' });
      }
      if (run.current !== version) return;
      if (!found.state?.offer) throw new Error('Ask the patient to tap “Share camera with my advisor”, then connect.');
      const joined = await call({ action: 'join', roomId: found.state.roomId });
      if (run.current !== version) { if (joined.state) void call({ action: 'stop', roomId: joined.state.roomId }).catch(() => {}); return; }
      if (!joined.state?.offer || !joined.iceServers) throw new Error('Patient camera is not ready yet.');
      const state = joined.state; room.current = state.roomId;
      const connection = new NorwoodLivePeer(joined.iceServers, {
        connected: () => { if (run.current === version) { setPhase('live'); connection.send({ type: 'guide', view: selected.current }); } },
        interrupted: () => { if (run.current === version) stop('Camera disconnected. Saved photos are kept. Ask the patient to share again.'); },
        stream: stream => { if (video.current && run.current === version) { video.current.srcObject = stream; void video.current.play().catch(() => {}); } },
        message: m => {
          if (run.current !== version) return;
          if (m.type === 'status') syncSaved(m.views);
          if (m.type === 'busy' && m.id === pending.current?.id) setMessage('Taking the photo, then checking the hairline or scalp…');
          if (m.type === 'photo-preview' && m.id === pending.current?.id) {
            const image = previewBuffer.current.add(m); if (image) setPreview(image);
          }
          if (m.type === 'result' && m.id === pending.current?.id) {
            clearTimeout(captureTimer.current); setBusy(false);
            if (m.ready && m.views.includes(m.view)) {
              syncSaved(m.views);
            } else {
              pending.current = undefined; setRetake(true);
              setMessage(m.message || 'This angle could not be checked. Adjust the camera and retry.');
            }
          }
        },
      }); peer.current = connection;
      const started = Date.now();
      const poll = async () => {
        if (run.current !== version) return;
        try {
          const result = await call({ action: 'poll', roomId: state.roomId }); if (run.current !== version) return;
          if (!result.state || result.state.ended || !result.state.patientPresent) throw new Error('Patient stopped sharing. Saved photos are kept.');
          if (Date.now() - started > 40_000 && connection.pc.connectionState !== 'connected') throw new Error('Video did not connect. Ask the patient to share again.');
          timer.current = setTimeout(poll, 2000);
        } catch (e) { if (run.current === version) stop(e instanceof Error ? e.message : 'Camera interrupted.'); }
      }; void poll();
      const answer = await connection.answer(state.offer!); if (run.current !== version) return;
      await call({ action: 'sdp', roomId: state.roomId, sdp: answer });
    } catch (e) { if (run.current === version) stop(e instanceof Error ? e.message : 'Could not connect the camera.'); }
  }
  function take() {
    if (phase !== 'live' || busy || views.includes(view)) return;
    if (!video.current || video.current.readyState < 2) { setError('Wait for the live camera image before taking the photo.'); return; }
    const id = crypto.randomUUID(); pending.current = { id, view }; previewBuffer.current.begin(id);
    setBusy(true); setPreview(null); setRetake(false); setError(''); setMessage('Asking the phone to take this photo…');
    try {
      peer.current!.send({ type: 'capture', id, view });
      captureTimer.current = setTimeout(() => {
        setBusy(false); setRetake(true);
        setMessage('The photo check has not confirmed a save. Check the connection, then retry. Saved photos will update automatically.');
      }, 75_000);
    } catch { stop('Camera disconnected. Ask the patient to share again.'); }
  }
  function retry() {
    setRetake(false); setPreview(null); previewBuffer.current.clear(); pending.current = undefined; setMessage('Adjust the camera together, then capture this angle again.');
    try { peer.current?.send({ type: 'guide', view }); } catch { stop('Camera disconnected. Ask the patient to share again.'); }
  }
  function choose(next: NorwoodView) {
    selected.current = next; setView(next); setRetake(false); setPreview(null); previewBuffer.current.clear(); setMessage('');
    try { peer.current?.send({ type: 'guide', view: next }); } catch { stop('Camera disconnected. Ask the patient to share again.'); }
  }
  if (views.length === 5) return <section className="nw-rep-live" aria-live="polite"><strong>All five photos checked</strong><p>The estimate will appear here shortly.</p></section>;
  return <section className="nw-rep-live" aria-label="Guide the patient camera">
    <div className="nw-rep-title"><strong>Guide the patient’s camera</strong><span>{views.length}/5 saved</span></div>
    <div className="nw-rep-video">
      <video ref={video} autoPlay playsInline muted aria-label="Patient live camera" onLoadedData={() => setVideoReady(true)} onEmptied={() => setVideoReady(false)}/>
      {retake && preview && <><img className="nw-rep-review" src={preview} alt={`The ${LIVE_ANGLES[view].name.toLowerCase()} photo the AI could not verify`}/><span className="nw-rep-review-label">Photo checked · not saved</span></>}
      {phase !== 'live' && <div><Video size={34}/><span>{phase === 'connecting' ? 'Connecting camera…' : 'See what they’re showing you'}</span></div>}
    </div>
    {phase === 'live' ? <>
      <div className="nw-rep-angles">{NORWOOD_VIEWS.map(v => <button key={v} disabled={busy} aria-pressed={view === v} onClick={() => choose(v)}>{views.includes(v) && <Check size={12}/>} {LIVE_ANGLES[v].name}</button>)}</div>
      <div className="nw-rep-direction"><b>Say: “{LIVE_ANGLES[view].instruction}”</b><p>{LIVE_ANGLES[view].check}</p></div>
    {retake && <div className="nw-rep-retake" role="alert"><AlertCircle size={20}/><div><strong>{LIVE_ANGLES[view].name} not saved</strong><p>{message}</p></div></div>}
      {retake ? <button ref={retryButton} className="nw-rep-capture" onClick={retry}><RotateCcw size={18}/>Retry {LIVE_ANGLES[view].name.toLowerCase()}</button> : <button className="nw-rep-capture" disabled={busy || views.includes(view) || !videoReady} onClick={take}><Camera size={18}/>{busy ? 'Checking photo…' : views.includes(view) ? 'Photo saved' : !videoReady ? 'Waiting for camera image…' : `Capture ${LIVE_ANGLES[view].name.toLowerCase()}`}</button>}
    </> : <button className="nw-rep-capture" disabled={phase === 'connecting'} onClick={() => void join()}><Video size={18}/>{phase === 'connecting' ? 'Connecting…' : 'Connect to patient camera'}</button>}
    {(error || (!retake && message)) && <p role="status" className={error ? 'nw-rep-error' : ''}>{error || message}</p>}
    {phase !== 'idle' && <button className="nw-rep-end" onClick={() => stop()}><VideoOff size={15}/>End camera sharing</button>}
    <small>The patient keeps holding their phone. Guide one movement at a time. Only scan once safely stopped.</small>
  </section>;
}
