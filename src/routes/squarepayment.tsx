import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SquareCardForm } from "@/components/SquareCardForm";
import { SquareTestModeBanner } from "@/components/SquareTestModeBanner";
import type { DepositClinicInfo } from "@/utils/square-deposit.functions";
import logoAsset from "@/assets/square-logo-black.svg.asset.json";

export const Route = createFileRoute("/squarepayment")({
  head: () => ({
    meta: [
      { title: "Secure payment | Refundable booking fee" },
      {
        name: "description",
        content:
          "Secure your hair transplant consultation with a $75 refundable booking fee, refunded in full when you attend.",
      },
      { property: "og:title", content: "Secure payment — refundable booking fee" },
      {
        property: "og:description",
        content: "Pay your $75 refundable consultation booking fee securely.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  // `t` is the deposit token (current links). `lead` is the legacy lead uuid.
  validateSearch: (search: Record<string, unknown>): { lead?: string; t?: string } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  component: SquarePayment,
});

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;


function SquarePayment() {
  const { lead, t } = Route.useSearch();
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const [clinic, setClinic] = useState<DepositClinicInfo | null>(null);
  const raw = t ?? lead;
  const reference = raw && UUID_RE.test(raw) ? raw : undefined;

  const merchant = clinic?.clinicName ?? "Your clinic";
  const location = [clinic?.address, clinic?.city, clinic?.state].filter(Boolean).join(", ");

  return (
    <div className="h-screen overflow-hidden bg-[#f6f7f9] font-sans antialiased">
      <SquareTestModeBanner environment={environment} />

      <main className="mx-auto flex h-full max-w-[440px] flex-col justify-center px-4 py-4">
        <div className="w-full rounded-xl border border-[#e0e2e5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Square logo */}
          <div className="mb-4 flex justify-center">
            <img
              src={logoAsset.url}
              alt="Square"
              className="h-8 w-auto"
            />
          </div>

          {/* Merchant */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-[16px] font-semibold text-[#1b1b1b]">{merchant}</h1>
            {clinic?.doctorName ? (
              <p className="mt-0.5 text-[12px] text-[#6a6a6a]">{clinic.doctorName}</p>
            ) : null}
            {location ? <p className="mt-0.5 text-[11px] text-[#8c8c8c]">{location}</p> : null}
          </div>

          {/* Amount */}
          <div className="mt-4 text-center">
            <p className="text-[12px] font-medium text-[#6a6a6a]">Amount due</p>
            <p className="mt-0.5 text-[30px] font-semibold leading-none tracking-tight text-[#1b1b1b]">
              $75.00 <span className="text-[14px] font-normal text-[#8c8c8c]">AUD</span>
            </p>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-[#ececee] pt-3 text-[12px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[#1b1b1b]">Consultation booking fee</p>
                <p className="text-[11px] text-[#8c8c8c]">
                  Refunded in full when you attend your appointment
                </p>
              </div>
              <p className="shrink-0 font-medium text-[#1b1b1b]">$75.00</p>
            </div>
            <div className="flex items-center justify-between border-t border-[#ececee] pt-1.5 text-[12px] font-semibold text-[#1b1b1b]">
              <span>Total</span>
              <span>$75.00 AUD</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[13px] font-medium text-[#1b1b1b]">Card information</p>
            {!reference ? (
              <p className="rounded-lg border border-[#e0e2e5] bg-[#f6f7f9] p-4 text-[13px] text-[#4a4a4a]">
                This payment link is missing your booking reference. Please use the link sent to you
                by SMS, or contact your consultant.
              </p>
            ) : (
              <SquareCardForm
                reference={reference}
                onConfig={(cfg) => setEnvironment(cfg.environment)}
                onClinic={setClinic}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#8c8c8c]">
            Payments processed securely by Square. Your card details are encrypted and never touch
            our servers.
          </p>
          <p className="mt-1 text-[11px] text-[#8c8c8c]">
            {clinic?.phone
              ? `Questions? Call ${merchant} on ${clinic.phone}.`
              : "Questions? Reply to the SMS you received or call your consultant."}
          </p>
        </div>
      </main>
    </div>
  );
}
