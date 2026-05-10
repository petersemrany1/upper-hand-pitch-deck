import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY diagnostic — verifies which Stripe account STRIPE_HTG_SECRET_KEY belongs to.
// Returns only the account id, business name, and key prefix (all safe to expose).
export const Route = createFileRoute("/api/debug-stripe-account")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.STRIPE_HTG_SECRET_KEY || "";
        if (!key) {
          return Response.json({ error: "STRIPE_HTG_SECRET_KEY not set" }, { status: 500 });
        }
        const res = await fetch("https://api.stripe.com/v1/account", {
          headers: { Authorization: "Bearer " + key },
        });
        const json = (await res.json()) as {
          id?: string;
          business_profile?: { name?: string };
          settings?: { dashboard?: { display_name?: string } };
          email?: string;
          error?: { message?: string };
        };
        return Response.json({
          ok: res.ok,
          keyPrefix: key.slice(0, 12),
          keyLength: key.length,
          accountId: json.id,
          businessName: json.business_profile?.name,
          displayName: json.settings?.dashboard?.display_name,
          email: json.email,
          error: json.error?.message,
        });
      },
    },
  },
});
