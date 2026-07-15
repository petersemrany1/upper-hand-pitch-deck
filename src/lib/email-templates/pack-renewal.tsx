import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const LOGO_URL = 'https://hairtransplantgroup.lovable.app/__l5e/assets-v1/f218f3b7-4be4-4997-8e23-ec25d318af9d/bold-logo.png'

interface PackRenewalProps {
  clinicName?: string
  contactName?: string
}

const STRIPE_LINKS = {
  ten: 'https://buy.stripe.com/28EcN77fOd3pf6Jb1mffy03',
  twenty: 'https://buy.stripe.com/8x2bJ39nW8N9f6JfhCffy01',
  forty: 'https://buy.stripe.com/8x28wRdEc2oL9Mp7Paffy06',
}

const PackRenewalEmail = ({ clinicName, contactName }: PackRenewalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      You've used all your patient credits — top up to keep the bookings coming.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Img src={LOGO_URL} alt="Bold" width="56" height="56" style={{ display: 'block', margin: '0 auto', borderRadius: '50%' }} />
        </Section>

        <Heading style={h1}>Your pack is empty</Heading>

        <Text style={text}>
          {contactName ? `Hi ${contactName},` : 'Hi there,'}
        </Text>

        <Text style={text}>
          {clinicName ? `${clinicName} has used ` : "You've used "}
          all of the patient credits in your current pack. To keep receiving
          new patient bookings without interruption, choose a top-up below.
        </Text>

        <Section style={packGrid}>
          <Section style={packBox}>
            <Text style={packTitle}>10 Patient Pack</Text>
            <Button href={STRIPE_LINKS.ten} style={btnSecondary}>
              Buy 10 Pack →
            </Button>
          </Section>

          <Section style={packBoxHighlight}>
            <Text style={packBadge}>MOST POPULAR</Text>
            <Text style={packTitle}>20 Patient Pack</Text>
            <Button href={STRIPE_LINKS.twenty} style={btnPrimary}>
              Buy 20 Pack →
            </Button>
          </Section>

          <Section style={packBox}>
            <Text style={packTitle}>40 Patient Pack</Text>
            <Button href={STRIPE_LINKS.forty} style={btnSecondary}>
              Buy 40 Pack →
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        <Text style={smallText}>
          Payment is processed securely through Stripe. Your next pack activates
          the moment payment clears — no waiting, no paperwork.
        </Text>

        <Text style={smallText}>
          Questions or need a custom quote? Just reply to this email.
        </Text>

        <Text style={footer}>Bold — Patient acquisition for clinics</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PackRenewalEmail,
  subject: (d: Record<string, any>) =>
    d?.clinicName
      ? `${d.clinicName} — you've used all your patient credits`
      : `You've used all your patient credits — time to renew`,
  displayName: 'Pack renewal — credits exhausted',
  previewData: {
    clinicName: 'Absolute Cosmetic',
    contactName: 'Peter',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f4f4f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '16px 12px', margin: '0' }
const container = { padding: '0', maxWidth: '580px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' as const }
const brandBar = { padding: '20px 24px 16px', borderBottom: '3px solid #111', textAlign: 'center' as const }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '22px 24px 18px', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.6', margin: '0 24px 14px' }
const packBox = { backgroundColor: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px 16px', margin: '12px 24px', textAlign: 'center' as const }
const packBoxHighlight = { backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '10px', padding: '20px 16px', margin: '12px 24px', textAlign: 'center' as const }
const packBadge = { fontSize: '11px', fontWeight: 'bold' as const, color: '#b45309', letterSpacing: '1.5px', margin: '0 0 6px', textAlign: 'center' as const }
const packTitle = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 14px', textAlign: 'center' as const }
const btnPrimary = { backgroundColor: '#111', color: '#fff', padding: '12px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
const btnSecondary = { backgroundColor: '#fff', color: '#111', padding: '12px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block', border: '1.5px solid #111' }
const hr = { borderColor: '#e5e7eb', margin: '24px 24px 18px' }
const smallText = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '0 24px 12px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '22px 24px 26px', paddingTop: '10px' }
