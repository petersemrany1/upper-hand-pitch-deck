import * as React from 'react'
import { render } from '@react-email/render'
import { sendLovableEmail } from '@lovable.dev/email-js'
import { template } from './src/lib/email-templates/pack-renewal'

const data = { clinicName: 'Absolute Cosmetic', contactName: 'Peter' }
const element = React.createElement(template.component, data)
const html = await render(element)
const text = await render(element, { plainText: true })
const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject

const res = await sendLovableEmail(
  {
    to: 'petersemrany1@gmail.com',
    from: 'Bold <noreply@notify.hairtransplantgroup.com.au>',
    sender_domain: 'notify.hairtransplantgroup.com.au',
    subject,
    html,
    text,
    purpose: 'transactional',
    label: 'pack-renewal',
    idempotency_key: `pack-renewal-test-${Date.now()}`,
    unsubscribe_token: 'dd5632fd262873565b08ce5124c4ee112768bf808b9c639d38928b27288da4ac',
  },
  { apiKey: process.env.LOVABLE_API_KEY! }
)
console.log(JSON.stringify(res, null, 2))
