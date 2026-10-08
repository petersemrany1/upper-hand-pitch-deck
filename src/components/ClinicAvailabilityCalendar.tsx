import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  addDays, applyScheduleCommand, appointmentDuration, asDate, blockedStartBands, blocksForDate,
  configurationOf, datesForEdit, effectiveHoursFor, formatDay, freeIntervals, hhmmToMin, minToHHMM,
  patientBufferBands, rangeLabel, schedulingWarnings, timeLabel, validDate,
  type ClinicSchedule, type ScheduleCommand, type ScheduleConfiguration,
} from "@/lib/clinic-schedule";
import { calendarEventLayout, mergeCalendarBands } from "@/lib/calendar-event-layout";
import { sydneyTodayISO } from "@/lib/timezone";
import "./clinic-availability-calendar.css";

type Props = {
  schedule: ClinicSchedule;
  onSave: (command: ScheduleCommand, version: string) => Promise<ClinicSchedule>;
  onRefresh?: () => void;
  preview?: boolean;
  initialDate?: string;
};
type Editor = {
  kind: "block" | "hours" | "appointment" | "buffer";
  date: string; start: string; end: string; version: string;
  id?: string; recurring?: boolean; patient?: string; minutes?: number;
};
const weekDays = [{ n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" }, { n: 4, label: "Thu" }, { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 0, label: "Sun" }];
const calendarTimeLabel = (minute: number) => timeLabel(minute).replace(/^(\d+)(am|pm)$/, "$1:00$2");
const calendarRangeLabel = (from: number, until: number) => `${calendarTimeLabel(from)}–${calendarTimeLabel(until)}`;

export function ClinicAvailabilityCalendar({ schedule, onSave, onRefresh, preview = false, initialDate }: Props) {
  const root = useRef<HTMLElement>(null);
  const savedViewport = useRef<{ y: number; top: number; visible: boolean; left: number; container: HTMLElement | null } | null>(null);
  const mondayOf = (date: string) => addDays(date, -((asDate(date).getDay() + 6) % 7));
  const [base, setBase] = useState(() => mondayOf(initialDate ?? sydneyTodayISO()));
  const columns = 7;
  const [compact, setCompact] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pendingSettings, setPendingSettings] = useState<Extract<ScheduleCommand, { action: "settings" }> | null>(null);
  const [settings, setSettings] = useState<{ duration: string; buffer: string; version: string; trading: ClinicSchedule["trading"] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<{ configuration: ScheduleConfiguration; version: string } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ date: string; from: number; to: number } | null>(null);
  const drag = useRef<{ date: string; from: number; to: number; y: number; moved: boolean; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const today = sydneyTodayISO();
  const dates = Array.from({ length: columns }, (_, i) => addDays(base, i));
  const warnings = useMemo(() => schedulingWarnings(schedule), [schedule]);
  const dayLayouts = dates.map(date => {
    const booked = schedule.appointments.filter(a => a.appointment_date === date);
    const blocks = blocksForDate(asDate(date), schedule.blocks);
    const layout = calendarEventLayout([
      ...booked.map(a => ({ id: `appointment:${a.id}`, start: hhmmToMin(a.appointment_time), end: hhmmToMin(a.appointment_time) + appointmentDuration(a) })),
      ...blocks.map((b, i) => ({ id: `block:${i}`, start: hhmmToMin(b.slot_start), end: hhmmToMin(b.slot_end) })),
    ]);
    return { date, layout };
  });
  useLayoutEffect(() => {
    const previous = savedViewport.current;
    if (!previous || busy || settings) return;
    const grid = root.current?.querySelector<HTMLElement>(".availability-week-scroll");
    savedViewport.current = null;
    if (!grid) return;
    grid.scrollLeft = previous.left;
    const currentY = previous.container?.scrollTop ?? window.scrollY;
    const top = previous.visible ? currentY + grid.getBoundingClientRect().top - previous.top : previous.y;
    if (previous.container) previous.container.scrollTo({ top, behavior: "instant" });
    else window.scrollTo({ top, behavior: "instant" });
  }, [schedule, busy, settings]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 800));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visibleHours = dates.map(date => effectiveHoursFor(asDate(date), schedule.trading, schedule.overrides, schedule.state)).filter(h => h && !h.is_closed);
  const appointments = schedule.appointments.filter(a => dates.includes(a.appointment_date));
  const firstMinute = Math.max(0, Math.floor(Math.min(480, ...visibleHours.map(h => hhmmToMin(h!.open_time)), ...appointments.map(a => hhmmToMin(a.appointment_time))) / 60) * 60);
  const lastMinute = Math.min(1440, Math.ceil(Math.max(960, ...visibleHours.map(h => hhmmToMin(h!.close_time) + 60), ...appointments.map(a => hhmmToMin(a.appointment_time) + appointmentDuration(a) + schedule.buffer_minutes)) / 60) * 60);
  const scale = 1.6;
  const position = (from: number, to: number): CSSProperties => ({ top: (Math.max(from, firstMinute) - firstMinute) * scale, height: Math.max(0, Math.min(to, lastMinute) - Math.max(from, firstMinute)) * scale });

  function open(kind: Editor["kind"], date: string, start: string, end: string, extra: Partial<Editor> = {}) {
    setError("");
    setEditor({ kind, date, start, end, version: schedule.version, ...extra });
  }
  async function commit(command: ScheduleCommand, version: string, success: string, isUndo = false) {
    if (busy) return;
    const grid = root.current?.querySelector<HTMLElement>(".availability-week-scroll");
    if (grid) {
      let container = grid.parentElement;
      while (container && !(/auto|scroll/.test(getComputedStyle(container).overflowY) && container.scrollHeight > container.clientHeight)) container = container.parentElement;
      const rect = grid.getBoundingClientRect(), viewport = container?.getBoundingClientRect();
      savedViewport.current = { container, y: container?.scrollTop ?? window.scrollY, top: rect.top, visible: rect.top < (viewport?.bottom ?? window.innerHeight) && rect.bottom > (viewport?.top ?? 0), left: grid.scrollLeft };
    }
    setBusy(true); setError("");
    try {
      applyScheduleCommand(schedule, command);
      const previous = configurationOf(schedule);
      const updated = await onSave(command, version);
      setUndo(isUndo || command.action === "settings" && command.apply_to_existing ? null : { configuration: previous, version: updated.version });
      setEditor(null); setSettings(null); setPendingSettings(null); setMessage(success);
    } catch (failure) {
      savedViewport.current = null;
      setError(failure instanceof Error ? failure.message : "Could not save. Please try again.");
    } finally { setBusy(false); }
  }
  function refreshCalendar() {
    setEditor(null); setSettings(null); setPendingSettings(null); setError(""); onRefresh?.();
  }
  function hoursEditor(date: string) {
    const hours = effectiveHoursFor(asDate(date), schedule.trading, schedule.overrides, schedule.state);
    open("hours", date, hours?.open_time.slice(0, 5) ?? "09:00", hours?.close_time.slice(0, 5) ?? "15:00");
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>, date: string) {
    if (event.button !== 0 || event.pointerType === "touch" || busy || date < today || !(event.target as HTMLElement).closest(".availability-empty")) return;
    const button = (event.target as HTMLElement).closest<HTMLElement>(".availability-empty")!;
    const from = Number(button.dataset.minute);
    drag.current = { date, from, to: Number(button.dataset.until), y: event.clientY, moved: false, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const selected = drag.current;
    if (!selected || selected.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientY - selected.y) <= 5 && !selected.moved) return;
    selected.moved = true;
    const at = Math.round(((event.clientY - event.currentTarget.getBoundingClientRect().top) / scale + firstMinute) / 15) * 15;
    selected.to = Math.min(lastMinute, Math.max(firstMinute, at));
    setDragPreview({ date: selected.date, from: Math.min(selected.from, selected.to), to: Math.max(selected.from + 15, selected.to) });
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const selected = drag.current; drag.current = null; setDragPreview(null);
    if (!selected) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (selected) {
      suppressClick.current = true;
      open("block", selected.date, minToHHMM(Math.min(selected.from, selected.to)), minToHHMM(selected.moved ? Math.max(selected.from + 15, selected.to) : selected.to));
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    }
  }

  return <section className="availability-calendar" ref={root} aria-label="Clinic availability">
    <div className="availability-heading">
      <div><h2>Availability</h2><p>{schedule.clinic_name}</p></div>
      {preview && <span className="availability-preview">Approval preview · changes stay in this preview</span>}
    </div>
    <div className="availability-settings">
      <button className="availability-settings-summary" aria-haspopup="dialog" aria-expanded={!!settings} onClick={() => { setError(""); setSettings(settings ? null : { duration: String(schedule.consultation_minutes), buffer: String(schedule.buffer_minutes), version: schedule.version, trading: Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, open_time: "09:00", close_time: "17:00", is_closed: day_of_week > 4, consult_duration_mins: 30, ...schedule.trading.find(h => h.day_of_week === day_of_week) })) }); }} disabled={busy}>
        <span>{schedule.consultation_minutes}-minute consultations · {schedule.buffer_minutes ? `${schedule.buffer_minutes}-minute buffer between patients` : "No buffer between patients"}</span>
        <span className="availability-link">Settings</span>
      </button>
      <Dialog.Root open={!!settings} onOpenChange={isOpen => { if (!isOpen && !busy) { setSettings(null); setPendingSettings(null); setError(""); } }}><Dialog.Portal><Dialog.Overlay className="availability-dialog-backdrop" /><Dialog.Content className="availability-dialog availability-settings-dialog" onCloseAutoFocus={event => { event.preventDefault(); root.current?.querySelector<HTMLButtonElement>(".availability-settings-summary")?.focus({ preventScroll: true }); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}>
        <div className="availability-dialog-title"><Dialog.Title>Calendar settings</Dialog.Title><Dialog.Close aria-label="Close settings" disabled={busy}><X size={18} /></Dialog.Close></div>
        <Dialog.Description>Appointment length, buffer and weekly hours.</Dialog.Description>
      {settings && pendingSettings ? <div><p><strong>Apply {pendingSettings.consultation_minutes}-minute consultations to all existing patients?</strong></p><p><strong>Warning:</strong> Existing appointments will use this length. Start times stay unchanged. You may need to contact patients and reschedule any conflicts.</p><p>Appointments that need attention will appear in the calendar’s review list.</p>{error && <div role="alert" className="availability-error">{error}</div>}<div className="availability-actions"><button disabled={busy} onClick={() => { setPendingSettings(null); setError(""); }}>Back</button><button className="availability-primary" disabled={busy} onClick={() => void commit({ ...pendingSettings, apply_to_existing: true }, settings.version, "Consultation lengths updated. Review any conflicts below.")}>{busy ? "Saving…" : "Yes, update all appointments"}</button></div></div> : settings && <form className="availability-settings-form" onSubmit={event => { event.preventDefault(); const command = { action: "settings" as const, consultation_minutes: Number(settings.duration), buffer_minutes: Number(settings.buffer), trading: settings.trading }; if (command.consultation_minutes !== schedule.consultation_minutes || schedule.appointments.some(a => appointmentDuration(a) !== command.consultation_minutes) || settings.trading.some(h => { const old = schedule.trading.find(row => row.day_of_week === h.day_of_week); return !old || old.is_closed !== h.is_closed || hhmmToMin(old.open_time) !== hhmmToMin(h.open_time) || hhmmToMin(old.close_time) !== hhmmToMin(h.close_time); })) { try { applyScheduleCommand(schedule, { ...command, apply_to_existing: true }); setError(""); setPendingSettings(command); } catch (e) { setError(e instanceof Error ? e.message : "Check settings."); } } else void commit(command, settings.version, "Settings saved."); }}>
        <label>Consultation length <span className="availability-input-unit"><input aria-label="Consultation length in minutes" type="number" required min={5} max={240} step={1} value={settings.duration} onChange={e => setSettings({ ...settings, duration: e.target.value })} disabled={busy} /><span>minutes</span></span><small>Time with each patient.</small></label>
        <label>Buffer between patients <span className="availability-input-unit"><input aria-label="Buffer between patients in minutes" type="number" required min={0} max={180} step={1} value={settings.buffer} onChange={e => setSettings({ ...settings, buffer: e.target.value })} disabled={busy} /><span>minutes</span></span><small>Added automatically. Use 0 for no buffer.</small></label>
        <fieldset className="availability-operating-hours"><legend>Weekly operating hours</legend><p>Repeats weekly. Uncheck a day to close.</p>{settings.trading.map((h, day) => <div className="availability-operating-day" key={day}><label><input type="checkbox" checked={!h.is_closed} disabled={busy} onChange={e => setSettings({ ...settings, trading: settings.trading.map((row, i) => i === day ? { ...row, is_closed: !e.target.checked } : row) })} />{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]}</label>{h.is_closed ? <span>Closed</span> : <><label><span className="availability-sr-only">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]} from</span><input type="time" required value={h.open_time.slice(0, 5)} disabled={busy} onChange={e => setSettings({ ...settings, trading: settings.trading.map((row, i) => i === day ? { ...row, open_time: e.target.value } : row) })} /></label><label><span className="availability-sr-only">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]} until</span><input type="time" required value={h.close_time.slice(0, 5)} disabled={busy} onChange={e => setSettings({ ...settings, trading: settings.trading.map((row, i) => i === day ? { ...row, close_time: e.target.value } : row) })} /></label></>}</div>)}</fieldset>
        <p>Changing consultation length requires confirmation before existing appointments are updated.</p>
        <div className="availability-actions"><button type="button" onClick={() => { setSettings(null); setPendingSettings(null); }} disabled={busy}>Cancel</button><button className="availability-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
        {error && <div className="availability-error" role="alert">{error}</div>}
      </form>}
      </Dialog.Content></Dialog.Portal></Dialog.Root>
    </div>
    <div className="availability-toolbar">
      <div className="availability-date-navigation"><button aria-label="Previous week" onClick={() => setBase(addDays(base, -columns))}><ChevronLeft size={18} /></button><button className="availability-text-button" onClick={() => setBase(mondayOf(today))}>This week</button><button aria-label="Next week" onClick={() => setBase(addDays(base, columns))}><ChevronRight size={18} /></button></div>
      <label className="availability-date-jump">Go to date<input type="date" aria-label="Go to date" value={base} onChange={e => { if (validDate(e.target.value)) setBase(mondayOf(e.target.value)); }} /></label>
      <div className="availability-toolbar-actions"><button aria-label="Undo last change" disabled={!undo || undo.version !== schedule.version || busy} onClick={() => undo && void commit({ action: "restore", configuration: undo.configuration }, undo.version, "Last change undone.", true)}><RotateCcw size={15} />Undo</button><button className="availability-primary" disabled={busy} onClick={() => open("block", base < today ? today : base, "10:00", "10:30")}>Block time</button></div>
    </div>
    <p className="availability-hint">{compact ? "Tap a time to block it." : "Click a time to block it. Drag to select a longer time."}</p>
    <div className="availability-key" aria-label="Calendar key"><span><i className="availability-key-booked" />Booked</span><span><i className="availability-key-blocked" />Blocked</span><span><i className="availability-key-buffer" />Buffer between patients</span></div>
    {message && <div className="availability-message" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage("")}><X size={14} /></button></div>}
    {error && !editor && !settings && <div className="availability-error" role="alert">{error}{onRefresh && <button onClick={refreshCalendar}>Refresh calendar</button>}</div>}
    {warnings.length > 0 && <div className="availability-warning"><strong>{warnings.length} appointment{warnings.length === 1 ? " needs" : "s need"} attention</strong><button onClick={() => setReviewOpen(true)}>Review patients</button></div>}
    <Dialog.Root open={reviewOpen} onOpenChange={setReviewOpen}><Dialog.Portal><Dialog.Overlay className="availability-dialog-backdrop" /><Dialog.Content className="availability-dialog availability-review-dialog" onCloseAutoFocus={event => { event.preventDefault(); root.current?.querySelector<HTMLButtonElement>(".availability-warning button")?.focus({ preventScroll: true }); }}><div className="availability-dialog-title"><Dialog.Title>Patients to review</Dialog.Title><Dialog.Close aria-label="Close patient review"><X size={18} /></Dialog.Close></div><Dialog.Description>Contact these patients to arrange new times where needed. Appointment start times have not changed.</Dialog.Description><ul>{warnings.map(w => <li key={w.id}>{w.text}</li>)}</ul><div className="availability-actions"><Dialog.Close className="availability-primary">Done</Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <div className="availability-week-scroll"><div className="availability-week" style={{ "--availability-day-columns": `repeat(${columns},minmax(0,1fr))` } as CSSProperties}>
      <div className="availability-day-heads"><div className="availability-axis-corner" />{dates.map(date => {
        const h = effectiveHoursFor(asDate(date), schedule.trading, schedule.overrides, schedule.state);
        return <button key={date} aria-label={`Edit working hours for ${formatDay(date)}`} disabled={date < today || busy} onClick={() => hoursEditor(date)}><strong>{asDate(date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })}</strong><span>{h && !h.is_closed ? rangeLabel(hhmmToMin(h.open_time), hhmmToMin(h.close_time)) : "Blocked"} · Edit hours</span></button>;
      })}</div>
      <div className="availability-time-grid" style={{ height: (lastMinute - firstMinute) * scale }}>
        <div className="availability-axis" aria-hidden="true">{Array.from({ length: Math.ceil((lastMinute - firstMinute) / 30) }, (_, i) => { const minute = firstMinute + i * 30; return <span key={minute} className={minute % 60 === 0 ? "availability-hour-label" : "availability-half-hour-label"} style={{ top: i * 30 * scale }}>{calendarTimeLabel(minute)}</span>; })}</div>
        {dates.map(date => {
          const hours = effectiveHoursFor(asDate(date), schedule.trading, schedule.overrides, schedule.state);
          const working = hours && !hours.is_closed;
          const lastStart = working ? hhmmToMin(hours.open_time) + Math.floor((hhmmToMin(hours.close_time) - hhmmToMin(hours.open_time) - schedule.consultation_minutes) / (hours.consult_duration_mins || 15)) * (hours.consult_duration_mins || 15) : null;
          const booked = schedule.appointments.filter(a => a.appointment_date === date).sort((a, b) => hhmmToMin(a.appointment_time) - hhmmToMin(b.appointment_time));
          const layout = dayLayouts.find(day => day.date === date)!.layout;
          const laneStyle = (id: string): CSSProperties => { const item = layout.get(id)!; return { left: `calc(${item.lane * 100 / item.lanes}% + 5px)`, right: "auto", width: `calc(${100 / item.lanes}% - 10px)` }; };
          return <div className="availability-day" key={date} aria-label={formatDay(date)} onPointerDown={e => pointerDown(e, date)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; setDragPreview(null); }}>
            {working && <div className="availability-work" style={position(hhmmToMin(hours.open_time), hhmmToMin(hours.close_time))} />}
            {!working && <div className="availability-closed">Blocked</div>}
            {working && <>
              {hhmmToMin(hours.open_time) > firstMinute && <div className="availability-outside">Blocked</div>}
              {freeIntervals(schedule, date).flatMap(([start, end]) => Array.from({ length: Math.ceil((end - start) / 30) }, (_, i) => {
                const minute = start + i * 30, until = Math.min(minute + 30, end);
                return <button key={minute} className="availability-event availability-empty" style={position(minute, until)} data-minute={minute} data-until={until} aria-label={`Block time on ${formatDay(date)} at ${timeLabel(minute)}`} disabled={date < today || busy} onClick={() => { if (!suppressClick.current) open("block", date, minToHHMM(minute), minToHHMM(until)); }}><span>{calendarRangeLabel(minute, until)}</span></button>;
              }))}
              {blockedStartBands(schedule, date).map(([start, end]) => <div className="availability-event availability-before-block" key={start} style={position(start, end)} aria-label="Buffer before blocked time">{(end - start) * scale >= 30 && <strong>Buffer before blocked time</strong>}</div>)}
              {lastStart !== null && freeIntervals(schedule, date).map(([start, end]) => [Math.max(start, lastStart), Math.min(end, hhmmToMin(hours.close_time))]).filter(([start, end]) => end > start).map(([start, end]) => <div key={`closing:${start}`} className="availability-event availability-before-block availability-closing-buffer" style={position(start, end)} aria-label={`Last appointment: ${timeLabel(lastStart)}`}>{(end - start) * scale >= 30 && <strong>{lastStart < hhmmToMin(hours.open_time) ? "No appointment fits" : `Last appointment: ${timeLabel(lastStart)}`}</strong>}</div>)}
              {hhmmToMin(hours.close_time) < lastMinute && <button className="availability-finish" style={{ top: (hhmmToMin(hours.close_time) - firstMinute) * scale }} onClick={() => hoursEditor(date)} disabled={date < today || busy}>Finish work · {timeLabel(hhmmToMin(hours.close_time))}</button>}
            </>}
            {booked.map(a => {
              const from = hhmmToMin(a.appointment_time), until = from + appointmentDuration(a);
              return <div key={a.id}>
                <button className="availability-event availability-booked" style={{ ...position(from, until), ...laneStyle(`appointment:${a.id}`) }} aria-label={`${a.patient_name || "Booked patient"}, ${formatDay(date)} ${rangeLabel(from, until)}`} onClick={() => open("appointment", date, minToHHMM(from), minToHHMM(until), { patient: a.patient_name ?? undefined, minutes: appointmentDuration(a) })}><strong>{a.patient_name || "Booked patient"}</strong><span>{rangeLabel(from, until)}</span></button>

              </div>;
            })}
            {mergeCalendarBands(booked.flatMap(a => patientBufferBands(schedule, a))).map(([bufferStart, bufferEnd]) => <button key={`buffer:${bufferStart}`} className="availability-event availability-buffer" style={position(bufferStart, bufferEnd)} aria-label={`Buffer between patients ${rangeLabel(bufferStart, bufferEnd)}`} onClick={() => open("buffer", date, minToHHMM(bufferStart), minToHHMM(bufferEnd))}>{(bufferEnd - bufferStart) * scale >= 24 && <strong>Buffer between patients</strong>}{(bufferEnd - bufferStart) * scale >= 44 && <span>{rangeLabel(bufferStart, bufferEnd)}</span>}</button>)}
            {blocksForDate(asDate(date), schedule.blocks).map((block, i) => {
              const from = hhmmToMin(block.slot_start), until = hhmmToMin(block.slot_end);
              return <button key={block.id ?? i} className="availability-event availability-blocked" style={{ ...position(from, until), ...laneStyle(`block:${i}`) }} disabled={date < today || busy} aria-label={`Blocked ${formatDay(date)} ${rangeLabel(from, until)}. Edit or unblock.`} onClick={() => open("block", date, minToHHMM(from), minToHHMM(until), { id: block.id, recurring: block.is_recurring })}><strong>Blocked</strong>{(until - from) * scale >= 40 && <span>{rangeLabel(from, until)}</span>}</button>;
            })}
            {dragPreview?.date === date && <div className="availability-event availability-selection" style={position(dragPreview.from, dragPreview.to)}>{calendarRangeLabel(dragPreview.from, dragPreview.to)}</div>}
          </div>;
        })}
      </div>
    </div>
    </div>
    <Dialog.Root open={!!editor} onOpenChange={isOpen => { if (!isOpen && !busy) { setEditor(null); setError(""); } }}>
      <Dialog.Portal><Dialog.Overlay className="availability-dialog-backdrop" /><Dialog.Content className="availability-dialog" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}>
        {editor && <>
          <div className="availability-dialog-title"><Dialog.Title>{editor.kind === "hours" ? "Working hours" : editor.kind === "buffer" ? "Buffer between patients" : editor.kind === "appointment" ? "Booked consultation" : editor.id ? "Blocked" : "Block time"}</Dialog.Title><Dialog.Close disabled={busy} aria-label="Close editor"><X size={18} /></Dialog.Close></div>
          <Dialog.Description>{formatDay(editor.date)}</Dialog.Description>
          {editor.kind === "appointment" ? <><p>{editor.patient || "Booked patient"}</p><p>{rangeLabel(hhmmToMin(editor.start), hhmmToMin(editor.end))} · {editor.minutes} minutes</p><p className="availability-help">Appointment start times change only when you reschedule.</p><Dialog.Close>Close</Dialog.Close></> : editor.kind === "buffer" ? <><p>{rangeLabel(hhmmToMin(editor.start), hhmmToMin(editor.end))}</p><p className="availability-help">Added automatically between patients.</p><button onClick={() => { setEditor(null); setSettings({ duration: String(schedule.consultation_minutes), buffer: String(schedule.buffer_minutes), version: schedule.version, trading: Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, open_time: "09:00", close_time: "17:00", is_closed: day_of_week > 4, consult_duration_mins: 30, ...schedule.trading.find(h => h.day_of_week === day_of_week) })) }); root.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }}>Change buffer length</button></> : <ScheduleEditor key={`${editor.kind}:${editor.id ?? "new"}:${editor.date}`} editor={editor} schedule={schedule} busy={busy} error={error} onCancel={() => { setEditor(null); setError(""); }} onCommit={command => void commit(command, editor.version, command.action === "unblock" ? "Time unblocked." : editor.kind === "hours" ? "Working hours saved." : "Time blocked.")} onRefresh={onRefresh ? refreshCalendar : undefined} />}
        </>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </section>;
}

function ScheduleEditor({ editor, schedule, busy, error, onCancel, onCommit, onRefresh }: {
  editor: Editor; schedule: ClinicSchedule; busy: boolean; error: string;
  onCancel: () => void; onCommit: (command: ScheduleCommand) => void; onRefresh?: () => void;
}) {
  const [date, setDate] = useState(editor.date);
  const [start, setStart] = useState(editor.start);
  const [end, setEnd] = useState(editor.end);
  const [closed, setClosed] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [until, setUntil] = useState(addDays(editor.date, 28));
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [scope, setScope] = useState<"date" | "series">("date");
  const isHours = editor.kind === "hours";
  let command: ScheduleCommand | undefined, validation = "";
  try {
    if (!validDate(date)) throw new Error("Choose a date.");
    const dates = editor.id ? [date] : datesForEdit(date, weekdays, repeat ? until : undefined);
    command = isHours ? { action: "hours", dates, start, end, closed } : { action: "block", dates, start, end, id: editor.id, scope };
    applyScheduleCommand(schedule, command);
  } catch (failure) { validation = failure instanceof Error ? failure.message : "Check the selected times."; }
  function changeStart(value: string) {
    if (!isHours && end !== "24:00") {
      const length = hhmmToMin(end) - hhmmToMin(start), next = hhmmToMin(value);
      if (Number.isFinite(next) && length > 0) setEnd(minToHHMM(Math.min(1440, next + length)));
    }
    setStart(value);
  }
  return <form onSubmit={event => { event.preventDefault(); if (command && !validation) onCommit(command); }}>
    {!isHours && !editor.id && <label>Date<input type="date" value={date} min={sydneyTodayISO()} required onChange={e => setDate(e.target.value)} disabled={busy} /></label>}
    {isHours && <label className="availability-checkbox"><input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} disabled={busy} />Block the whole day</label>}
    {!closed && <div className="availability-time-inputs"><label>{isHours ? "Start work" : "From"}<input type="time" value={start} step={900} required onChange={e => changeStart(e.target.value)} disabled={busy} /></label><label>{isHours ? "Finish work" : "Until"}{end === "24:00" ? <div className="availability-end-day">End of day <button type="button" onClick={() => setEnd("23:45")} disabled={busy}>Change</button></div> : <input type="time" value={end} step={900} required onChange={e => setEnd(e.target.value)} disabled={busy} />}</label></div>}
    {!isHours && <div className="availability-shortcuts">{[{ label: "30 min", length: 30 }, { label: "1 hour", length: 60 }, { label: "Rest of day", length: 1440 }].map(option => <button type="button" key={option.label} disabled={busy} aria-pressed={option.length === 1440 ? end === "24:00" : end !== "24:00" && hhmmToMin(end) - hhmmToMin(start) === option.length} onClick={() => setEnd(option.length === 1440 ? "24:00" : minToHHMM(Math.min(1440, hhmmToMin(start) + option.length)))}>{option.label}</button>)}</div>}
    <p className="availability-help">{isHours ? "Appointments must finish before you finish work." : "Overlapping appointments are blocked automatically."}</p>
    {editor.recurring ? <label>Apply to<select value={scope} onChange={e => setScope(e.target.value as "date" | "series")} disabled={busy}><option value="date">Only this date</option><option value="series">All repeats</option></select></label> : !editor.id && <details className="availability-repeat"><summary>{isHours ? "Copy or repeat these hours" : "Repeat this block"}</summary>
      {isHours && <><p>Also use these hours on:</p><div className="availability-weekdays">{weekDays.map(day => <button type="button" key={day.n} disabled={busy || day.n === asDate(date).getDay()} aria-pressed={day.n === asDate(date).getDay() || weekdays.includes(day.n)} onClick={() => setWeekdays(weekdays.includes(day.n) ? weekdays.filter(n => n !== day.n) : [...weekdays, day.n])}>{day.label}</button>)}</div></>}
      <label className="availability-checkbox"><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} disabled={busy} />Repeat every week</label>
      {repeat && <label>Repeat until<input type="date" required min={date} max={addDays(date, 365)} value={until} onChange={e => setUntil(e.target.value)} disabled={busy} /></label>}
      <p className="availability-help">{isHours ? "Existing blocks and closed dates stay as they are." : "You can edit each repeated date separately."}</p>
    </details>}
    {(validation || error) && <div className="availability-error" role="alert">{validation || error}{error && onRefresh && <button type="button" onClick={onRefresh}>Refresh calendar</button>}</div>}
    <div className="availability-actions"><button type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="availability-primary" disabled={busy || !!validation}>{busy ? "Saving…" : isHours ? "Save working hours" : editor.id ? "Save changes" : "Block time"}</button></div>
    {editor.id && <button type="button" className="availability-unblock" disabled={busy} onClick={() => onCommit({ action: "unblock", id: editor.id!, date: editor.date, scope })}>{editor.recurring && scope === "series" ? "Unblock all repeats" : "Unblock this time"}</button>}
  </form>;
}
