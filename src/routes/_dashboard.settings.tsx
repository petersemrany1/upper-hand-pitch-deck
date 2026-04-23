import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Check, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings" }],
  }),
});

const STORAGE_KEY = "pitch-deck-settings";

export type DeckSettings = {
  caseValue: number;
  pricePerShow: number;
  convertRate: string;
};

export const DEFAULT_SETTINGS: DeckSettings = {
  caseValue: 12000,
  pricePerShow: 1100,
  convertRate: "1 in 4",
};

const CONVERT_RATES: Record<string, number> = {
  "1 in 1": 1,
  "3 in 4": 0.75,
  "1 in 2": 0.5,
  "1 in 3": 0.333,
  "1 in 4": 0.25,
  "1 in 5": 0.2,
  "1 in 6": 0.167,
  "1 in 7": 0.143,
  "1 in 8": 0.125,
  "1 in 9": 0.111,
  "1 in 10": 0.1,
};

export function loadDeckSettings(): DeckSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      caseValue: Number(parsed.caseValue) || DEFAULT_SETTINGS.caseValue,
      pricePerShow: Number(parsed.pricePerShow) || DEFAULT_SETTINGS.pricePerShow,
      convertRate: typeof parsed.convertRate === "string" && parsed.convertRate in CONVERT_RATES ? parsed.convertRate : DEFAULT_SETTINGS.convertRate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const STRIPE_PACKAGES: Array<{ id: string; label: string }> = [
  { id: "demo", label: "Demo" },
  { id: "starter", label: "Starter" },
  { id: "scale", label: "Scale" },
  { id: "custom", label: "Custom" },
];

type LinkRow = { package_id: string; url: string };

function SettingsPage() {
  const [links, setLinks] = useState<Record<string, string>>({
    demo: "",
    starter: "",
    scale: "",
    custom: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("stripe_links").select("package_id, url");
      if (cancelled) return;
      if (error) {
        setError("Failed to load Stripe links: " + error.message);
      } else if (data) {
        const next: Record<string, string> = { demo: "", starter: "", scale: "", custom: "" };
        (data as LinkRow[]).forEach((r) => {
          if (r.package_id in next) next[r.package_id] = r.url ?? "";
        });
        setLinks(next);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (packageId: string) => {
    setSaving(packageId);
    setError(null);
    const url = links[packageId]?.trim() ?? "";
    const { error } = await supabase
      .from("stripe_links")
      .upsert({ package_id: packageId, url }, { onConflict: "package_id" });
    setSaving(null);
    if (error) {
      setError("Failed to save: " + error.message);
      return;
    }
    setSavedFlash(packageId);
    setTimeout(() => setSavedFlash((cur) => (cur === packageId ? null : cur)), 1800);
  };

  return (
    <div className="min-h-screen bg-black px-6 py-10 md:px-10 md:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Settings
            </h1>
            <p className="text-sm text-[#999] mt-0.5">Manage payment links sent to clinics.</p>
          </div>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Stripe Payment Links</h2>
          <p className="text-sm text-[#999] mb-6">
            Paste one Stripe payment link per package. These links are sent to clinics via the payment email or SMS.
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#999] py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading links…
            </div>
          ) : (
            <div className="space-y-5">
              {STRIPE_PACKAGES.map((pkg) => {
                const isSaving = saving === pkg.id;
                const justSaved = savedFlash === pkg.id;
                const value = links[pkg.id] ?? "";
                return (
                  <div key={pkg.id}>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium tracking-wide uppercase">
                      {pkg.label} — Stripe URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        inputMode="url"
                        spellCheck={false}
                        value={value}
                        placeholder="https://buy.stripe.com/…"
                        onChange={(e) => setLinks((cur) => ({ ...cur, [pkg.id]: e.target.value }))}
                        className="flex-1 bg-input border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleSave(pkg.id)}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground font-bold text-sm px-5 py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2 min-w-[100px] justify-center"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : justSaved ? (
                          <>
                            <Check className="w-4 h-4" /> Saved
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                    {!value.trim() && (
                      <p className="mt-1.5 text-[11px] text-amber-400">No link set — payment emails/SMS for this package will be blocked.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
