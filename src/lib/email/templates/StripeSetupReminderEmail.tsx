/**
 * Stripe Setup Reminder Email Template
 * Sent to creators who haven't completed Stripe onboarding
 */

import { Heading, Link, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, styles } from './components/EmailLayout';
import type { StripeSetupReminderEmailData } from '../types';

export const StripeSetupReminderEmail = ({
  recipientName,
  creatorName,
  onboardingUrl,
  draftProductCount,
}: StripeSetupReminderEmailData) => {
  return (
    <EmailLayout preview="Complete your Stripe setup to start selling">
      <Heading style={styles.h1}>Ready to Start Selling? 💰</Heading>

      <Text style={styles.text}>
        {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
      </Text>

      <Text style={styles.text}>
        We noticed you haven't completed your Stripe account setup yet. You're so close to being
        able to sell your xLights sequences on SequenceHUB!
      </Text>

      {draftProductCount > 0 && (
        <Section
          style={{
            ...styles.box,
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '20px',
          }}
        >
          <Text style={{ ...styles.text, margin: '0', color: '#92400e' }}>
            <strong>You have {draftProductCount} draft product{draftProductCount > 1 ? 's' : ''}{' '}
            waiting!</strong>
            <br />
            Complete your Stripe setup to publish and start earning.
          </Text>
        </Section>
      )}

      {/* CTA */}
      <Link href={onboardingUrl} style={styles.button}>
        Complete Stripe Setup
      </Link>

      <Hr style={styles.divider} />

      {/* Why Stripe */}
      <Heading style={styles.h2}>Why Do I Need Stripe?</Heading>

      <Text style={styles.text}>
        SequenceHUB uses Stripe Connect to handle payments securely. This means:
      </Text>

      <Section style={styles.box}>
        <Text style={styles.text}>
          ✅ <strong>Fast Payouts:</strong> Receive your earnings directly to your bank account
        </Text>
        <Text style={styles.text}>
          ✅ <strong>Secure Payments:</strong> Industry-leading payment security and fraud
          protection
        </Text>
        <Text style={styles.text}>
          ✅ <strong>Easy Management:</strong> Track sales, manage refunds, and view analytics in
          your Stripe dashboard
        </Text>
        <Text style={{ ...styles.text, margin: '0' }}>
          ✅ <strong>Customer Trust:</strong> Buyers can use credit cards, debit cards, and digital
          wallets
        </Text>
      </Section>

      <Hr style={styles.divider} />

      {/* Quick Setup */}
      <Heading style={styles.h2}>Setup Takes Just 5 Minutes</Heading>

      <Text style={styles.text}>You'll need to provide:</Text>

      <Section style={{ paddingLeft: '20px' }}>
        <Text style={styles.text}>• Business or personal information</Text>
        <Text style={styles.text}>• Bank account details for payouts</Text>
        <Text style={styles.text}>• Tax information (for compliance)</Text>
      </Section>

      <Text style={styles.text}>
        Once you're verified, you can immediately start publishing products and accepting payments.
      </Text>

      <Link href={onboardingUrl} style={{ ...styles.button, display: 'block', textAlign: 'center' as const }}>
        Get Started Now
      </Link>

      <Hr style={styles.divider} />

      <Text style={styles.text}>
        Questions about Stripe or the setup process?{' '}
        <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/support`} style={styles.link}>
          Contact our support team
        </Link>{' '}
        – we're here to help!
      </Text>

      <Text style={styles.text}>
        Looking forward to seeing your sequences on the marketplace!
        <br />
        The SequenceHUB Team
      </Text>
    </EmailLayout>
  );
};

export default StripeSetupReminderEmail;
