import { createFileRoute } from '@tanstack/react-router'

// TEMPORARY test route to send the pack-renewal email to a fixed address.
// Gated by META_LEADS_WEBHOOK_TOKEN. Safe to delete after test.
export const Route = createFileRoute('/api/public/hooks/test-pack-renewal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('x-webhook-token')
        const expected = process.env.META_LEADS_WEBHOOK_TOKEN
        if (!expected || token !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }

        const url = new URL(request.url)
        const origin = `${url.protocol}//${url.host}`

        const res = await fetch(`${origin}/lovable/email/transactional/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            templateName: 'pack-renewal',
            recipientEmail: 'petersemrany1@gmail.com',
            idempotencyKey: `pack-renewal-test-${Date.now()}`,
            templateData: {
              clinicName: 'Absolute Cosmetic',
              contactName: 'Peter',
            },
          }),
        })

        const body = await res.text()
        return new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json' } })
      },
    },
  },
})
