import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import {
  Brain, MessageCircle, Stethoscope, Megaphone, GraduationCap, Sparkles,
  HandshakeIcon, DollarSign, ShieldCheck, Calendar as CalendarIcon,
  Check, AlertTriangle, Send, Search, X, ChevronDown, PhoneCall, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/hooks/useRealtimeSubscription";
import type { Json } from "@/integrations/supabase/types";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { toast } from "sonner";
import {
  sendLeadMms, listMmsImages, saveFinanceCheck,
  saveBooking, clearBooking, updateLeadStatus, ensureRepForEmail,
  saveCallNotes, discoveryToAmpAudio, findLeadByPhone,
  getCurrentRepSession, startRepSession, endRepSession,
} from "@/utils/sales-call.functions";
import { sendClinicHandoverEmail, sendDepositSmsToPatient, sendBookingConfirmationSms, sendManualSms, sendStandaloneDepositSms } from "@/utils/resend.functions";
import { stopRingback } from "@/utils/ringback";
import { generateSlots, holidayLabelFor, summarizeDay, ymdLocal, type TradingHours, type BlockedSlot, type ExistingAppt, type AvailabilityOverride } from "@/lib/slot-generation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChargeCardOverPhoneModal } from "@/components/ChargeCardOverPhoneModal";
import { openMessenger, setMessengerThread } from "@/hooks/useMessenger";
import { useConversation } from "@elevenlabs/react";
import { savePracticeCallRecording, enqueuePracticeCallSave } from "@/lib/practice-recordings.functions";
import { useCurrentRepId } from "@/hooks/useCurrentRepId";
import NorwoodPricingCalculator from "@/components/NorwoodPricingCalculator";
import {
  ATTEMPTS_PER_DAY, COLORS, SALES_CALL_LEAD_LIMIT, SALES_CALL_LEAD_SELECT,
  STATUS_OPTIONS, fmtShort, fmtTime, getTimeSlot, leadHasBookedSale,
  leadUrgency, localDateKey, normalisePhoneDigits, normaliseStatus,
  pipelineDay, rawPayloadObject, sameLocalDate, statusColor, statusMeta,
  type Clinic, type Lead, type LeadUrgency, type PartnerDoctor,
  type RawPayloadObject, type StatusKey,
} from "./logic";
import { Card, Eyebrow, Label, Pill, Coach, Section, NextBtn, RuleBad, RuleGood, StepHeading, ScriptBody, CalloutAmber, CalloutGreen, CompactRow, FormRow } from "./primitives";

export function BookingStep({ lead, discoveryNotes, onBooked, onDepositPaid, onBookedSaved, repId }: { lead: Lead; discoveryNotes: string; onBooked: () => void; onDepositPaid?: () => void; onBookedSaved?: (leadId: string, patch: Partial<Lead>) => void; repId?: string | null }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<PartnerDoctor[]>([]);
  const FORM_KEY = `booking_form_${lead.id}`;
  const defaultForm = {
    clinicId: lead.clinic_id ?? "",
    doctorId: "",
    gender: "",
    dob: "",
    healthFund: "",
    address: "",
    funding: lead.funding_preference ?? "Savings",
    date: "",
    time: "",
  };
  const [form, setForm] = useState<typeof defaultForm>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(FORM_KEY);
        if (saved) return { ...defaultForm, ...JSON.parse(saved) };
      }
    } catch { /* ignore */ }
    return defaultForm;
  });
  const [booked, setBooked] = useState(false);
  const [bookedData, setBookedData] = useState<{ date: string; time: string; clinicName: string; doctorName: string } | null>(null);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [sendingDeposit, setSendingDeposit] = useState(false);
  const [handoverSent, setHandoverSent] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [depositSent, setDepositSent] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [mustDoPrice, setMustDoPrice] = useState(false);
  const [mustDoFunding, setMustDoFunding] = useState(false);
  const [mustDoExpectations, setMustDoExpectations] = useState(false);
  const [confirmingDeposit, setConfirmingDeposit] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [patientSmsDraft, setPatientSmsDraft] = useState<{ body: string; phone: string; leadId: string } | null>(null);
  const [patientSmsCountdown, setPatientSmsCountdown] = useState(10);
  const [patientSmsSentPopup, setPatientSmsSentPopup] = useState<{ phone: string } | null>(null);
  const [patientSmsSentPopupDismissed, setPatientSmsSentPopupDismissed] = useState(false);
  const [patientSmsSending, setPatientSmsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIntel, setPreviewIntel] = useState("");
  const [refreshingIntel, setRefreshingIntel] = useState(false);
  const [previewFunding, setPreviewFunding] = useState("");
  const [previewFinance, setPreviewFinance] = useState("");
  const [previewDeposit, setPreviewDeposit] = useState(false);
  const [previewPhone, setPreviewPhone] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewClinicEmail, setPreviewClinicEmail] = useState("");
  const [intelStatus, setIntelStatus] = useState<"waiting" | "ready" | "timeout">("waiting");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [showManualNotes, setShowManualNotes] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [savingManualNotes, setSavingManualNotes] = useState(false);

  // Payment-link gate: rep must send link and Stripe must confirm payment
  // before "Book appointment" unlocks. Driven by meta_leads.deposit_paid_at
  // (set by Stripe webhook).
  const [paymentLinkSent, setPaymentLinkSent] = useState<boolean>(
    Boolean((lead as { deposit_link_sent_at?: string | null }).deposit_link_sent_at) ||
      Boolean((lead as { deposit_paid_at?: string | null }).deposit_paid_at),
  );
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [paymentReceivedAt, setPaymentReceivedAt] = useState<string | null>(
    (lead as { deposit_paid_at?: string | null }).deposit_paid_at ?? null,
  );
  useEffect(() => {
    setPaymentReceivedAt((lead as { deposit_paid_at?: string | null }).deposit_paid_at ?? null);
    // Persist "link sent" across refresh: check sms_messages for a prior
    // outbound deposit link for this lead.
    void (async () => {
      const { data: prior } = await supabase
        .from("sms_messages")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("direction", "outbound")
        .ilike("body", "%refundable consultation deposit%")
        .limit(1);
      if (prior && prior.length > 0) setPaymentLinkSent(true);
    })();
    const unsubscribeDeposit = subscribeRealtime(
      { table: "meta_leads", event: "UPDATE", filter: `id=eq.${lead.id}` },
      (payload) => {
        const row = payload.new as { deposit_paid_at?: string | null };
        if (row.deposit_paid_at) {
          setPaymentReceivedAt((prev) => {
            if (!prev) toast.success("💳 Payment confirmed — you can book now");
            return row.deposit_paid_at ?? prev;
          });
        }
      },
    );
    // Cross-component sync: when the right-side panel sends the deposit link,
    // it dispatches this event so step 10's "Send payment link" reflects sent.
    const onExternalSent = (e: Event) => {
      const detail = (e as CustomEvent<{ leadId?: string }>).detail;
      if (detail?.leadId === lead.id) setPaymentLinkSent(true);
    };
    window.addEventListener("lead-payment-link-sent", onExternalSent as EventListener);
    return () => {
      unsubscribeDeposit();
      window.removeEventListener("lead-payment-link-sent", onExternalSent as EventListener);
    };
  }, [lead.id]);

  const sendPaymentLink = async () => {
    if (!lead.phone) { toast.error("No phone number on this lead"); return; }
    const missing: string[] = [];
    if (!form.clinicId) missing.push("clinic");
    if (!form.gender) missing.push("gender");
    if (doctors.length > 0 && !form.doctorId) missing.push("doctor");
    if (!form.funding) missing.push("funding type");
    if (!form.date) missing.push("booking date");
    if (!form.time) missing.push("booking time");
    if (missing.length) {
      toast.error(`Fill in ${missing.join(", ")} before sending the payment link`);
      return;
    }
    if (sendingPaymentLink) return;
    setSendingPaymentLink(true);
    const selectedDoctor = doctors.find((d) => d.id === form.doctorId);
    const r = await sendStandaloneDepositSms({
      data: {
        leadId: lead.id,
        firstName: lead.first_name ?? "there",
        phone: lead.phone,
        clinicId: form.clinicId || lead.clinic_id || undefined,
        doctorName: selectedDoctor?.name || undefined,
      },
    });
    setSendingPaymentLink(false);
    if (r.success) {
      setPaymentLinkSent(true);
      window.dispatchEvent(new CustomEvent("lead-payment-link-sent", { detail: { leadId: lead.id } }));
      toast.success("Payment link sent — waiting for Stripe confirmation");
    } else {
      toast.error(r.error ?? "Failed to send payment link");
    }
  };

  useEffect(() => {
    if (!booked) return;
    if (lead.call_notes?.trim() || discoveryNotes?.trim()) {
      setIntelStatus("ready");
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 18; // 3 minutes at 10s intervals
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (stopped) return;
      attempts += 1;
      setPollAttempt(attempts);

      try {
        const { data, error } = await supabase
          .from("meta_leads")
          .select("call_notes")
          .eq("id", lead.id)
          .single();

        if (stopped) return;

        if (error) {
          setIntelStatus("timeout");
          toast.error("Could not check call intel — you can still send manually");
          return;
        }

        if (data?.call_notes?.trim()) {
          setIntelStatus("ready");
          setPreviewIntel(data.call_notes);
          toast.success("Patient intel ready ✓");
          return;
        }
      } catch {
        if (stopped) return;
        setIntelStatus("timeout");
        toast.error("Error checking call intel — you can still send manually");
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        if (!stopped) {
          setIntelStatus("timeout");
          setShowManualNotes(true);
        }
        return;
      }

      timer = setTimeout(poll, 10000);
    };

    // First poll after 15 seconds to give Twilio time to process
    const initialTimer = setTimeout(poll, 15000);

    return () => {
      stopped = true;
      clearTimeout(initialTimer);
      if (timer) clearTimeout(timer);
    };
  }, [booked, lead.id]);

  useEffect(() => {
    void supabase.from("partner_clinics")
      .select("id, clinic_name, address, city, state, email, consult_price_original, consult_price_deposit, parking_info, nearby_landmarks")
      .eq("is_active", true)
      .then(({ data }) => setClinics((data ?? []) as Clinic[]));
  }, []);

  // Load doctors for the selected clinic
  useEffect(() => {
    if (!form.clinicId) { setDoctors([]); return; }
    void supabase.from("partner_doctors")
      .select("id, clinic_id, name, title, years_experience, specialties, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included")
      .eq("clinic_id", form.clinicId)
      .eq("is_active", true)
      .order("created_at")
      .then(({ data }) => {
        const list = (data ?? []) as PartnerDoctor[];
        setDoctors(list);
        // Only auto-select when there's exactly one doctor — otherwise force the rep to pick.
        if (!form.doctorId && list.length === 1) {
          setForm((f) => ({ ...f, doctorId: list[0].id }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.clinicId]);
  const set = (k: keyof typeof form, v: string) => {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(FORM_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  // Restore booked state if this lead already has a saved booking (rep navigated away and came back)
  useEffect(() => {
    if (lead.booking_date && lead.booking_time && !booked) {
      // Wait until clinics + doctors have loaded so we don't bake placeholder
      // strings ("[CLINIC NAME — fill in before sending]") into bookedData.
      if (clinics.length === 0) return;
      const selectedClinic = clinics.find((c) => c.id === form.clinicId);
      const selectedDoctor = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
      // If a clinic is selected but its doctors haven't loaded yet, wait.
      if (form.clinicId && doctors.length === 0) return;
      setBookedData({
        date: lead.booking_date,
        time: lead.booking_time,
        clinicName: selectedClinic?.clinic_name ?? "[CLINIC NAME — fill in before sending]",
        doctorName: selectedDoctor?.name ?? "[DOCTOR NAME — fill in before sending]",
      });
      setBooked(true);
    }
    if (
      Boolean((lead as { deposit_paid_at?: string | null }).deposit_paid_at) ||
      Boolean((lead as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id) ||
      Boolean(lead.status && lead.status.toLowerCase().includes("deposit_paid"))
    ) {
      setDepositPaid(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.booking_date, lead.booking_time, clinics, doctors]);
  const clinic = clinics.find((c) => c.id === form.clinicId);
  const selectedDoctor = doctors.find((d) => d.id === form.doctorId) ?? doctors[0] ?? null;

  const saveManualNotes = async () => {
    if (!manualNotes.trim()) return;
    setSavingManualNotes(true);
    try {
      await supabase
        .from("meta_leads")
        .update({ call_notes: manualNotes.trim(), updated_at: new Date().toISOString() })
        .eq("id", lead.id);
      setPreviewIntel(manualNotes.trim());
      setIntelStatus("ready");
      setShowManualNotes(false);
      toast.success("Notes saved ✓");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingManualNotes(false);
    }
  };

  const book = async () => {
    if (!form.date || !form.time) { toast.error("Pick a date and time"); return; }
    if (form.clinicId) {
      // Validate against new trading hours + blocked slots system
      const [{ data: th }, { data: bs }, { data: ex }, { data: ov }, { data: pc }] = await Promise.all([
        supabase.from("clinic_trading_hours").select("day_of_week, open_time, close_time, is_closed, consult_duration_mins").eq("clinic_id", form.clinicId),
        supabase.from("clinic_blocked_slots").select("id, slot_date, slot_start, slot_end, is_recurring, recur_day_of_week, recur_pattern, recur_days_of_week, recur_day_of_month, recur_nth_week, recur_until").eq("clinic_id", form.clinicId),
        supabase.from("clinic_appointments").select("appointment_date, appointment_time").eq("clinic_id", form.clinicId).eq("appointment_date", form.date),
        supabase.from("clinic_availability").select("override_date, override_type, start_time, end_time").eq("clinic_id", form.clinicId),
        supabase.from("partner_clinics").select("state").eq("id", form.clinicId).maybeSingle(),
      ]);
      const [yy, mm, dd] = form.date.split("-").map(Number);
      const dateObj = new Date(yy, mm - 1, dd);
      const clinicState = (pc as { state?: string | null } | null)?.state ?? null;
      const slots = generateSlots(dateObj, (th ?? []) as TradingHours[], (bs ?? []) as BlockedSlot[], (ex ?? []) as ExistingAppt[], (ov ?? []) as AvailabilityOverride[], clinicState);
      const target = slots.find((s) => s.time === form.time || s.time === form.time.slice(0, 5));
      if (!target || !target.available) {
        toast.error("That time is not available — pick another slot.");
        return;
      }
    }
    const r = await saveBooking({ data: { leadId: lead.id, clinicId: form.clinicId || null, date: form.date, time: form.time, repId: repId ?? null } });
    if (r.success) {
      const selectedClinic = clinics.find((c) => c.id === form.clinicId);
      const sd = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
      const clinicName = selectedClinic?.clinic_name ?? "[CLINIC NAME — fill in before sending]";
      const doctorName = sd?.name ?? "[DOCTOR NAME — fill in before sending]";
      setBookedData({ date: form.date, time: form.time, clinicName, doctorName });
      setBooked(true);
      const statusResult = await updateLeadStatus({ data: { leadId: lead.id, status: "booked_deposit_paid" } });
      if (!statusResult.success) {
        toast.error(statusResult.error || "Booked, but couldn’t update lead status — refresh before moving on.");
        return;
      }
      const bookingPatch: Partial<Lead> = {
        booking_date: form.date,
        booking_time: form.time,
        clinic_id: form.clinicId || null,
        status: "booked_deposit_paid",
      };

      // FIRE CONFIRMATION SMS IMMEDIATELY (before navigating to next lead).
      // Previously this ran via a 5s countdown popup that often got unmounted
      // by onBooked()/screen-swap, killing the timer and silently dropping
      // the SMS (e.g. Wisam — see chat history). Now we send fire-and-forget
      // on the server so it can't be cancelled by a re-render.
      if (lead.phone) {
        const sd = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
        const selectedClinic = clinics.find((c) => c.id === form.clinicId);
        const dateStr = (() => {
          try {
            const d = new Date(`${form.date}T${form.time}`);
            return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
          } catch { return form.date; }
        })();
        const timeStr = (() => {
          try {
            const [h, m] = form.time.split(":");
            const hh = parseInt(h, 10);
            const ampm = hh >= 12 ? "PM" : "AM";
            const hour12 = hh % 12 === 0 ? 12 : hh % 12;
            return `${hour12}:${m} ${ampm}`;
          } catch { return form.time; }
        })();
        const doctorNameClean = (sd?.name ?? "").replace(/^\s*(Dr\.?|Doctor)\s+/i, "");
        const smsBody = `Hi ${lead.first_name ?? "there"}, your hair transplant consultation is confirmed for ${dateStr} at ${timeStr} with Dr ${doctorNameClean} at ${selectedClinic?.clinic_name ?? ""}. Address: ${selectedClinic?.address ?? ""}, ${selectedClinic?.city ?? ""} ${selectedClinic?.state ?? ""}.`;
        const phoneCapture = lead.phone;
        const leadIdCapture = lead.id;
        // Fire-and-forget — do NOT await; survives unmount because the
        // network request is already in-flight on the server.
        void sendManualSms({ data: { leadId: leadIdCapture, phone: phoneCapture, body: smsBody } })
          .then((sres) => {
            if (sres.success) {
              setConfirmationSent(true);
              setPatientSmsSentPopup({ phone: phoneCapture });
              setPatientSmsSentPopupDismissed(false);
              toast.success("Patient confirmation SMS sent ✓");
            } else {
              toast.error(`Patient SMS failed: ${sres.error ?? "unknown"} — resend manually from the inbox.`);
            }
          })
          .catch((e) => {
            console.error("[book] patient SMS failed", e);
            toast.error("Patient SMS failed to send — resend manually from the inbox.");
          });
        // Optimistically show the "sent" pill so the rep sees confirmation
        // even if the screen swaps to the next lead immediately.
        setConfirmationSent(true);
      }

      onBookedSaved?.(lead.id, bookingPatch);
      onBooked();
      toast.success("Appointment booked!");

      // NOTE: appointment reminders are NOT created here. They are created
      // only once the deposit is confirmed (handleConfirmDepositPaid below),
      // because no-deposit bookings are unreliable and shouldn't trigger SMS
      // reminders or appear on the Booked Appointments dashboard.

      // Clear persisted form draft now that booking is saved
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(FORM_KEY);
      } catch { /* ignore */ }
    } else {
      toast.error(r.error);
    }
  };

  const handleSendHandover = async () => {
    if (!bookedData) return;
    setSendingHandover(true);
    const selectedClinic = clinics.find((c) => c.id === form.clinicId);
    const r = await sendClinicHandoverEmail({
      data: {
        leadId: lead.id,
        clinicId: form.clinicId || lead.clinic_id || null,
        firstName: lead.first_name ?? "",
        lastName: lead.last_name ?? "",
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        callNotes: discoveryNotes || lead.call_notes || "",
        fundingPreference: lead.funding_preference ?? form.funding,
        financeEligible: lead.finance_eligible ?? null,
        bookingDate: bookedData.date,
        bookingTime: bookedData.time,
        clinicName: bookedData.clinicName,
        clinicEmail: (selectedClinic as { email?: string | null } | undefined)?.email ?? null,
        doctorName: bookedData.doctorName,
        depositPaid: Boolean(paymentReceivedAt) || depositPaid || depositSent,
      },
    });
    setSendingHandover(false);
    if (r.success) {
      const handoverSentAt = new Date().toISOString();
      setHandoverSent(true);
      onBookedSaved?.(lead.id, {
        handover_sent_at: handoverSentAt,
        ...(paymentReceivedAt || depositPaid || depositSent ? { status: "booked_deposit_paid" } : {}),
      });
      toast.success("Clinic handover email sent ✓");
    }
    else toast.error(`Handover failed: ${r.error}`);
  };

  const handleSendDeposit = async () => {
    if (!bookedData || !lead.phone) { toast.error("No phone number on this lead"); return; }
    setSendingDeposit(true);
    const r = await sendDepositSmsToPatient({
      data: {
        leadId: lead.id,
        firstName: lead.first_name ?? "there",
        phone: lead.phone,
        clinicName: bookedData.clinicName,
        doctorName: bookedData.doctorName,
        bookingDate: bookedData.date,
        bookingTime: bookedData.time,
      },
    });
    setSendingDeposit(false);
    if (r.success) setDepositSent(true);
  };

  const handleConfirmDepositPaid = async () => {
    if (confirmingDeposit || depositPaid) return;
    setConfirmingDeposit(true);
    const r = await updateLeadStatus({ data: { leadId: lead.id, status: "booked_deposit_paid" } });
    setConfirmingDeposit(false);
    if (r.success) {
      setDepositPaid(true);
      (lead as { status: string | null }).status = "booked_deposit_paid";
      toast.success("Deposit confirmed — lead marked as paid ✓");

      // Now that the deposit is paid, create / refresh the appointment
      // reminder row so the SMS cron can pick it up and it appears on the
      // Booked Appointments dashboard.
      try {
        const date = bookedData?.date ?? lead.booking_date ?? null;
        const time = bookedData?.time ?? lead.booking_time ?? null;
        if (date && time) {
          const sd = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
          const doctorName = bookedData?.doctorName ?? sd?.name ?? null;
          console.log("[appointment_reminders] doctor_name to insert:", doctorName);
          const payload = {
            lead_id: lead.id,
            booking_date: date,
            booking_time: time,
            doctor_name: doctorName,
            patient_first_name: lead.first_name ?? null,
            patient_last_name: lead.last_name ?? null,
            patient_phone: lead.phone ?? null,
            status: "confirmed",
          };
          const { data: existing } = await supabase
            .from("appointment_reminders")
            .select("id")
            .eq("lead_id", lead.id)
            .order("created_at", { ascending: false })
            .limit(1);
          if (existing && existing.length > 0) {
            await supabase
              .from("appointment_reminders")
              .update({
                ...payload,
                three_day_sms_sent: false,
                three_day_sms_sent_at: null,
                twentyfour_hour_sms_sent: false,
                twentyfour_hour_sms_sent_at: null,
              })
              .eq("id", existing[0].id);
          } else {
            await supabase.from("appointment_reminders").insert(payload);
          }

          // Mirror into clinic_appointments so the partner clinic portal sees it.
          const appointmentClinicId = form.clinicId || lead.clinic_id;
          if (appointmentClinicId) {
            const patientName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Patient";
            // Pull deposit info off the lead so a manual card-over-phone charge
            // (which writes payment_intent_id to meta_leads BEFORE the appointment
            // row exists) is carried onto the appointment. Without this, the
            // "Showed up / Proceeded" refund button can't refund the card
            // automatically and the rep has to log a manual refund.
            const { data: leadDepositRow } = await supabase
              .from("meta_leads")
              .select("stripe_payment_intent_id, deposit_amount")
              .eq("id", lead.id)
              .maybeSingle();
            const { data: existingClinicAppt } = await supabase
              .from("clinic_appointments")
              .select("id, intel_notes, stripe_payment_intent_id, deposit_amount")
              .eq("lead_id", lead.id)
              .limit(1);
            const clinicPayloadBase: any = {
              clinic_id: appointmentClinicId,
              lead_id: lead.id,
              patient_name: patientName,
              patient_phone: lead.phone ?? null,
              appointment_date: date,
              appointment_time: time,
            };
            if (leadDepositRow?.stripe_payment_intent_id) clinicPayloadBase.stripe_payment_intent_id = leadDepositRow.stripe_payment_intent_id;
            if (leadDepositRow?.deposit_amount != null) clinicPayloadBase.deposit_amount = leadDepositRow.deposit_amount;
            if (existingClinicAppt && existingClinicAppt.length > 0) {
              // Don't overwrite deposit fields already set on the appointment.
              if (existingClinicAppt[0].stripe_payment_intent_id) delete clinicPayloadBase.stripe_payment_intent_id;
              if (existingClinicAppt[0].deposit_amount != null) delete clinicPayloadBase.deposit_amount;
              // Do not overwrite the handover email snapshot. The clinic portal
              // intel must stay exactly as sent in the handover email.
              await supabase.from("clinic_appointments").update(clinicPayloadBase).eq("id", existingClinicAppt[0].id);
            } else {
              // Upsert on lead_id — DB unique index prevents race-condition duplicates.
              await supabase
                .from("clinic_appointments")
                .upsert({ ...clinicPayloadBase, intel_notes: null }, { onConflict: "lead_id" });
            }
          }
        }
      } catch (e) {
        console.error("[appointment_reminders] insert failed", e);
      }
      onDepositPaid?.();
    } else {
      toast.error(`Could not confirm deposit: ${r.error ?? "unknown error"}`);
    }
  };

  const handleUndoDepositPaid = async () => {
    if (confirmingDeposit) return;
    setConfirmingDeposit(true);
    const r = await updateLeadStatus({ data: { leadId: lead.id, status: "booked_no_deposit" } });
    setConfirmingDeposit(false);
    if (r.success) {
      setDepositPaid(false);
      (lead as { status: string | null }).status = "booked_no_deposit";
      toast.success("Deposit confirmation undone");

      // Pull the appointment back off the Booked Appointments dashboard —
      // no-deposit bookings shouldn't appear there.
      try {
        await supabase
          .from("appointment_reminders")
          .update({ status: "cancelled" })
          .eq("lead_id", lead.id)
          .eq("status", "confirmed");
        await supabase.from("clinic_appointments").delete().eq("lead_id", lead.id);
      } catch (e) {
        console.error("[appointment_reminders] undo-cancel failed", e);
      }
    } else {
      toast.error(`Could not undo: ${r.error ?? "unknown error"}`);
    }
  };

  // Send the patient confirmation SMS (called by countdown timeout OR Send button)
  const firePatientSms = useCallback(async () => {
    if (!patientSmsDraft || patientSmsSending) return;
    setPatientSmsSending(true);
    const { body, phone, leadId } = patientSmsDraft;
    const sres = await sendManualSms({ data: { leadId, phone, body } });
    setPatientSmsSending(false);
    setPatientSmsDraft(null);
    if (sres.success) {
      setConfirmationSent(true);
      setPatientSmsSentPopup({ phone });
      setPatientSmsSentPopupDismissed(false);
      toast.success("Patient SMS sent ✓");
    } else {
      toast.error(`SMS failed: ${sres.error}`);
    }
  }, [patientSmsDraft, patientSmsSending]);

  // 10-second countdown that auto-fires the SMS when modal is open
  useEffect(() => {
    if (!patientSmsDraft) return;
    if (patientSmsCountdown <= 0) {
      firePatientSms();
      return;
    }
    const t = setTimeout(() => setPatientSmsCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [patientSmsDraft, patientSmsCountdown, firePatientSms]);

  const patientSmsSentPopupNode = confirmationSent && !patientSmsSentPopupDismissed ? (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(17,17,17,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10001, padding: 16, backdropFilter: "blur(4px)",
      }}
      onClick={() => setPatientSmsSentPopupDismissed(true)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, maxWidth: 400, width: "100%",
          padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center",
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: "50%", background: "#10b981",
          color: "#fff", fontSize: 28, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 6 }}>
          Patient SMS sent
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
          Confirmation text delivered to {patientSmsSentPopup?.phone ?? lead.phone ?? "the patient"}
        </div>
        <button
          onClick={() => setPatientSmsSentPopupDismissed(true)}
          style={{
            background: "#111", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  ) : null;

  const patientSmsDraftPopupNode = patientSmsDraft ? (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(17,17,17,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: 16, backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, maxWidth: 480, width: "100%",
          padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ea580c", marginBottom: 8 }}>
          Sending in {patientSmsCountdown}s…
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>
          Confirmation text to {patientSmsDraft.phone}
        </div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>
          The patient will receive this SMS automatically when the timer hits 0.
        </div>
        <div
          style={{
            background: "#f8f8f8", border: "0.5px solid #e5e5e5", borderRadius: 10,
            padding: 14, fontSize: 13, lineHeight: 1.5, color: "#222",
            whiteSpace: "pre-wrap", marginBottom: 18, maxHeight: 220, overflowY: "auto",
          }}
        >
          {patientSmsDraft.body}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => { setPatientSmsDraft(null); toast.message("Patient SMS cancelled"); }}
            disabled={patientSmsSending}
            style={{
              background: "#fff", color: "#111", border: "0.5px solid #d4d4d4",
              borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500,
              cursor: patientSmsSending ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={firePatientSms}
            disabled={patientSmsSending}
            style={{
              background: "#ea580c", color: "#fff", border: "none",
              borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
              cursor: patientSmsSending ? "not-allowed" : "pointer",
            }}
          >
            {patientSmsSending ? "Sending…" : "Send now"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const openPreview = async () => {
    const { data: freshLead } = await supabase
      .from("meta_leads")
      .select("call_notes, funding_preference, finance_eligible, phone, email, status, deposit_paid_at, stripe_payment_intent_id")
      .eq("id", lead.id)
      .single();

    const { data: freshAppointment } = await supabase
      .from("clinic_appointments")
      .select("stripe_payment_intent_id")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setPreviewIntel(freshLead?.call_notes?.trim() || discoveryNotes?.trim() || "");
    setPreviewFunding(freshLead?.funding_preference || form.funding || lead.funding_preference || "");
    setPreviewFinance("Yes");
    // Deposit is paid when Stripe has actually confirmed it, even though the
    // webhook deliberately does NOT auto-change the lead status.
    const statusImpliesDeposit = (freshLead?.status || "").toLowerCase().includes("deposit_paid");
    setPreviewDeposit(
      Boolean(freshLead?.deposit_paid_at) ||
      Boolean(freshLead?.stripe_payment_intent_id) ||
      Boolean(freshAppointment?.stripe_payment_intent_id) ||
      Boolean(paymentReceivedAt) ||
      depositPaid ||
      depositSent ||
      statusImpliesDeposit,
    );
    setPreviewPhone(freshLead?.phone || lead.phone || "");
    setPreviewEmail(freshLead?.email || lead.email || "");
    const sc = clinics.find((c) => c.id === form.clinicId) as (Clinic & { email?: string | null }) | undefined;
    // Sandbox override: test leads always route to Peter's inbox (mirrors server-side override in resend.functions.ts).
    const SANDBOX_LEAD_IDS = new Set([
      "5e70f557-73ce-4bb7-a11a-6b718dbd092f",
      "b2828129-1c28-4502-927a-11f43a0a8473",
    ]);
    setPreviewClinicEmail(
      SANDBOX_LEAD_IDS.has(lead.id) ? "petersemrany1@gmail.com" : (sc?.email || "peter@gobold.com.au")
    );
    setShowPreview(true);
  };

  const confirmAndSend = async () => {
    const clinicEmail = (previewClinicEmail.trim() || "peter@gobold.com.au");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clinicEmail)) {
      toast.error("Enter a valid clinic email before sending.");
      return;
    }
    // Resolve clinic/doctor names with fallback to current form selection so
    // stale placeholder strings in bookedData don't block the send.
    const selectedClinic = clinics.find((c) => c.id === form.clinicId);
    const selectedDoctor = doctors.find((d) => d.id === form.doctorId) ?? doctors[0];
    const resolvedClinicName =
      bookedData?.clinicName && !bookedData.clinicName.startsWith("[CLINIC NAME")
        ? bookedData.clinicName
        : (selectedClinic?.clinic_name ?? "");
    const resolvedDoctorName =
      bookedData?.doctorName && !bookedData.doctorName.startsWith("[DOCTOR NAME")
        ? bookedData.doctorName
        : (selectedDoctor?.name ?? "");
    if (!resolvedClinicName || !resolvedDoctorName) {
      toast.error("Clinic or doctor info missing — pick them in Step 10 and try again.");
      return;
    }
    setShowPreview(false);
    setSendingHandover(true);
    try {
      const r = await sendClinicHandoverEmail({
        data: {
          leadId: lead.id,
          clinicId: form.clinicId || lead.clinic_id || null,
          firstName: lead.first_name ?? "",
          lastName: lead.last_name ?? "",
          email: previewEmail || null,
          phone: previewPhone || null,
          callNotes: previewIntel,
          fundingPreference: previewFunding,
          financeEligible: true,
          bookingDate: bookedData?.date ?? "",
          bookingTime: bookedData?.time ?? "",
          clinicName: resolvedClinicName,
          clinicEmail,
          doctorName: resolvedDoctorName,
          depositPaid: previewDeposit,
        },
      });
      setSendingHandover(false);
      if (r.success) {
        const handoverSentAt = new Date().toISOString();
        setHandoverSent(true);
        onBookedSaved?.(lead.id, {
          handover_sent_at: handoverSentAt,
          ...(previewDeposit ? { status: "booked_deposit_paid" } : {}),
        });
        toast.success("Clinic handover email sent ✓");
      }
      else toast.error(`Handover failed: ${r.error ?? "unknown error"}`);
    } catch (err) {
      setSendingHandover(false);
      toast.error(`Handover failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (booked && bookedData) {
    const bookingDisplay = (() => {
      try {
        const d = new Date(`${bookedData.date}T${bookedData.time}`);
        return d.toLocaleString("en-AU", {
          weekday: "long", day: "numeric", month: "long",
          hour: "numeric", minute: "2-digit",
        });
      } catch { return `${bookedData.date} at ${bookedData.time}`; }
    })();

    const handleResetBooking = async () => {
      setResetting(true);
      const r = await clearBooking({ data: { leadId: lead.id } });
      if (!r.success) {
        setResetting(false);
        toast.error(`Reset failed: ${r.error}`);
        return;
      }
      try {
        await supabase
          .from("appointment_reminders")
          .update({ status: "cancelled" })
          .eq("lead_id", lead.id)
          .eq("status", "confirmed");
        await supabase.from("clinic_appointments").delete().eq("lead_id", lead.id);
      } catch (e) { console.error("[appointment_reminders] cancel failed", e); }
      // Mutate the lead prop so the restore-effect doesn't re-trigger when
      // the rep navigates away and comes back to this lead.
      (lead as { booking_date: string | null }).booking_date = null;
      (lead as { booking_time: string | null }).booking_time = null;
      setBooked(false);
      setBookedData(null);
      setHandoverSent(false);
      setDepositSent(false);
      setDepositPaid(false);
      setSendingHandover(false);
      setConfirmationSent(false);
      setPatientSmsSentPopup(null);
      setPatientSmsSentPopupDismissed(false);
      setSendingDeposit(false);
      setIntelStatus("waiting");
      setPollAttempt(0);
      setShowResetConfirm(false);
      setResetting(false);
      toast.success("Booking permanently cleared — fresh slate");
    };

    return (
      <div className="max-w-2xl mx-auto">
        <Eyebrow>Step 10 — Deposit & Book</Eyebrow>
        <StepHeading>Booked!</StepHeading>

        {/* Confirmation card */}
        <div style={{
          background: "#ffffff",
          border: `0.5px solid ${COLORS.line}`,
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
          marginBottom: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: COLORS.green,
            color: "#fff", fontSize: 24, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
            {[lead.first_name, lead.last_name].filter(Boolean).join(" ")}
          </div>
          <div style={{ fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
            {bookingDisplay}
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 14 }}>
            with {bookedData.doctorName} · {bookedData.clinicName}
          </div>
          {/* Patient SMS status pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 500,
            padding: "4px 10px", borderRadius: 999,
            background: confirmationSent ? "#ecfdf5" : "#fff7ed",
            color: confirmationSent ? COLORS.green : COLORS.amberDark,
            border: `0.5px solid ${confirmationSent ? COLORS.green : COLORS.amber}`,
          }}>
            <span>{confirmationSent ? "✓" : "📱"}</span>
            <span>{confirmationSent ? "Patient SMS sent" : "Patient SMS queued (5s)"}</span>
          </div>
        </div>

        {/* MUST DO'S — before you hang up */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{
              background: COLORS.red,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
              MUST DO'S
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Before you hang up
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { label: "Quoted them an accurate price range", checked: mustDoPrice, set: setMustDoPrice },
              { label: "Discussed how they plan to fund it", checked: mustDoFunding, set: setMustDoFunding },
              { label: "Set realistic expectations about results", checked: mustDoExpectations, set: setMustDoExpectations, muted: " — if Norwood 6/7" },
            ].map((item) => (
              <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={(e) => { e.preventDefault(); item.set(!item.checked); }}
                  style={{
                    width: 16, height: 16, borderRadius: 3,
                    border: `1.5px solid ${item.checked ? COLORS.green : "#d1d5db"}`,
                    background: item.checked ? COLORS.green : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 2, cursor: "pointer",
                  }}
                >
                  {item.checked && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.4 }}>
                  {item.label}
                  {item.muted && <span style={{ color: "#9ca3af" }}>{item.muted}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Single handover card */}
        <div className="flex flex-col gap-2.5">
          {/* Manual notes fallback when no recording was detected */}
          {showManualNotes && !handoverSent && (
            <div style={{
              background: "#fffbeb",
              border: `0.5px solid ${COLORS.amber}`,
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.amberDark, marginBottom: 8 }}>
                ⚠️ No recording detected — type your notes while they're fresh
              </div>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={4}
                placeholder="What did they tell you? Pain points, motivation, budget, timeline..."
                className="w-full rounded-[6px] outline-none"
                style={{
                  background: "#ffffff",
                  border: `0.5px solid ${COLORS.line}`,
                  color: "#111",
                  fontSize: 14,
                  lineHeight: 1.6,
                  padding: "10px 12px",
                  resize: "vertical",
                  marginBottom: 10,
                }}
              />
              <button
                onClick={() => void saveManualNotes()}
                disabled={savingManualNotes || !manualNotes.trim()}
                style={{
                  background: COLORS.coral,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  opacity: savingManualNotes || !manualNotes.trim() ? 0.5 : 1,
                  cursor: savingManualNotes || !manualNotes.trim() ? "default" : "pointer",
                }}
              >
                {savingManualNotes ? "Saving..." : "Save notes →"}
              </button>
            </div>
          )}

          {/* Unified card: analysing state OR send handover button */}
          {intelStatus === "waiting" ? (
            <div
              className="w-full rounded-[8px] flex items-center gap-3"
              style={{
                background: "#fffbeb",
                border: `0.5px solid ${COLORS.amber}`,
                padding: "18px 20px",
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                border: `2px solid ${COLORS.amber}`, borderTopColor: "transparent",
                animation: "discoverySpin 0.8s linear infinite", flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.amberDark, marginBottom: 2 }}>
                  Please wait to send handover video
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Analysing call recording ({pollAttempt}/18)
                </div>
              </div>
              <button
                onClick={() => setIntelStatus("timeout")}
                style={{ fontSize: 12, color: "#888", textDecoration: "underline", background: "transparent", flexShrink: 0 }}
              >
                Skip
              </button>
            </div>
          ) : (
            <button
              onClick={() => void openPreview()}
              disabled={sendingHandover}
              className="w-full rounded-[8px] flex items-center justify-between"
              style={{
                background: handoverSent ? "#ecfdf5" : "#ffffff",
                border: `0.5px solid ${handoverSent ? COLORS.green : COLORS.line}`,
                padding: "16px 20px",
                cursor: sendingHandover ? "wait" : "pointer",
                opacity: sendingHandover ? 0.7 : 1,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: handoverSent ? COLORS.green : COLORS.text, marginBottom: 2 }}>
                  {handoverSent ? "✓ Handover sent to clinic" : "Send handover to clinic"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  {handoverSent
                    ? "Tap to review what was sent or resend with updates"
                    : "Patient intel, funding, booking details → peter@gobold.com.au"}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: handoverSent ? COLORS.green : COLORS.coral, flexShrink: 0, marginLeft: 12 }}>
                {sendingHandover ? "Sending…" : handoverSent ? "View →" : "Send →"}
              </div>
            </button>
          )}

          {/* Patient confirmation SMS auto-fires on Book appointment (with 5s Undo).
              Status is shown as a pill in the confirmation card above. */}
          {confirmationSent === false && intelStatus !== "waiting" && lead.phone && (
            <button
              onClick={() => {
                if (!lead.phone) return;
                setShowConfirmModal(true);
              }}
              disabled={sendingConfirmation}
              style={{
                fontSize: 12, color: COLORS.muted, background: "transparent",
                textAlign: "left", padding: "4px 4px", marginTop: 2,
                textDecoration: "underline", alignSelf: "flex-start",
                cursor: sendingConfirmation ? "wait" : "pointer",
              }}
            >
              Resend patient SMS manually
            </button>
          )}

          {/* Reset */}
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 mt-3 self-start"
            style={{
              fontSize: 13, fontWeight: 500, color: COLORS.coral,
              background: "transparent", border: "none", padding: "6px 4px",
              cursor: resetting ? "wait" : "pointer",
              opacity: resetting ? 0.7 : 1,
            }}
          >
            <RotateCcw size={14} />
            {resetting ? "Resetting…" : "Reset"}
          </button>
        </div>

        {/* Confirmation preview modal */}
        {showConfirmModal && (() => {
          const dateStr = (() => {
            try {
              const d = new Date(`${bookedData?.date}T${bookedData?.time}`);
              return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
            } catch { return bookedData?.date ?? ""; }
          })();
          const timeStr = (() => {
            try {
              const [h, m] = (bookedData?.time ?? "").split(":");
              const hh = parseInt(h, 10);
              const ampm = hh >= 12 ? "PM" : "AM";
              const hour12 = hh % 12 === 0 ? 12 : hh % 12;
              return `${hour12}:${m} ${ampm}`;
            } catch { return bookedData?.time ?? ""; }
          })();
          const doctorNameClean = (selectedDoctor?.name ?? "").replace(/^\s*(Dr\.?|Doctor)\s+/i, "");
          const message = `Hi ${lead.first_name ?? "there"}, your hair transplant consultation is confirmed for ${dateStr} at ${timeStr} with Dr ${doctorNameClean} at ${clinic?.clinic_name ?? ""}. Address: ${clinic?.address ?? ""}, ${clinic?.city ?? ""} ${clinic?.state ?? ""}.`;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => !sendingConfirmation && setShowConfirmModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-[12px]"
                style={{ background: "#ffffff", padding: 24 }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Confirm before sending</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
                  This SMS will be sent to {lead.phone}
                </div>
                <div style={{
                  background: "#f7f7f5", border: `0.5px solid ${COLORS.line}`,
                  borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.5,
                  color: COLORS.text, whiteSpace: "pre-wrap", marginBottom: 20,
                }}>
                  {message}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    disabled={sendingConfirmation}
                    style={{
                      fontSize: 13, padding: "8px 14px", borderRadius: 8,
                      background: "#fff", border: `0.5px solid ${COLORS.line}`,
                      cursor: sendingConfirmation ? "wait" : "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!lead.phone) return;
                      setSendingConfirmation(true);
                      const r = await sendManualSms({ data: { leadId: lead.id, phone: lead.phone, body: message } });
                      setSendingConfirmation(false);
                      if (r.success) {
                        setConfirmationSent(true);
                        setShowConfirmModal(false);
                        setPatientSmsSentPopup({ phone: lead.phone });
                        setPatientSmsSentPopupDismissed(false);
                        toast.success("Confirmation sent ✓");
                      } else {
                        toast.error(`Failed: ${r.error}`);
                      }
                    }}
                    disabled={sendingConfirmation}
                    style={{
                      fontSize: 13, fontWeight: 500, color: "#fff",
                      background: COLORS.coral, border: "none", borderRadius: 8,
                      padding: "8px 14px",
                      cursor: sendingConfirmation ? "wait" : "pointer",
                      opacity: sendingConfirmation ? 0.7 : 1,
                    }}
                  >
                    {sendingConfirmation ? "Sending…" : "Send confirmation →"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg rounded-[12px] flex flex-col" style={{ background: "#ffffff", maxHeight: "90vh", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: `0.5px solid ${COLORS.line}` }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#111" }}>
                  {handoverSent ? "Handover already sent — review or resend" : "Review before sending"}
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                  {handoverSent
                    ? "This is exactly what the clinic received. Edit and resend if anything was wrong."
                    : "Edit anything before it goes to the clinic"}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1" style={{ padding: "20px 24px" }}>

                {/* Appointment */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Appointment</div>
                  <div style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>
                    {bookedData ? (() => { try { return new Date(`${bookedData.date}T${bookedData.time}`).toLocaleString("en-AU", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }); } catch { return `${bookedData.date} at ${bookedData.time}`; } })() : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>with {bookedData?.doctorName} · {bookedData?.clinicName}</div>
                </div>

                {/* Patient Intel */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999" }}>Patient Intel <span style={{ color: COLORS.coral }}>— editable</span></div>
                    <button
                      type="button"
                      disabled={refreshingIntel}
                      onClick={async () => {
                        setRefreshingIntel(true);
                        try {
                          // 1. Fetch ALL call records for this lead, plus any same-phone orphaned rows.
                          type CallRow = {
                            id: string;
                            recording_url: string | null;
                            call_analysis: { patient_summary?: string; transcript?: string } | null;
                            called_at: string;
                            duration?: number | null;
                            phone?: string | null;
                          };
                          const callSelect = "id, recording_url, call_analysis, called_at, duration, phone";
                          const normalizePhone = (value?: string | null) => (value || "").replace(/[^0-9]/g, "");
                          const byId = new Map<string, CallRow>();
                          const addRows = (rows?: CallRow[] | null) => rows?.forEach((row) => byId.set(row.id, row));

                          const { data: leadCalls, error: callsErr } = await supabase
                            .from("call_records")
                            .select(callSelect)
                            .eq("lead_id", lead.id)
                            .order("called_at", { ascending: true });
                          if (callsErr) throw callsErr;
                          addRows(leadCalls as CallRow[] | null);

                          const phoneTail = normalizePhone(lead.phone).slice(-9);
                          if (phoneTail.length >= 6) {
                            const { data: phoneCalls, error: phoneErr } = await supabase
                              .from("call_records")
                              .select(callSelect)
                              .ilike("phone", `%${phoneTail}%`)
                              .order("called_at", { ascending: true });
                            if (phoneErr) throw phoneErr;
                            addRows(phoneCalls as CallRow[] | null);
                          }

                          const allCalls = Array.from(byId.values()).sort((a, b) => new Date(a.called_at).getTime() - new Date(b.called_at).getTime());
                          const calls = allCalls.filter((c) => !!c.recording_url);
                          const longUnrecorded = allCalls.filter((c) => !c.recording_url && (c.duration ?? 0) >= 60);
                          if (allCalls.length === 0) {
                            toast.error("No calls found for this lead");
                            return;
                          }
                          if (calls.length === 0) {
                            toast.error(longUnrecorded.length > 0
                              ? "Found a real call, but it was not recorded so Patient Intel cannot be rebuilt from audio. Add the patient details manually for this old call."
                              : "No call recordings found for this lead");
                            return;
                          }

                          // 2. Ensure each recorded call has been analysed (so we have a transcript). Analyse any that haven't.
                          const enriched: { idx: number; transcript: string; summary: string; when: string }[] = [];
                          for (let i = 0; i < calls.length; i++) {
                            const c = calls[i] as CallRow;
                            let analysis = c.call_analysis;
                            if (!analysis?.transcript) {
                              const { error: invErr } = await supabase.functions.invoke("auto-analyse-call", {
                                body: { callRecordId: c.id },
                              });
                              if (invErr) {
                                console.error("auto-analyse-call failed for", c.id, invErr);
                                continue;
                              }
                              const { data: refreshed } = await supabase
                                .from("call_records")
                                .select("call_analysis")
                                .eq("id", c.id)
                                .maybeSingle();
                              analysis = refreshed?.call_analysis as CallRow["call_analysis"];
                            }
                            const transcript = (analysis?.transcript || "").trim();
                            const summary = (analysis?.patient_summary || "").trim();
                            // Skip calls that produced nothing useful
                            if (!transcript && !summary) continue;
                            enriched.push({ idx: i + 1, transcript, summary, when: c.called_at });
                          }

                          // Filter out calls that clearly had no useful patient intel (voicemail, no answer, very short transcripts)
                          const isUseless = (t: string, s: string) => {
                            const blob = `${t}\n${s}`.toLowerCase();
                            if (
                              blob.includes("too brief") ||
                              blob.includes("no useful intel") ||
                              blob.includes("not enough patient intel")
                            ) return true;
                            // If we have NO transcript and only a short summary mentioning voicemail/no-answer, skip
                            if (!t && (s.toLowerCase().includes("voicemail") || s.toLowerCase().includes("no answer") || s.length < 40)) return true;
                            // Very short transcripts (under ~120 chars of speech) are almost always useless
                            if (t && t.replace(/\s+/g, " ").length < 120 && !s) return true;
                            return false;
                          };
                          const useful = enriched.filter((e) => !isUseless(e.transcript, e.summary));

                          if (useful.length === 0 && longUnrecorded.length > 0) {
                            toast.error(
                              "Found a real call for this patient, but that old inbound call was not recorded. Add the patient story manually for this one; future inbound calls are now recorded automatically.",
                              { duration: 9000 },
                            );
                            return;
                          }

                          // 3. Build chronological notes block. Prefer raw transcript (richer source) and fall back to summary.
                          const notesBlock = useful
                            .map((e, i) => {
                              const label = i === useful.length - 1 && useful.length > 1 ? "Latest Call" : `Call ${i + 1}`;
                              const when = (() => { try { return new Date(e.when).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); } catch { return ""; } })();
                              const body = e.transcript || e.summary;
                              return `--- ${label}${when ? ` (${when})` : ""} ---\n${body}`;
                            })
                            .join("\n\n");

                          const { data: leadFacts } = await supabase
                            .from("meta_leads")
                            .select("funding_preference, finance_eligible, status, booking_date, booking_time")
                            .eq("id", lead.id)
                            .maybeSingle();
                          const dealFacts = {
                            deposit_paid: previewDeposit,
                            finance_eligible: leadFacts?.finance_eligible ?? null,
                            funding_preference: previewFunding || leadFacts?.funding_preference || null,
                            booking_date: leadFacts?.booking_date || null,
                            booking_time: leadFacts?.booking_time || null,
                            status: leadFacts?.status || null,
                          };

                          const { data: condensed, error: condErr } = await supabase.functions.invoke("condense-notes", {
                            body: { leadId: lead.id, notes: notesBlock, dealFacts },
                          });
                          if (condErr) throw condErr;
                          const finalText = (condensed as { condensed?: string } | null)?.condensed?.trim() || "";

                          if (finalText) {
                            setPreviewIntel(finalText);
                            const usedCount = useful.length;
                            const totalCount = enriched.length;
                            const skipped = totalCount - usedCount;
                            if (usedCount === 0) {
                              toast.warning(
                                `No usable call recordings (${totalCount} found — all voicemail/no-answer). Add patient details manually before sending.`,
                                { duration: 7000 },
                              );
                            } else {
                              toast.success(
                                `Patient intel refreshed from ${usedCount} call${usedCount === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} skipped)` : ""} ✓`,
                              );
                            }
                          } else {
                            const { data: fresh } = await supabase
                              .from("meta_leads")
                              .select("call_notes")
                              .eq("id", lead.id)
                              .single();
                            if (fresh?.call_notes?.trim()) {
                              setPreviewIntel(fresh.call_notes);
                              toast.success("Patient intel refreshed ✓");
                            } else {
                              toast.message("Refresh complete — no summary returned");
                            }
                          }
                        } catch (e) {
                          const msg = e instanceof Error ? e.message : "Failed to refresh intel";
                          toast.error(msg);
                        } finally {
                          setRefreshingIntel(false);
                        }
                      }}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: refreshingIntel ? "#fff" : "#fff",
                        background: refreshingIntel ? "#999" : COLORS.coral,
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 14px",
                        cursor: refreshingIntel ? "wait" : "pointer",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      }}
                    >
                      {refreshingIntel ? "Refreshing…" : "↻ Pull intel from call recording"}
                    </button>
                  </div>
                  <textarea
                    value={previewIntel}
                    onChange={(e) => setPreviewIntel(e.target.value)}
                    rows={5}
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, lineHeight: 1.6, padding: "10px 12px", resize: "vertical" }}
                    placeholder="Add call notes here..."
                  />
                  {!previewIntel.trim() && (
                    <div style={{ marginTop: 8, padding: "10px 12px", background: "#fff8e1", border: "1px solid #f5c842", borderRadius: 6, fontSize: 13, color: "#7a5b00", lineHeight: 1.5 }}>
                      ⚠️ <strong>Patient Intel is empty.</strong> Click <strong>"↻ Pull intel from call recording"</strong> above to auto-generate it from the call, or type notes manually. Do <strong>not</strong> send to the clinic blank.
                    </div>
                  )}
                </div>

                {/* Funding */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Funding Method <span style={{ color: COLORS.coral }}>— editable</span></div>
                  <input
                    value={previewFunding}
                    onChange={(e) => setPreviewFunding(e.target.value)}
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }}
                  />
                </div>

                {/* Key facts row */}
                <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Finance Eligible</div>
                    <select value="Yes" disabled
                      className="w-full rounded-[6px] outline-none"
                      style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px", opacity: 1 }}>
                      <option>Yes</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Deposit Paid</div>
                    <select value={previewDeposit ? "Yes" : "No"} onChange={(e) => setPreviewDeposit(e.target.value === "Yes")}
                      className="w-full rounded-[6px] outline-none"
                      style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }}>
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Patient Contact <span style={{ color: COLORS.coral }}>— editable</span></div>
                  <input value={previewPhone} onChange={(e) => setPreviewPhone(e.target.value)} placeholder="Phone"
                    className="w-full rounded-[6px] outline-none mb-2"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }} />
                  <input value={previewEmail} onChange={(e) => setPreviewEmail(e.target.value)} placeholder="Patient email"
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }} />
                </div>

                {/* Clinic email */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: 6 }}>Clinic Email <span style={{ color: COLORS.coral }}>— required</span></div>
                  <input value={previewClinicEmail} onChange={(e) => setPreviewClinicEmail(e.target.value)} placeholder="bookings@clinic.com"
                    className="w-full rounded-[6px] outline-none"
                    style={{ background: "#f9f9f9", border: `0.5px solid ${COLORS.line}`, color: "#111", fontSize: 14, padding: "8px 12px" }} />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3" style={{ padding: "16px 24px", borderTop: `0.5px solid ${COLORS.line}` }}>
                <button onClick={() => setShowPreview(false)}
                  className="flex-1 rounded-[8px]"
                  style={{ background: "#f3f3f3", color: "#111", fontSize: 14, fontWeight: 500, padding: "12px 0" }}>
                  {handoverSent ? "Close" : "Cancel"}
                </button>
                <button onClick={() => void confirmAndSend()}
                  className="flex-1 rounded-[8px]"
                  style={{ background: COLORS.coral, color: "#fff", fontSize: 14, fontWeight: 500, padding: "12px 0" }}>
                  {handoverSent ? "Resend with updates →" : "Confirm & Send →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-sm rounded-[12px]" style={{ background: "#fff", padding: "24px" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
                Reset booking?
              </div>
              <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 20, lineHeight: 1.5 }}>
                This will permanently delete the booking date and time for this lead and return Step 10 to a fresh slate. This cannot be undone.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    fontSize: 13, fontWeight: 500, color: COLORS.text,
                    background: "#fff", border: `0.5px solid ${COLORS.line}`,
                    borderRadius: 8, padding: "8px 16px", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetBooking}
                  style={{
                    fontSize: 13, fontWeight: 500, color: "#fff",
                    background: COLORS.coral, border: "none",
                    borderRadius: 8, padding: "8px 16px", cursor: "pointer",
                  }}
                >
                  Yes, reset
                </button>
              </div>
            </div>
          </div>
        )}

        {patientSmsSentPopupNode}
        {patientSmsDraftPopupNode}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Eyebrow>Step 10 — Deposit & Book</Eyebrow>
      <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111", marginBottom: 8, lineHeight: 1.3 }}>Lock It In</h1>
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "#92400e",
          marginBottom: 10,
          lineHeight: 1.4,
        }}
      >
        Get it before they hang up — if you can't lock in a date, schedule the follow-up call before they go.
      </div>

      <Card className="px-4 py-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label>Clinic</Label>
            <select value={form.clinicId} onChange={(e) => set("clinicId", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
              <option value="">Select clinic…</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.clinic_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Gender</Label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1" style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
              <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>

        {doctors.length > 0 && (
          <div>
            <Label>Doctor</Label>
            <select
              value={form.doctorId}
              onChange={(e) => set("doctorId", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1"
              style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.title ? ` — ${d.title}` : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label>Funding type</Label>
          <div className="flex gap-1.5 mt-1">
            {["Savings", "Super", "Finance"].map((v) => (
              <button key={v} onClick={() => set("funding", v)}
                className="flex-1 px-2 py-1.5 rounded-md text-[12px] font-medium"
                style={{
                  background: form.funding === v ? COLORS.coral : "#f9f9f9",
                  color: form.funding === v ? "#fff" : COLORS.muted,
                  border: `1px solid ${form.funding === v ? COLORS.coral : COLORS.line}`,
                }}>{v}</button>
            ))}
          </div>
        </div>

        <BookingSlotPicker
          clinicId={form.clinicId}
          date={form.date}
          time={form.time}
          onDate={(v) => set("date", v)}
          onTime={(v) => set("time", v)}
        />

        {/* Payment-link gate — must be paid before booking can be locked in */}
        {(() => {
          const missing: string[] = [];
          if (!form.clinicId) missing.push("clinic");
          if (!form.gender) missing.push("gender");
          if (doctors.length > 0 && !form.doctorId) missing.push("doctor");
          if (!form.funding) missing.push("funding type");
          if (!form.date) missing.push("date");
          if (!form.time) missing.push("time");
          const formIncomplete = missing.length > 0;
          return !paymentReceivedAt ? (
            <button
              onClick={() => { if (!paymentLinkSent) void sendPaymentLink(); }}
              disabled={sendingPaymentLink || !lead.phone || formIncomplete || paymentLinkSent}
              title={formIncomplete ? `Fill in: ${missing.join(", ")}` : undefined}
              className="w-full rounded-[6px]"
              style={{
                background: formIncomplete ? "#e5e7eb" : paymentLinkSent ? "#fffbeb" : COLORS.coral,
                color: formIncomplete ? "#9ca3af" : paymentLinkSent ? "#92400e" : "#fff",
                border: paymentLinkSent && !formIncomplete ? "1px solid #f59e0b" : "none",
                fontSize: 13, fontWeight: 600, padding: "9px 20px", marginTop: 4,
                cursor: sendingPaymentLink || !lead.phone || formIncomplete || paymentLinkSent ? "not-allowed" : "pointer",
                opacity: sendingPaymentLink || !lead.phone ? 0.6 : 1,
              }}
            >
              {formIncomplete
                ? `🔒 Complete ${missing.join(", ")} first`
                : sendingPaymentLink
                  ? "Sending…"
                  : paymentLinkSent
                    ? "⏳ Waiting for Stripe to confirm payment…"
                    : "💳 Send payment link"}
            </button>
          ) : null;
        })()}
        {paymentReceivedAt && (
          <div style={{
            background: "#dcfce7", border: "1px solid #10b981", borderRadius: 8,
            padding: "8px 12px", marginTop: 4, fontSize: 12, fontWeight: 600, color: "#065f46",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>✅</span><span>Payment confirmed by Stripe</span>
          </div>
        )}
        {paymentLinkSent && !paymentReceivedAt && (
          <button
            onClick={() => void sendPaymentLink()}
            disabled={sendingPaymentLink}
            style={{
              background: "transparent", color: COLORS.muted, border: "none",
              fontSize: 11, padding: "4px 0", cursor: "pointer", textDecoration: "underline",
            }}
          >
            Resend payment link
          </button>
        )}

        <button
          onClick={() => void book()}
          disabled={!paymentReceivedAt}
          title={!paymentReceivedAt ? "Send payment link and wait for Stripe to confirm" : undefined}
          className="w-full rounded-[6px]"
          style={{
            background: paymentReceivedAt ? COLORS.green : "#e5e7eb",
            color: paymentReceivedAt ? "#ffffff" : "#9ca3af",
            fontSize: 13, fontWeight: 500, padding: "9px 20px", marginTop: 4,
            cursor: paymentReceivedAt ? "pointer" : "not-allowed",
          }}
        >
          {paymentReceivedAt ? "Book appointment" : "🔒 Book appointment (payment required)"}
        </button>
      </Card>

      {/* MUST DO'S — before you hang up */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{
            background: COLORS.red,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}>
            MUST DO'S
          </span>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Before you hang up
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "Quoted them an accurate price range", checked: mustDoPrice, set: setMustDoPrice },
            { label: "Discussed how they plan to fund it", checked: mustDoFunding, set: setMustDoFunding },
            { label: "Set realistic expectations about results", checked: mustDoExpectations, set: setMustDoExpectations, muted: " — if Norwood 6/7" },
          ].map((item) => (
            <label key={item.label} className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={(e) => { e.preventDefault(); item.set(!item.checked); }}
                style={{
                  width: 16, height: 16, borderRadius: 3,
                  border: `1.5px solid ${item.checked ? COLORS.green : "#d1d5db"}`,
                  background: item.checked ? COLORS.green : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2, cursor: "pointer",
                }}
              >
                {item.checked && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.4 }}>
                {item.label}
                {item.muted && <span style={{ color: "#9ca3af" }}>{item.muted}</span>}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Patient confirmation SMS — 5s countdown popup */}
      {patientSmsDraftPopupNode}

      {patientSmsSentPopupNode}
    </div>
  );
}

/* ─────────────── LEAD CHOOSER (entry point) ─────────────── */

function BookingSlotPicker({ clinicId, date, time, onDate, onTime }: {
  clinicId: string;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
}) {
  const [trading, setTrading] = useState<TradingHours[]>([]);
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [appts, setAppts] = useState<ExistingAppt[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [clinicState, setClinicState] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) { setTrading([]); setBlocks([]); setAppts([]); setOverrides([]); setClinicState(null); return; }
    void Promise.all([
      supabase.from("clinic_trading_hours").select("day_of_week, open_time, close_time, is_closed, consult_duration_mins").eq("clinic_id", clinicId),
      supabase.from("clinic_blocked_slots").select("id, slot_date, slot_start, slot_end, is_recurring, recur_day_of_week, recur_pattern, recur_days_of_week, recur_day_of_month, recur_nth_week, recur_until").eq("clinic_id", clinicId),
      supabase.from("clinic_appointments").select("appointment_date, appointment_time").eq("clinic_id", clinicId),
      supabase.from("clinic_availability").select("override_date, override_type, start_time, end_time").eq("clinic_id", clinicId),
      supabase.from("partner_clinics").select("state").eq("id", clinicId).maybeSingle(),
    ]).then(([a, b, c, d, e]) => {
      setTrading((a.data ?? []) as TradingHours[]);
      setBlocks((b.data ?? []) as BlockedSlot[]);
      setAppts((c.data ?? []) as ExistingAppt[]);
      setOverrides((d.data ?? []) as AvailabilityOverride[]);
      setClinicState((e.data as { state?: string | null } | null)?.state ?? null);
    });
  }, [clinicId]);

  const slots = useMemo(() => {
    if (!date) return [];
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return [];
    return generateSlots(new Date(y, m - 1, d), trading, blocks, appts, overrides, clinicState);
  }, [date, trading, blocks, appts, overrides, clinicState]);

  const available = slots.filter((s) => s.available);

  const holidayName = useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return null;
    return holidayLabelFor(new Date(y, m - 1, d), overrides, clinicState);
  }, [date, overrides, clinicState]);

  // Compute available/unavailable days for the next ~120 days for calendar colouring
  const { availableDays, unavailableDays } = useMemo(() => {
    const avail: Date[] = [];
    const unavail: Date[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 120; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const s = summarizeDay(d, trading, blocks, appts, overrides, clinicState);
      const hasOpenSlot = !s.closed && s.total - s.bookedCount > 0 && !s.allBlocked;
      if (hasOpenSlot) avail.push(d); else unavail.push(d);
    }
    return { availableDays: avail, unavailableDays: unavail };
  }, [trading, blocks, appts, overrides, clinicState]);

  const selectedDate = useMemo(() => {
    if (!date) return undefined;
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  }, [date]);

  const [calOpen, setCalOpen] = useState(false);
  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "Pick a date";

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div>
        <Label>Booking date</Label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button type="button"
              className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1 text-left flex items-center justify-between"
              style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: selectedDate ? COLORS.text : COLORS.muted }}>
              <span>{dateLabel}</span>
              <CalendarIcon size={14} style={{ color: COLORS.muted }} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) { onDate(ymdLocal(d)); onTime(""); setCalOpen(false); }
              }}
              disabled={{ before: new Date() }}
              modifiers={{ hasSlots: availableDays, noSlots: unavailableDays }}
              modifiersClassNames={{
                hasSlots: "bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200",
                noSlots: "bg-red-100 text-red-700 hover:bg-red-200",
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
            <div className="px-3 pb-3 pt-1 flex items-center gap-3 text-[11px]" style={{ color: COLORS.muted }}>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-200" /> Available</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-200" /> No slots</span>
            </div>
          </PopoverContent>
        </Popover>
        {holidayName && (
          <div className="text-[11px] mt-1" style={{ color: "#8a6500" }}>Public holiday — {holidayName}. Clinic closed.</div>
        )}
      </div>
      <div>
        <Label>Time slot</Label>
        {!clinicId ? (
          <div className="text-[12px] mt-2" style={{ color: COLORS.muted }}>Pick a clinic first</div>
        ) : !date ? (
          <div className="text-[12px] mt-2" style={{ color: COLORS.muted }}>Pick a date first</div>
        ) : available.length === 0 ? (
          <div className="text-[12px] mt-2" style={{ color: "#b83232" }}>{holidayName ? `Closed for ${holidayName}` : "No slots available — try another date"}</div>
        ) : (
          <select value={time} onChange={(e) => onTime(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md text-[13px] mt-1"
            style={{ background: "#f9f9f9", border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
            <option value="">Choose…</option>
            {available.map((s) => (
              <option key={s.time} value={s.time}>{s.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
