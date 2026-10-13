import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import type { TemplateEntry } from './registry';

function DepositReceived({ patientName, amount, paidAt, appointment, paymentId }: Record<string, string>) {
  return <Html><Head /><Preview>Deposit received from {patientName}</Preview>
    <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' }}>
      <Container style={{ padding: '24px', maxWidth: '560px' }}>
        <Heading>Deposit received</Heading>
        <Text>{patientName} has paid their deposit.</Text>
        <Text><strong>Amount:</strong> {amount}</Text>
        <Text><strong>Paid at (Sydney time):</strong> {paidAt}</Text>
        <Text><strong>Appointment at time of payment:</strong> {appointment}</Text>
        <Text><strong>Payment reference:</strong> {paymentId}</Text>
        <Text>Hair Transplant Group · automated notification</Text>
      </Container>
    </Body>
  </Html>;
}

export const template = {
  component: DepositReceived,
  subject: (data: Record<string, unknown>) => `Deposit received — ${data.patientName || 'Patient'}`,
  displayName: 'Deposit received',
  to: 'peter@gobold.com.au',
} satisfies TemplateEntry;
