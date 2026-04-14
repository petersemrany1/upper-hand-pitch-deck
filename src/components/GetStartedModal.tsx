import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { sendPaymentLinkSMS } from "../utils/twilio.functions";
import { sendInvoiceEmail } from "../utils/resend.functions";

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

  const [sending, setSending] = useState(false);
  const [sentVia, setSentVia] = useState<"email" | "sms" | null>(null);
  const [smsStatus, setSmsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const step1Valid = fullName.trim() && clinicName.trim() && email.trim() && phone.trim();
  const step2Valid = selectedPack !== null && (selectedPack !== "custom" || customAmount.trim());

  const chosenPack = PACKS.find((p) => p.id === selectedPack);
  const displayAmount = selectedPack === "custom" ? customAmount : chosenPack ? fmt(chosenPack.total) : "";
  const displayPackName = selectedPack === "custom" ? `Custom (${customAmount})` : chosenPack?.name ?? "";

  const sendInvoiceEmailFn = useServerFn(sendInvoiceEmail);

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

  const resetAndClose = () => {
    setStep(1);
    setFullName("");
    setClinicName("");
    setEmail("");
    setPhone("");
    setSelectedPack(null);
    setCustomAmount("");
    setSmsStatus(null);
    setInvoiceStatus(null);
    setSentVia(null);
    onClose();
  };

  if (!open) return null;

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
              Step {Math.min(step, 3)} of 3
            </p>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-border"
                  }`}
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
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        selectedPack === pack.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-[#555]"
                      }`}
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
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all mb-3 ${
                    selectedPack === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-[#555]"
                  }`}
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
                  How would you like to receive your payment link?
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
                    <p className="text-sm font-bold text-foreground mt-2">Send Payment Link via Email</p>
                    <p className="text-xs text-[#CCCCCC] mt-1">We'll email you a secure payment link instantly</p>
                  </button>
                  <button
                    onClick={handleSendSMS}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      💬
                    </p>
                    <p className="text-sm font-bold text-foreground mt-2">Send Payment Link via SMS</p>
                    <p className="text-xs text-[#CCCCCC] mt-1">We'll text you a secure payment link instantly</p>
                  </button>
                </div>

                {smsStatus && (
                  <p className={`text-sm mt-4 text-center font-medium ${smsStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {smsStatus.message}
                  </p>
                )}

                {invoiceStatus && (
                  <p className={`text-sm mt-4 text-center font-medium ${invoiceStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {invoiceStatus.message}
                  </p>
                )}

                {selectedPack === "custom" && (
                  <p className="text-xs text-[#999] mt-4 text-center">
                    For custom amounts, we'll arrange payment directly.{" "}
                    <a href="mailto:petersemrany1@gmail.com" className="text-primary underline">
                      petersemrany1@gmail.com
                    </a>
                  </p>
                )}
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
                  You're All Set.
                </h3>
                <p className="text-[#CCCCCC] text-sm leading-relaxed max-w-sm mx-auto mb-6">
                  Your payment link has been sent to{" "}
                  <span className="text-foreground font-medium">{sentVia === "email" ? email : phone}</span>.
                  Complete your payment to lock in your spot.
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
