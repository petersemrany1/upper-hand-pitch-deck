export type AdPerformanceRow = {
  reporting_key?: string;
  ad_name: string;
  location: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  booked: number;
  showed: number;
  noshow: number;
  upcoming: number;
  needs_outcome: number;
  disqualified: number;
  unattributed: boolean;
  name_collision: boolean;
  website_enquiry?: boolean;
};

export type LocationSummaryRow = {
  location: string;
  spend: number;
  leads: number;
  booked: number;
  showed: number;
  noshow: number;
  upcoming: number;
  needs_outcome: number;
  disqualified: number;
};

export type MonthlyPoint = {
  month: string;
  location: string;
  spend: number;
  showed: number;
};

export type NeedsOutcomeRow = {
  appointment_id: string;
  client_name: string;
  appointment_date: string | null;
  appointment_time: string | null;
  firm_name: string | null;
};

export type SpendRow = {
  id: string;
  date: string;
  ad_id: string | null;
  ad_name: string;
  adset_name: string | null;
  campaign_name: string | null;
  location: string | null;
  spend_aud: number;
  impressions: number;
  clicks: number;
  source: string;
};

export type LabourRow = {
  key: string;
  hours: number;
  hourly_cost: number;
  hours_missing_rate: number;
  hours_fallback: number;
  bookings: number;
  bonus_cost: number;
  bonus_missing_rate: number;
};

export type RevenueRow = { key: string; shows: number; revenue: number };

export type PackEconomicsRow = {
  firm_id: string;
  firm_name: string;
  city: string | null;
  shows_purchased: number;
  shows_paid_purchased: number;
  shows_free_purchased: number;
  amount_paid_ex_gst: number;
  packs_missing_amount: number;
  shows_delivered: number;
  free_shows_delivered: number;
  effective_rate: number | null;
  paid_rate: number | null;
  shows_owed: number;
  value_owed: number;
  over_delivered: number;
  list_rate: number;
};

export type MoneyMonthPoint = {
  month: string;
  location: string;
  spend: number;
  showed: number;
  revenue: number;
  labour_cost: number;
  bonus_cost: number;
};
