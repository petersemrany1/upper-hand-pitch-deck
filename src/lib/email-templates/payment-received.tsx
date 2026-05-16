import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface PaymentReceivedProps {
  amount?: string
  patientName?: string
  repName?: string
  leadId?: string
  paidAt?: string
}

const PaymentReceivedEmail = ({
  amount,
  patientName,
  repName,
  leadId,
  paidAt,
}: PaymentReceivedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {patientName ? `${patientName} just paid their deposit` : 'Deposit payment received'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Deposit payment received</Heading>
        <Text style={text}>A patient has just paid their consultation deposit.</Text>

        <Section style={box}>
          {patientName && <Text style={row}><strong>Patient:</strong> {patientName}</Text>}
          {amount && <Text style={row}><strong>Amount:</strong> {amount}</Text>}
          {repName && <Text style={row}><strong>Sales rep:</strong> {repName}</Text>}
          {paidAt && <Text style={row}><strong>Paid at:</strong> {paidAt}</Text>}
          {leadId && <Text style={rowMuted}><strong>Lead ID:</strong> {leadId}</Text>}
        </Section>

        <Text style={footer}>Hair Transplant Group · automated notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceivedEmail,
  subject: (d: Record<string, any>) =>
    d?.patientName
      ? `💳 Deposit paid — ${d.patientName}${d.amount ? ` (${d.amount})` : ''}`
      : `💳 Deposit payment received${d?.amount ? ` (${d.amount})` : ''}`,
  displayName: 'Payment received notification',
  to: 'peter@gobold.com.au',
  previewData: {
    amount: '$75.00 AUD',
    patientName: 'Jane Doe',
    repName: 'Alex Smith',
    leadId: 'abc-123',
    paidAt: 'Sat, 16 May 2026 1:47 pm',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.5', margin: '0 0 20px' }
const box = { backgroundColor: '#f6f8fa', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#111', margin: '4px 0' }
const rowMuted = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
