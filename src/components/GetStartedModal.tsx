import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, FileText } from "lucide-react";

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
  const [step, setStep] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  // Contract screen (step 5)
  const [contractPack, setContractPack] = useState<string | null>(null);
  const [contractCustomShows, setContractCustomShows] = useState("");
  const [perShowFee, setPerShowFee] = useState("1100");
  const [contractStatus, setContractStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [sending, setSending] = useState(false);
  const [sentVia, setSentVia] = useState<"email" | "sms" | "contract" | null>(null);
  const [smsStatus, setSmsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const step1Valid = fullName.trim() && clinicName.trim() && email.trim() && phone.trim();
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
        setSentVia("email");
        setStep(4);
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
      setSentVia("sms");
      setStep(4);
      return;
    }
    if (chosenPack?.stripeLink) {
      setSending(true);
      setSmsStatus(null);
      try {
        const firstName = fullName.trim().split(" ")[0];
        const result = await sendSMSFn({ data: { to: phone, firstName, stripeLink: chosenPack.stripeLink } });
        if (result.success) {
          setSentVia("sms");
          setStep(4);
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
          contactName: fullName,
          packageName: packLabel,
          shows: contractShows,
          perShowFee: perShowFeeNum,
          totalFee: totalContractFee,
        },
      });
      if (result.success) {
        setSentVia("contract");
        setStep(4);
      } else {
        setContractStatus({ type: "error", message: "Something went wrong — please try again." });
      }
    } catch {
      setContractStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  const resetAndClose = () => {
    setStep(1);
    setFullName("");
    setClinicName("");
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
    setSentVia(null);
    onClose();
  };

  if (!open) return null;

  const currentStepDisplay = step === 5 ? 3 : Math.min(step, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={resetAndClose} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={resetAndClose}
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

            {/* ─── STEP 3 ─── */}
            {step === 3 && (
              <div>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  How would you like to proceed?
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handleRequestInvoice}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-5 text-center transition-all group"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      ✉️
                    </p>
                    <p className="text-xs font-bold text-foreground mt-2">Send Payment Link via Email</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Email a secure payment link</p>
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-5 text-center transition-all group"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      💬
                    </p>
                    <p className="text-xs font-bold text-foreground mt-2">Send Payment Link via SMS</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Text a secure payment link</p>
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-5 text-center transition-all group"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      <FileText className="w-5 h-5 mx-auto" />
                    </p>
                    <p className="text-xs font-bold text-foreground mt-2">Send Contract</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Email the agreement to review and sign</p>
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

            {/* ─── STEP 4 — CONFIRMATION ─── */}
            {step === 4 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {sentVia === "contract" ? "Contract Sent." : "You're All Set."}
                </h3>
                <p className="text-[#CCCCCC] text-sm leading-relaxed max-w-sm mx-auto mb-6">
                  {sentVia === "contract" ? (
                    <>Contract sent to <span className="text-foreground font-medium">{email}</span>. They will receive it shortly to review and sign.</>
                  ) : (
                    <>Your payment link has been sent to{" "}
                    <span className="text-foreground font-medium">{sentVia === "email" ? email : phone}</span>.
                    Complete your payment to lock in your spot.</>
                  )}
                </p>
                <p className="text-xs text-[#999] mb-8">
                  Questions?{" "}
                  <a href="mailto:petersemrany1@gmail.com" className="text-primary underline">
                    petersemrany1@gmail.com
                  </a>
                </p>
                <button
                  onClick={resetAndClose}
                  className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
