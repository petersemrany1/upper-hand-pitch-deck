# Upper Hand Portal

Lovable-generated TanStack Start app for the Upper Hand dashboard, pitch deck, sales workflow, Supabase functions, Twilio calling/SMS, and related clinic operations.

## Requirements

- Node.js 22.12 or newer
- npm
- Supabase project credentials supplied through environment variables

Use the repo's Node version when possible:

```sh
nvm use
```

## Local Setup

```sh
npm install
cp .env.example .env
npm run dev
```

The local app runs through Vite. By default it is available at:

```text
http://localhost:5173
```

## Environment

Do not commit real environment files. Keep secrets in Lovable, GitHub Actions secrets, Cloudflare, Supabase, or local `.env` files.

The browser/client app needs:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Server-side code may also need:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
DOCUSEAL_API_KEY
GOOGLE_MAPS_API_KEY
LOVABLE_API_KEY
META_LEADS_WEBHOOK_TOKEN
OPENAI_API_KEY
RESEND_API_KEY
SITE_URL
STRIPE_SECRET_KEY
STRIPE_HTG_SECRET_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_API_KEY_SID
TWILIO_API_KEY_SECRET
TWILIO_FROM_NUMBER
TWILIO_TWIML_APP_SID
```

Add any new required variables to `.env.example` without values.

Some older server utilities still contain hardcoded third-party keys. Rotate those keys and move them into deployment secrets before treating the repository as production-secure.

## Scripts

```sh
npm run dev       # start local development server
npm run build     # production build
npm run build:dev # development-mode build
npm run preview   # preview the production build
npm run lint      # run ESLint
```

## Lovable Workflow

Lovable is connected through GitHub. Use branches and pull requests for code changes, then merge into `main` once verified. After Lovable syncs the default branch, publish/update the Lovable project from Lovable.

Remote fallback points exist for the current pre-Codex baseline:

```text
backup/before-codex-2026-05-06
before-codex-2026-05-06
```
