// Ported from the Legal app (family-law-floater/src/lib/deck-settings.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";

import { DEFAULT_SETTINGS, type DeckSettings } from "@/legal/components/pitch/deck-utils";

export async function fetchCloudSettings(): Promise<DeckSettings | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("deck_settings")
    .select("matter_value, price_per_show, conversion_label, include_risk_slide")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    matterValue: Number(data.matter_value) || DEFAULT_SETTINGS.matterValue,
    pricePerShow: Number(data.price_per_show) || DEFAULT_SETTINGS.pricePerShow,
    conversionLabel: data.conversion_label || DEFAULT_SETTINGS.conversionLabel,
    includeRiskSlide: Boolean(data.include_risk_slide),
  };
}

export async function saveCloudSettings(settings: DeckSettings): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  await supabase.from("deck_settings").upsert(
    {
      user_id: user.id,
      matter_value: settings.matterValue,
      price_per_show: settings.pricePerShow,
      conversion_label: settings.conversionLabel,
      include_risk_slide: settings.includeRiskSlide,
    },
    { onConflict: "user_id" },
  );
}
