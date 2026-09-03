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
    <div className="flex min-h-[100svh] w-full flex-col bg-[#f6f7f9] font-sans antialiased">
      <SquareTestModeBanner environment={environment} />

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-4">

        <div className="w-full rounded-xl border border-[#e0e2e5] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {/* Square wordmark */}
          <div className="flex justify-center">
            <img src={logoAsset.url} alt="Square" className="h-6 w-auto" />
          </div>

          {/* Merchant */}
          <div className="mt-3 flex flex-col items-center text-center">
            <h2 className="text-[15px] font-semibold leading-tight text-[#1b1b1b]">{merchant}</h2>
            {clinic?.doctorName ? (
              <p className="text-[12px] text-[#6a6a6a]">{clinic.doctorName}</p>
            ) : null}
            {location ? <p className="text-[11px] text-[#8c8c8c]">{location}</p> : null}
          </div>

          {/* Headline: refundable booking fee */}
          <div className="mt-3 rounded-lg bg-[#f6f7f9] px-3 py-3 text-center">
            <h1 className="text-[19px] font-bold uppercase leading-tight tracking-tight text-[#1b1b1b]">
              Refundable booking fee
            </h1>
            <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-[#1b1b1b]">
              $75.00 <span className="text-[13px] font-normal text-[#8c8c8c]">AUD</span>
            </p>
            <p className="mt-1.5 text-[11px] font-medium leading-snug text-[#3d8b5f]">
              Refunded in full when you attend your consultation
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#ececee] pt-2 text-[12px] font-semibold text-[#1b1b1b]">
            <span>Total due today</span>
            <span>$75.00 AUD</span>
          </div>

          <div className="mt-3">
            {!reference ? (
              <p className="rounded-lg border border-[#e0e2e5] bg-[#f6f7f9] p-3 text-[13px] text-[#4a4a4a]">
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
        <div className="mt-3 text-center">
          <p className="text-[10.5px] leading-snug text-[#8c8c8c]">
            Payments processed securely by Square. Your card details are encrypted and never touch
            our servers.
          </p>
          <p className="mt-1 text-[10.5px] leading-snug text-[#8c8c8c]">
            {clinic?.phone
              ? `Questions? Call ${merchant} on ${clinic.phone}.`
              : "Questions? Reply to the SMS you received or call your consultant."}
          </p>
        </div>
      </main>
    </div>
  );
}
