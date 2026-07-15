import { render } from '@react-email/render'
import { template } from '../src/lib/email-templates/pack-renewal'

const RESEND_CONNECTION_KEY = process.env.RESEND_API_KEY ?? ''
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? ''

const to = process.argv[2] || 'petersemrany1@gmail.com'
const clinicName = 'Absolute Cosmetic'
const contactName = 'Peter'

const Component = template.component

async function send() {
  if (!RESEND_CONNECTION_KEY || !LOVABLE_API_KEY) {
    console.error('Missing RESEND_API_KEY or LOVABLE_API_KEY')
    process.exit(1)
  }

  const html = await render(<Component clinicName={clinicName} contactName={contactName} />, {
    pretty: true,
  })

  const subject =
    typeof template.subject === 'function'
      ? template.subject({ clinicName, contactName })
      : template.subject

  const response = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + LOVABLE_API_KEY,
      'X-Connection-Api-Key': RESEND_CONNECTION_KEY,
    },
    body: JSON.stringify({
      from: 'Bold <admin@bold-patients.com>',
      reply_to: 'admin@bold-patients.com',
      to: [to],
      subject,
      html,
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    console.error('Send failed:', JSON.stringify(result, null, 2))
    process.exit(1)
  }

  console.log('Test email sent to', to)
  console.log('Resend id:', result.id)
}

send().catch((err) => {
  console.error(err)
  process.exit(1)
})
