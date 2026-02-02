/**
 * Sale Notification Email Template
 * Sent to creators when their product is purchased
 */

import { Heading, Link, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, styles } from './components/EmailLayout';
import type { SaleNotificationEmailData } from '../types';

export const SaleNotificationEmail = ({
  recipientName,
  orderNumber,
  productName,
  productSlug,
  buyerName,
  saleAmount,
  platformFeeAmount,
  netEarnings,
  currency,
  saleDate,
  dashboardUrl,
}: SaleNotificationEmailData) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(saleDate));

  const platformFeePercent = ((platformFeeAmount / saleAmount) * 100).toFixed(1);

  return (
    <EmailLayout preview={`You made a sale! "${productName}" (${formatCurrency(netEarnings)})`}>
      <Heading style={styles.h1}>Congratulations! You Made a Sale! 🎉</Heading>

      <Text style={styles.text}>
        {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
      </Text>

      <Text style={styles.text}>
        Great news! Your sequence <strong>{productName}</strong> was just purchased
        {buyerName ? ` by ${buyerName}` : ''}.
      </Text>

      {/* Earnings Highlight */}
      <Section
        style={{
          ...styles.box,
          backgroundColor: '#dcfce7',
          borderLeft: '4px solid #16a34a',
          padding: '24px',
          textAlign: 'center' as const,
        }}
      >
        <Text style={{ ...styles.label, color: '#15803d' }}>Your Earnings</Text>
        <Text style={{ ...styles.value, fontSize: '32px', color: '#15803d', margin: '8px 0' }}>
          {formatCurrency(netEarnings)}
        </Text>
        <Text style={{ fontSize: '14px', color: '#16a34a', margin: '0' }}>
          After platform fee ({platformFeePercent}%)
        </Text>
      </Section>

      {/* Sale Details Box */}
      <Section style={styles.box}>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{orderNumber}</Text>

        <Hr style={{ ...styles.divider, margin: '16px 0' }} />

        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{productName}</Text>

        {buyerName && (
          <>
            <Hr style={{ ...styles.divider, margin: '16px 0' }} />
            <Text style={styles.label}>Buyer</Text>
            <Text style={{ ...styles.text, margin: '0', fontSize: '14px' }}>{buyerName}</Text>
          </>
        )}

        <Hr style={{ ...styles.divider, margin: '16px 0' }} />

        <Text style={styles.label}>Sale Date</Text>
        <Text style={{ ...styles.text, margin: '0', fontSize: '14px' }}>{formattedDate}</Text>
      </Section>

      {/* Earnings Breakdown */}
      <Section style={styles.box}>
        <Heading style={{ ...styles.h2, margin: '0 0 16px 0' }}>Earnings Breakdown</Heading>

        <Section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text style={{ ...styles.text, margin: '0' }}>Sale Amount</Text>
          <Text style={{ ...styles.text, margin: '0', fontWeight: '600' }}>
            {formatCurrency(saleAmount)}
          </Text>
        </Section>

        <Section style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text style={{ ...styles.text, margin: '0', color: '#666' }}>
            Platform Fee ({platformFeePercent}%)
          </Text>
          <Text style={{ ...styles.text, margin: '0', color: '#666' }}>
            -{formatCurrency(platformFeeAmount)}
          </Text>
        </Section>

        <Hr style={{ ...styles.divider, margin: '12px 0' }} />

        <Section style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ ...styles.value, margin: '0' }}>Your Earnings</Text>
          <Text style={{ ...styles.value, margin: '0', color: '#16a34a' }}>
            {formatCurrency(netEarnings)}
          </Text>
        </Section>
      </Section>

      {/* CTA */}
      <Link href={dashboardUrl} style={styles.button}>
        View in Dashboard
      </Link>

      <Hr style={styles.divider} />

      <Heading style={styles.h2}>When Will I Get Paid?</Heading>

      <Text style={styles.text}>
        Your earnings will be automatically transferred to your connected Stripe account based on
        your payout schedule (typically daily or weekly). You can view your payout history and
        manage your banking details in your Stripe Dashboard.
      </Text>

      <Link
        href="https://dashboard.stripe.com"
        style={{ ...styles.link, display: 'block', marginTop: '12px' }}
      >
        Open Stripe Dashboard →
      </Link>

      <Hr style={styles.divider} />

      <Text style={styles.text}>
        Keep up the great work! Every sale helps grow the xLights community.
        <br />
        <br />
        The SequenceHUB Team
      </Text>
    </EmailLayout>
  );
};

export default SaleNotificationEmail;
