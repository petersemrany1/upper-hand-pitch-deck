import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, FileText, ArrowLeft } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { sendPaymentLinkSMS } from "../utils/twilio.functions";
import { sendInvoiceEmail, sendContractEmail } from "../utils/resend.functions";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
}

const PACKS = [
  { id: "demo", name: "Demo", shows: 10, total: 11000, stripeLink: "https://buy.stripe.com/4gM6oJ7fO1kH2jXc5qffy00" },
  { id: "starter", name: "Starter", shows: 20, total: 22000, stripeLink: "https://buy.stripe.com/8x2bJ39nW8N9f6JfhCffy01" },
  { id: "scale", name: "Scale", shows: 50, total: 55000, stripeLink: "https://buy.stripe.com/fZu8wRdEc4wT0bPfhCffy02" },
  { id: "custom", name: "Custom", shows: 0, total: 0, stripeLink: "" },
];

const CONTRACT_PACKS = [
  { id: "demo", label: "Demo — 10 Shows", shows: 10 },
  { id: "starter", label: "Starter — 20 Shows", shows: 20 },
  { id: "scale", label: "Scale — 50 Shows", shows: 50 },
  { id: "custom", label: "Custom", shows: 0 },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

export default function GetStartedModal({ open, onClose }: GetStartedModalProps) {
  // step: 1=details, 2=package, 3=hub, 4=payment sub-screen, 5=contract sub-screen
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
  const [customAmount, setCustomAmount] = useState("");

  // Contract fields (step 5)
  const [contractPack, setContractPack] = useState<string | null>(null);
  const [contractCustomShows, setContractCustomShows] = useState("");
  const [perShowFee, setPerShowFee] = useState("1100");
  const [contractStatus, setContractStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Completion tracking
  const [paymentSent, setPaymentSent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"email" | "sms" | null>(null);
  const [contractSent, setContractSent] = useState(false);

  const [sending, setSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const step1Valid = fullName.trim() && clinicName.trim() && clinicAddress.trim() && email.trim() && phone.trim();
  const step2Valid = selectedPack !== null && (selectedPack !== "custom" || customAmount.trim());

  const chosenPack = PACKS.find((p) => p.id === selectedPack);
  const displayAmount = selectedPack === "custom" ? customAmount : chosenPack ? fmt(chosenPack.total) : "";
  const displayPackName = selectedPack === "custom" ? "Custom (" + customAmount + ")" : chosenPack?.name ?? "";

  // Contract calculations
  const contractPackObj = CONTRACT_PACKS.find((p) => p.id === contractPack);
  const contractShows = contractPack === "custom" ? parseInt(contractCustomShows) || 0 : contractPackObj?.shows ?? 0;
  const perShowFeeNum = parseInt(perShowFee.replace(/[^0-9]/g, "")) || 0;
  const totalContractFee = contractShows * perShowFeeNum;
  const contractValid = contractPack !== null && contractShows > 0 && perShowFeeNum > 0;

  const sendInvoiceEmailFn = useServerFn(sendInvoiceEmail);
  const sendContractEmailFn = useServerFn(sendContractEmail);

  const handleRequestInvoice = async () => {
    setSending(true);
    setInvoiceStatus(null);
    try {
      const result = await sendInvoiceEmailFn({
        data: {
          to: email,
          clinicName,
          contactName: fullName,
          phone,
          packageName: displayPackName,
          amount: displayAmount,
          stripeLink: chosenPack?.stripeLink || "",
        },
      });
      if (result.success) {
        setPaymentSent(true);
        setPaymentMethod("email");
        setStep(3);
      } else {
        setInvoiceStatus({ type: "error", message: "Something went wrong — please try again." });
      }
    } catch {
      setInvoiceStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  const sendSMSFn = useServerFn(sendPaymentLinkSMS);

  const handleSendSMS = async () => {
    if (selectedPack === "custom") {
      setPaymentSent(true);
      setPaymentMethod("sms");
      setStep(3);
      return;
    }
    if (chosenPack?.stripeLink) {
      setSending(true);
      setSmsStatus(null);
      try {
        const firstName = fullName.trim().split(" ")[0];
        const result = await sendSMSFn({ data: { to: phone, firstName, stripeLink: chosenPack.stripeLink } });
        if (result.success) {
          setPaymentSent(true);
          setPaymentMethod("sms");
          setStep(3);
        } else {
          setSmsStatus({ type: "error", message: "Something went wrong — please try again." });
        }
      } catch {
        setSmsStatus({ type: "error", message: "Something went wrong — please try again." });
      }
      setSending(false);
    }
  };

  const handleSendContract = async () => {
    setSending(true);
    setContractStatus(null);
    const packLabel = contractPack === "custom"
      ? "Custom (" + contractShows + " Shows)"
      : contractPackObj?.label ?? "";
    try {
      const result = await sendContractEmailFn({
        data: {
          to: email,
          clinicName,
          clinicAddress,
          contactName: fullName,
          phone,
          packageName: packLabel,
          shows: contractShows,
          perShowFee: perShowFeeNum,
          totalFee: totalContractFee,
        },
      });
      if (result.success) {
        setContractStatus({ type: "success", message: "We've sent the agreement to " + email + ". Once signed, we'll be in touch to get started." });
        setContractSent(true);
        setStep(3);
      } else {
        setContractStatus({ type: "error", message: "Something went wrong — please try again or contact hello@upperhand.digital" });
      }
    } catch {
      setContractStatus({ type: "error", message: "Something went wrong — please try again or contact hello@upperhand.digital" });
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
    setCustomAmount("");
    setContractPack(null);
    setContractCustomShows("");
    setPerShowFee("1100");
    setContractStatus(null);
    setSmsStatus(null);
    setInvoiceStatus(null);
    setPaymentSent(false);
    setPaymentMethod(null);
    setContractSent(false);
    setShowExitConfirm(false);
    onClose();
  };

  const handleAttemptClose = () => {
    setShowExitConfirm(true);
  };

  if (!open) return null;

  // Steps 4 and 5 are sub-screens of step 3
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
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Which pack are you starting with?
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {PACKS.filter((p) => p.id !== "custom").map((pack) => (
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
                      <p className="text-sm font-bold text-primary mt-2">{fmt(pack.total)}</p>
                      <p className="text-[10px] text-[#999]">inc GST</p>
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
                  <div className="mb-3">
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">
                      Custom amount (inc GST)
                    </label>
                    <input
                      type="text"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="$15,000"
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
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

            {/* ─── STEP 3 — ACTION HUB ─── */}
            {step === 3 && (
              <div>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send to Client
                </h3>
                <p className="text-sm text-[#999] mb-6">Complete both actions in any order.</p>

                <div className="space-y-3">
                  {/* Contract card */}
                  <button
                    onClick={() => !contractSent && setStep(5)}
                    disabled={contractSent}
                    className={"w-full rounded-xl border-2 p-5 text-left transition-all flex items-center gap-4 " +
                      (contractSent
                        ? "border-green-500/50 bg-green-500/5 cursor-default"
                        : "border-border bg-card hover:border-primary")
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
                        {contractSent ? "Contract Sent ✓" : "Send Contract"}
                      </p>
                      <p className="text-xs text-[#CCCCCC] mt-0.5">
                        {contractSent
                          ? "Sent to " + email
                          : "Email the agreement to review and sign"}
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
                          : "Email or SMS a secure payment link"}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Done button */}
                {canCloseModal && (
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
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send Payment Link
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleRequestInvoice}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group"
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
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group"
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

            {/* ─── STEP 5 — CONTRACT FORM ─── */}
            {step === 5 && (
              <div>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send Contract
                </h3>

                {/* Auto-populated fields */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Client Name</label>
                    <div className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-foreground text-sm opacity-70">
                      {fullName}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Clinic Name</label>
                    <div className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-foreground text-sm opacity-70">
                      {clinicName}
                    </div>
                  </div>
                </div>

                {/* Package selector */}
                <div className="mb-4">
                  <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Package</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTRACT_PACKS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setContractPack(p.id)}
                        className={"rounded-lg border-2 px-3 py-2.5 text-left transition-all text-sm " +
                          (contractPack === p.id
                            ? "border-primary bg-primary/10 font-bold text-foreground"
                            : "border-border bg-card hover:border-[#555] text-foreground")
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom shows */}
                {contractPack === "custom" && (
                  <div className="mb-4">
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Number of Shows</label>
                    <input
                      type="number"
                      value={contractCustomShows}
                      onChange={(e) => setContractCustomShows(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Per Show Fee */}
                <div className="mb-4">
                  <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Per Show Fee ($)</label>
                  <input
                    type="text"
                    value={perShowFee}
                    onChange={(e) => setPerShowFee(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="1100"
                    className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Total */}
                {contractValid && (
                  <div className="mb-5 rounded-lg bg-primary/10 border border-primary/30 p-4 text-center">
                    <p className="text-xs text-[#CCCCCC] mb-1">Total Package Fee</p>
                    <p className="text-2xl font-extrabold text-primary">{fmt(totalContractFee)}</p>
                    <p className="text-xs text-[#999] mt-1">{contractShows} shows × {fmt(perShowFeeNum)} per show</p>
                  </div>
                )}

                {contractStatus && (
                  <p className={"text-sm mb-3 text-center font-medium " + (contractStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {contractStatus.message}
                  </p>
                )}

                <button
                  disabled={!contractValid || sending}
                  onClick={handleSendContract}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {sending ? "Sending..." : "Send Contract"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
