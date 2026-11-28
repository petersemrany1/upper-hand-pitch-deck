# Legal keys for the Upper Hand (Hair) app

The Legal app keeps 39 keys and settings in Lovable (Legal Group Portal > More >
Secrets). Lovable never shows their values, so they can't be copied across.
Each one goes into the **Hair** project's Secrets with `LEGAL_` in front of the
name, for example `TWILIO_AUTH_TOKEN` becomes `LEGAL_TWILIO_AUTH_TOKEN`.

Safety: the Hair app hides every `LEGAL_` key from Legal code until
`LEGAL_LIVE=true` is set on switch-over night. So adding them early can't
text, call, email, charge or spend anything.

## 1. Peter gets these from each company (a new key is fine)

**Done 2026-11-28:** all 17 saved in the Hair project's Secrets (names checked; `LEGAL_LIVE` not set).

| Company | Where | Hair secret name(s) |
|---|---|---|
| Twilio (Legal account) | console.twilio.com > Account info; API keys > Create | `LEGAL_TWILIO_ACCOUNT_SID`, `LEGAL_TWILIO_AUTH_TOKEN`, `LEGAL_TWILIO_API_KEY_SID`, `LEGAL_TWILIO_API_KEY_SECRET` |
| Anthropic | console.anthropic.com > API keys > Create | `LEGAL_ANTHROPIC_API_KEY` |
| OpenAI | platform.openai.com > API keys > Create | `LEGAL_OPENAI_API_KEY` |
| ElevenLabs | elevenlabs.io > Developers > API keys | `LEGAL_ELEVENLABS_API_KEY` |
| Resend | resend.com > API keys > Create | `LEGAL_RESEND_API_KEY` |
| Square (Legal deposits) | developer.squareup.com > your app > Credentials (Production); Locations | `LEGAL_SQUARE_ACCESS_TOKEN`, `LEGAL_SQUARE_APPLICATION_ID`, `LEGAL_SQUARE_LOCATION_ID` |
| Stripe (Bold) | dashboard.stripe.com > Developers > API keys | `LEGAL_BOLD_STRIPE_SECRET_KEY`, `LEGAL_STRIPE_SECRET_KEY`, `LEGAL_STRIPE_PUBLISHABLE_KEY` |
| Annature | Annature > Settings > API | `LEGAL_ANNATURE_ID`, `LEGAL_ANNATURE_KEY` |
| Calendly | calendly.com > Integrations > API & webhooks > Personal access token | `LEGAL_CALENDLY_API_TOKEN` |

## 2. Made on switch-over night (new doorbell addresses get new signing keys)

`LEGAL_SQUARE_WEBHOOK_SIGNATURE_KEY`, `LEGAL_STRIPE_WEBHOOK_SECRET`,
`LEGAL_BOLD_STRIPE_WEBHOOK_SECRET`, `LEGAL_STRIPE_LEGAL_WEBHOOK_SECRET`,
`LEGAL_ANNATURE_WEBHOOK_SECRET`, `LEGAL_BOLD_ANNATURE_WEBHOOK_SECRET`: each
company shows the signing key when the new address is added.

## 3. Settings to copy across (Peter or the Legal Lovable chat knows the values)

`LEGAL_META_AD_ACCOUNT_ID`, `LEGAL_META_CAMPAIGN_IDS`, `BOLD_TEMPLATE_APPROVED_VERSION`,
`BOLD_ANNATURE_ACCOUNT_ID`, `BOLD_ANNATURE_DOWNLOAD_HOSTS`, `BOLD_COMPANY_APPROVED`,
`BOLD_OFFERS_LIVE_ENABLED`, `BOLD_OFFERS_MODE`, `BOLD_OFFER_ORIGIN`,
`FIRM_BOOKING_SMS_ENABLED`, `FIRM_BOOKING_SMS_FROM`, `AD_BRIEFING_STREAMING_ENABLED`
(each with `LEGAL_` in front; the two `LEGAL_META_…` ones keep their names).
`BOLD_COUNTERSIGNER_USER_ID` must become the countersigner's **Hair** login id.

## 4. Shared secrets that must keep their current values

`INTERNAL_FUNCTION_SECRET`, `HANDOVER_LINK_SECRET`, `FIRM_BOOKING_LEAD_SECRET`.
Links already sent to firms (handover links) and the lead form use them; new
values would break those links. Decide on switch-over night: keep the old
values (from wherever they were first made) or accept that old links stop.

`LOVABLE_API_KEY` is supplied by Lovable itself.
