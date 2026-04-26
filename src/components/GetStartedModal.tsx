// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, FileText, ArrowLeft } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { sendPaymentLinkSMS } from "../utils/twilio.functions";
import { sendInvoiceEmail, sendContractEmail } from "../utils/resend.functions";
import { createStripeCheckoutSession } from "../utils/stripe.functions";
import { recordSentLink, updateSentLinkMethod } from "../utils/sent-links.functions";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
  pricePerShow?: number;
}

const STANDARD_PRICE_PER_SHOW = 800;

// Stripe payment links are generated dynamically per send via
// Stripe Checkout Sessions — see src/utils/stripe.functions.ts.

const PACK_DEFS = [
  { id: "demo", name: "Demo", shows: 10 },
  { id: "starter", name: "Starter", shows: 20 },
  { id: "scale", name: "Scale", shows: 50 },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

export default function GetStartedModal({ open, onClose, pricePerShow = STANDARD_PRICE_PER_SHOW }: GetStartedModalProps) {
  // step: 1=details, 2=package, 3=hub, 4=payment send-channel sub-screen
  const [step, setStep] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [customShowsInput, setCustomShowsInput] = useState("");
  const [customFeeInput, setCustomFeeInput] = useState("");

  // Completion tracking
  const [paymentSent, setPaymentSent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"email" | "sms" | null>(null);
  const [paymentSentLinkId, setPaymentSentLinkId] = useState<string | null>(null);
  const [lastStripeUrl, setLastStripeUrl] = useState<string | null>(null);
  const [contractSent, setContractSent] = useState(false);
  const [contractMethod, setContractMethod] = useState<"email" | null>(null);

  const [sending, setSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [contractStatus, setContractStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [crossSendStatus, setCrossSendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const phoneClean = phone.replace(/\s/g, '');
  const phoneValid = /^(\+?61|0)4[0-9]{8}$/.test(phoneClean);
  const step1Valid = fullName.trim() && clinicName.trim() && clinicAddress.trim() && email.trim() && phoneValid;

  // Pack totals are exc GST. inc GST = exc * 1.1.
  const PACKS = PACK_DEFS.map((p) => ({
    ...p,
    totalExc: p.shows * pricePerShow,
  }));

  const chosenPack = PACKS.find((p) => p.id === selectedPack);

  // Custom: user enters number of shows + per-show fee separately.
  const customShows = (() => {
    const n = parseInt(customShowsInput.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const customFee = (() => {
    const n = parseInt(customFeeInput.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const customExc = customShows * customFee;

  const isCustom = selectedPack === "custom";
  const step2Valid = selectedPack !== null && (selectedPack !== "custom" || (customShows > 0 && customFee > 0));
  const summaryShows = isCustom ? customShows : chosenPack?.shows ?? 0;
  const summaryPackName = isCustom ? "Custom" : chosenPack?.name ?? "";
  const summaryPerShow = isCustom ? customFee : pricePerShow;
  const totalExcGst = isCustom ? customExc : chosenPack?.totalExc ?? 0;
  const gst = Math.round(totalExcGst * 0.10);
  const totalIncGst = totalExcGst + gst;

  const sendInvoiceEmailFn = useServerFn(sendInvoiceEmail);
  const sendContractEmailFn = useServerFn(sendContractEmail);
  const createCheckoutFn = useServerFn(createStripeCheckoutSession);
  const sendSMSFn = useServerFn(sendPaymentLinkSMS);
  const recordSentLinkFn = useServerFn(recordSentLink);
  const updateSentLinkMethodFn = useServerFn(updateSentLinkMethod);

  // Creates a fresh Stripe Checkout Session for the selected pack (inc GST).
  const buildCheckoutUrl = async (
    setStatus: (s: { type: "success" | "error"; message: string } | null) => void
  ): Promise<string | null> => {
    // Reuse the URL from this modal session so cross-send (after sending one channel)
    // gives the recipient the exact same Stripe link.
    if (lastStripeUrl) return lastStripeUrl;
    if (!totalIncGst || totalIncGst < 1) {
      setStatus({ type: "error", message: "Please select a pack with a valid amount before sending." });
      return null;
    }
    try {
      const result = await createCheckoutFn({
        data: {
          clinicName,
          contactName: fullName,
          email,
          packageName: summaryPackName,
          totalIncGst,
        },
      });
      if (!result.success) {
        setStatus({ type: "error", message: result.error || "Could not generate payment link — please try again." });
        return null;
      }
      setLastStripeUrl(result.url);
      return result.url;
    } catch {
      setStatus({ type: "error", message: "Could not generate payment link — please try again." });
      return null;
    }
  };

  const recordPaymentSend = async (method: "email" | "sms", checkoutUrl: string) => {
    try {
      const result = await recordSentLinkFn({
        data: {
          kind: "payment_link",
          clinicName,
          contactName: fullName,
          email: email || null,
          phone: phone || null,
          packageName: summaryPackName,
          shows: summaryShows,
          perShowFee: summaryPerShow,
          totalExcGst,
          gst,
          totalIncGst,
          stripeUrl: checkoutUrl,
          sendMethod: method,
        },
      });
      if (result.success) setPaymentSentLinkId(result.id);
    } catch {
      // Non-fatal: history record failed but the send itself succeeded.
    }
  };

  const recordContractSend = async () => {
    try {
      await recordSentLinkFn({
        data: {
          kind: "contract",
          clinicName,
          contactName: fullName,
          email: email || null,
          phone: phone || null,
          packageName: summaryPackName,
          shows: summaryShows,
          perShowFee: summaryPerShow,
          totalExcGst,
          gst,
          totalIncGst,
          stripeUrl: null,
          sendMethod: "email",
        },
      });
    } catch {}
  };

  const handleRequestInvoice = async () => {
    setInvoiceStatus(null);
    setSending(true);
    try {
      const checkoutUrl = await buildCheckoutUrl(setInvoiceStatus);
      if (!checkoutUrl) {
        setSending(false);
        return;
      }
      const result = await sendInvoiceEmailFn({
        data: {
          to: email,
          clinicName,
          contactName: fullName,
          phone,
          packageName: summaryPackName,
          amount: fmt(totalIncGst),
          stripeLink: checkoutUrl,
        },
      });
      if (result.success) {
        await recordPaymentSend("email", checkoutUrl);
        setPaymentSent(true);
        setPaymentMethod("email");
        setCrossSendStatus(null);
        setStep(3);
      } else {
        setInvoiceStatus({ type: "error", message: result.error || "Something went wrong — please try again." });
      }
    } catch {
      setInvoiceStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  const handleSendSMS = async () => {
    setSmsStatus(null);
    setSending(true);
    try {
      const checkoutUrl = await buildCheckoutUrl(setSmsStatus);
      if (!checkoutUrl) {
        setSending(false);
        return;
      }
      const firstName = fullName.trim().split(" ")[0];
      const result = await sendSMSFn({ data: { to: phone, firstName, stripeLink: checkoutUrl } });
      if (result.success) {
        await recordPaymentSend("sms", checkoutUrl);
        setPaymentSent(true);
        setPaymentMethod("sms");
        setCrossSendStatus(null);
        setStep(3);
      } else {
        setSmsStatus({ type: "error", message: result.error || "Something went wrong — please try again." });
      }
    } catch {
      setSmsStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  // Send contract directly using carried-through values from steps 1 & 2.
  const handleSendContract = async () => {
    if (!summaryShows || summaryShows < 1) {
      setContractStatus({ type: "error", message: "Please select a pack with at least one show before sending the contract." });
      return;
    }
    setSending(true);
    setContractStatus(null);
    const packLabel = isCustom
      ? "Custom (" + summaryShows + " Shows)"
      : summaryPackName + " — " + summaryShows + " Shows";
    try {
      const result = await sendContractEmailFn({
        data: {
          to: email,
          clinicName,
          clinicAddress,
          contactName: fullName,
          phone,
          packageName: packLabel,
          shows: summaryShows,
          perShowFee: pricePerShow,
          totalFee: totalExcGst,
        },
      });
      if (result.success) {
        await recordContractSend();
        setContractStatus({ type: "success", message: "We've sent the agreement to " + email + "." });
        setContractSent(true);
        setContractMethod("email");
      } else {
        setContractStatus({ type: "error", message: "Something went wrong — please try again or contact admin@bold-patients.com" });
      }
    } catch {
      setContractStatus({ type: "error", message: "Something went wrong — please try again or contact admin@bold-patients.com" });
    }
    setSending(false);
  };

  // After payment link sent via one channel, allow sending via the other channel
  // (re-using the same Stripe URL so the recipient gets the same checkout).
  const handleCrossSendPayment = async () => {
    if (!paymentMethod || !lastStripeUrl) return;
    setCrossSendStatus(null);
    setSending(true);
    const otherMethod: "email" | "sms" = paymentMethod === "email" ? "sms" : "email";
    try {
      if (otherMethod === "sms") {
        const firstName = fullName.trim().split(" ")[0];
        const result = await sendSMSFn({ data: { to: phone, firstName, stripeLink: lastStripeUrl } });
        if (!result.success) {
          setCrossSendStatus({ type: "error", message: result.error || "Could not send SMS — please try again." });
          setSending(false);
          return;
        }
      } else {
        const result = await sendInvoiceEmailFn({
          data: {
            to: email,
            clinicName,
            contactName: fullName,
            phone,
            packageName: summaryPackName,
            amount: fmt(totalIncGst),
            stripeLink: lastStripeUrl,
          },
        });
        if (!result.success) {
          setCrossSendStatus({ type: "error", message: result.error || "Could not send email — please try again." });
          setSending(false);
          return;
        }
      }
      if (paymentSentLinkId) {
        await updateSentLinkMethodFn({ data: { id: paymentSentLinkId, method: "both" } });
      }
      setPaymentMethod(otherMethod === "sms" ? "sms" : "email");
      setCrossSendStatus({
        type: "success",
        message: "Also sent via " + (otherMethod === "sms" ? "SMS to " + phone : "email to " + email) + ".",
      });
    } catch {
      setCrossSendStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  const resetAndClose = () => {
    setStep(1);
    setFullName("");
    setClinicName("");
    setClinicAddress("");
    setEmail("");
    setPhone("");
    setSelectedPack(null);
    setCustomShowsInput("");
    setCustomFeeInput("");
    setContractStatus(null);
    setSmsStatus(null);
    setInvoiceStatus(null);
    setCrossSendStatus(null);
    setPaymentSent(false);
    setPaymentMethod(null);
    setPaymentSentLinkId(null);
    setLastStripeUrl(null);
    setContractSent(false);
    setContractMethod(null);
    setShowExitConfirm(false);
    onClose();
  };

  const handleAttemptClose = () => {
    setShowExitConfirm(true);
  };

  if (!open) return null;

  // Step 4 is a sub-screen of step 3.
  const currentStepDisplay = step >= 3 ? 3 : step;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleAttemptClose} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          <button
            onClick={handleAttemptClose}
            className="absolute top-4 right-4 text-[#999] hover:text-foreground transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step indicator */}
          <div className="px-8 pt-8 pb-2">
            <p className="text-xs text-[#999] font-medium tracking-wider uppercase">
              Step {currentStepDisplay} of 3
            </p>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={"h-1 flex-1 rounded-full transition-colors " +
                    (s <= currentStepDisplay ? "bg-primary" : "bg-border")
                  }
                />
              ))}
            </div>
          </div>

          <div className="px-8 py-6">
            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <div>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Your Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Clinic Name</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Sydney Hair Clinic"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Clinic Address</label>
                    <input
                      type="text"
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Full address including suburb and state"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="john@clinic.com.au"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="04XX XXX XXX"
                    />
                    {phone.trim() && !phoneValid && (
                      <p className="text-xs text-red-400 mt-1">Please enter a valid Australian mobile number</p>
                    )}
                  </div>
                </div>
                <button
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className="w-full mt-6 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Which pack are you starting with?
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => setSelectedPack(pack.id)}
                      className={"rounded-xl border-2 p-4 text-left transition-all " +
                        (selectedPack === pack.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-[#555]")
                      }
                    >
                      <p className="text-sm font-extrabold text-foreground">{pack.name}</p>
                      <p className="text-xs text-[#CCCCCC] mt-1">{pack.shows} patients</p>
                      <p className="text-sm font-bold text-primary mt-2">{fmt(pack.totalExc)}</p>
                      <p className="text-[10px] text-[#999]">exc GST</p>
                      <p className="text-[10px] text-[#999]">{fmt(Math.round(pack.totalExc * 1.1))} inc GST</p>
                    </button>
                  ))}
                </div>

                {/* Custom option */}
                <button
                  onClick={() => setSelectedPack("custom")}
                  className={"w-full rounded-xl border-2 p-4 text-left transition-all mb-3 " +
                    (selectedPack === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-[#555]")
                  }
                >
                  <p className="text-sm font-extrabold text-foreground">Custom Amount</p>
                </button>

                {selectedPack === "custom" && (
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">
                        Number of shows
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customShowsInput}
                        onChange={(e) => setCustomShowsInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 30"
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">
                        Per show fee (exc GST)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customFeeInput}
                        onChange={(e) => setCustomFeeInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 800"
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {customExc > 0 && (
                      <p className="col-span-2 text-[11px] text-[#999] -mt-1">
                        {customShows} shows × {fmt(customFee)} = {fmt(customExc)} exc · {fmt(Math.round(customExc * 1.1))} inc GST
                      </p>
                    )}
                  </div>
                )}

                <button
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  className="w-full mt-3 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* ─── STEP 3 — ACTION HUB / SUMMARY ─── */}
            {step === 3 && (
              <div>
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Summary
                </h3>
                <p className="text-sm text-[#999] mb-5">Review the details then send the agreement and payment link.</p>

                {/* Summary card */}
                <div className="rounded-xl border border-border bg-input/40 p-4 mb-5 text-sm">
                  <div className="grid grid-cols-[110px_1fr] gap-y-1.5 gap-x-3">
                    <span className="text-[#999]">Clinic</span>
                    <span className="text-foreground font-medium">{clinicName}</span>

                    <span className="text-[#999]">Contact</span>
                    <span className="text-foreground font-medium">{fullName}</span>

                    <span className="text-[#999]">Package</span>
                    <span className="text-foreground font-medium">
                      {summaryPackName} — {summaryShows} shows
                    </span>

                    <span className="text-[#999]">Per show</span>
                    <span className="text-foreground font-medium">{fmt(summaryPerShow)} + GST</span>
                  </div>

                  <div className="border-t border-border mt-3 pt-3 grid grid-cols-[110px_1fr] gap-y-1 gap-x-3">
                    <span className="text-[#999]">Total exc GST</span>
                    <span className="text-foreground font-medium">{fmt(totalExcGst)}</span>

                    <span className="text-[#999]">GST</span>
                    <span className="text-foreground font-medium">{fmt(gst)}</span>

                    <span className="text-[#999]">Total inc GST</span>
                    <span className="text-primary font-extrabold">{fmt(totalIncGst)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Contract card */}
                  <button
                    onClick={() => !contractSent && handleSendContract()}
                    disabled={contractSent || sending}
                    className={"w-full rounded-xl border-2 p-5 text-left transition-all flex items-center gap-4 " +
                      (contractSent
                        ? "border-green-500/50 bg-green-500/5 cursor-default"
                        : "border-border bg-card hover:border-primary disabled:opacity-60")
                    }
                  >
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " +
                      (contractSent ? "bg-green-500/20" : "bg-primary/10")
                    }>
                      {contractSent ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {contractSent ? "Contract Sent ✓" : (sending ? "Sending..." : "Send Contract")}
                      </p>
                      <p className="text-xs text-[#CCCCCC] mt-0.5">
                        {contractSent
                          ? "Sent to " + email
                          : "Email the agreement to " + email}
                      </p>
                    </div>
                  </button>

                  {/* Payment link card */}
                  <button
                    onClick={() => !paymentSent && setStep(4)}
                    disabled={paymentSent}
                    className={"w-full rounded-xl border-2 p-5 text-left transition-all flex items-center gap-4 " +
                      (paymentSent
                        ? "border-green-500/50 bg-green-500/5 cursor-default"
                        : "border-border bg-card hover:border-primary")
                    }
                  >
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " +
                      (paymentSent ? "bg-green-500/20" : "bg-primary/10")
                    }>
                      {paymentSent ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-lg">💳</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {paymentSent ? "Payment Link Sent ✓" : "Send Payment Link"}
                      </p>
                      <p className="text-xs text-[#CCCCCC] mt-0.5">
                        {paymentSent
                          ? "Sent via " + (paymentMethod === "email" ? "email to " + email : "SMS to " + phone)
                          : "Stripe checkout for " + fmt(totalIncGst) + " inc GST"}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Cross-send prompt: appears after one channel succeeded so they
                    can also send via the other channel using the same Stripe URL. */}
                {paymentSent && paymentMethod && lastStripeUrl && (
                  <div className="mt-4 rounded-xl border border-border bg-input/40 p-4">
                    <p className="text-xs text-[#CCCCCC] mb-2">
                      Also send the payment link via {paymentMethod === "email" ? "SMS" : "email"}?
                    </p>
                    <button
                      onClick={handleCrossSendPayment}
                      disabled={sending}
                      className="w-full text-sm font-bold py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      {sending
                        ? "Sending..."
                        : paymentMethod === "email"
                          ? "Also send via SMS to " + phone
                          : "Also send via email to " + email}
                    </button>
                    {crossSendStatus && (
                      <p className={"text-xs mt-2 text-center font-medium " + (crossSendStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                        {crossSendStatus.message}
                      </p>
                    )}
                  </div>
                )}

                {contractStatus && (
                  <p className={"text-sm mt-4 text-center font-medium " + (contractStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {contractStatus.message}
                  </p>
                )}

                {/* Done button */}
                {(paymentSent && contractSent) && (
                  <button
                    onClick={resetAndClose}
                    className="w-full mt-6 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg transition-opacity hover:opacity-90"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    All Done — Close
                  </button>
                )}
              </div>
            )}

            {/* ─── STEP 4 — PAYMENT SUB-SCREEN ─── */}
            {step === 4 && (
              <div>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send Payment Link
                </h3>
                <p className="text-sm text-[#999] mb-6">{fmt(totalIncGst)} inc GST · {summaryPackName}</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleRequestInvoice}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group disabled:opacity-60"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      ✉️
                    </p>
                    <p className="text-sm font-bold text-foreground mt-2">Via Email</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Send to {email}</p>
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group disabled:opacity-60"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      💬
                    </p>
                    <p className="text-sm font-bold text-foreground mt-2">Via SMS</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Send to {phone}</p>
                  </button>
                </div>

                {smsStatus && (
                  <p className={"text-sm mt-4 text-center font-medium " + (smsStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {smsStatus.message}
                  </p>
                )}

                {invoiceStatus && (
                  <p className={"text-sm mt-4 text-center font-medium " + (invoiceStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {invoiceStatus.message}
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Exit confirmation overlay */}
          <AnimatePresence>
            {showExitConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-2xl"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-xl p-6 mx-6 max-w-sm w-full shadow-xl"
                >
                  <h4
                    className="text-lg font-extrabold text-foreground mb-2"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Are you sure you want to exit?
                  </h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your progress will not be saved and you'll need to start again.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowExitConfirm(false)}
                      className="flex-1 border border-border text-foreground font-bold py-2.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={resetAndClose}
                      className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Exit
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
