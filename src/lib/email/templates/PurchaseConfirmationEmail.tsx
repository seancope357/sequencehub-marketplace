/**
 * Purchase Confirmation Email Template
 * Sent to buyers after successful purchase
 */

import { Heading, Link, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, styles } from './components/EmailLayout';
import type { PurchaseConfirmationEmailData } from '../types';

export const PurchaseConfirmationEmail = ({
  recipientName,
  orderNumber,
  productName,
  productSlug,
  creatorName,
  totalAmount,
  currency,
  purchaseDate,
  libraryUrl,
  licenseType,
  downloadUrl,
}: PurchaseConfirmationEmailData) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(totalAmount);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(purchaseDate));

  return (
    <EmailLayout preview={`Your purchase of "${productName}" is confirmed!`}>
      <Heading style={styles.h1}>Thank You for Your Purchase! 🎉</Heading>

      <Text style={styles.text}>
        {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
      </Text>

      <Text style={styles.text}>
        Your purchase has been confirmed and your download is ready! You now have lifetime access
        to <strong>{productName}</strong> by {creatorName}.
      </Text>

      {/* Order Summary Box */}
      <Section style={styles.box}>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{orderNumber}</Text>

        <Hr style={{ ...styles.divider, margin: '16px 0' }} />

        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{productName}</Text>
        <Text style={{ ...styles.text, margin: '4px 0 0 0', fontSize: '14px' }}>
          by {creatorName}
        </Text>

        <Hr style={{ ...styles.divider, margin: '16px 0' }} />

        <Text style={styles.label}>Total Paid</Text>
        <Text style={styles.value}>{formattedAmount}</Text>

        <Hr style={{ ...styles.divider, margin: '16px 0' }} />

        <Text style={styles.label}>License Type</Text>
        <Text style={styles.value}>
          {licenseType === 'COMMERCIAL' ? 'Commercial Use' : 'Personal Use'}
        </Text>

        <Hr style={{ ...styles.divider, margin: '16px 0' }} />

        <Text style={styles.label}>Purchase Date</Text>
        <Text style={{ ...styles.text, margin: '0', fontSize: '14px' }}>{formattedDate}</Text>
      </Section>

      {/* Download CTA */}
      <Link href={downloadUrl} style={styles.button}>
        Download Your Files
      </Link>

      <Text style={{ ...styles.text, textAlign: 'center' as const, fontSize: '14px' }}>
        Your files are also available anytime in your library
      </Text>

      <Link
        href={libraryUrl}
        style={{ ...styles.buttonSecondary, display: 'block', textAlign: 'center' as const }}
      >
        View My Library
      </Link>

      <Hr style={styles.divider} />

      <Heading style={styles.h2}>What's Included</Heading>

      <Text style={styles.text}>
        This purchase includes lifetime access to all files for <strong>{productName}</strong>.
        You can download the files as many times as you need from your library.
      </Text>

      <Text style={styles.text}>
        <strong>License:</strong> Your {licenseType === 'COMMERCIAL' ? 'commercial' : 'personal'}{' '}
        license allows you to use this sequence{' '}
        {licenseType === 'COMMERCIAL'
          ? 'for any purpose, including commercial displays and client work'
          : 'for personal, non-commercial displays only'}
        .
      </Text>

      <Hr style={styles.divider} />

      <Heading style={styles.h2}>Need Help?</Heading>

      <Text style={styles.text}>
        If you have any questions about your purchase or need technical support, please{' '}
        <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/support`} style={styles.link}>
          contact our support team
        </Link>
        .
      </Text>

      <Text style={styles.text}>
        Thank you for supporting the xLights creator community!
        <br />
        The SequenceHUB Team
      </Text>
    </EmailLayout>
  );
};

export default PurchaseConfirmationEmail;
