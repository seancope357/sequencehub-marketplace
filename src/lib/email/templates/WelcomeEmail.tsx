/**
 * Welcome Email Template
 * Sent when a user registers on SequenceHUB
 */

import { Heading, Link, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, styles } from './components/EmailLayout';
import type { WelcomeEmailData } from '../types';

export const WelcomeEmail = ({
  userName,
  dashboardUrl,
  registrationDate,
}: WelcomeEmailData) => {
  return (
    <EmailLayout preview={`Welcome to SequenceHUB, ${userName}!`}>
      <Heading style={styles.h1}>Welcome to SequenceHUB! 🎄</Heading>

      <Text style={styles.text}>
        Hi <strong>{userName}</strong>,
      </Text>

      <Text style={styles.text}>
        Thanks for joining SequenceHUB, the marketplace built for the xLights community! Whether
        you're here to discover amazing sequences or share your own creations, you're now part of a
        growing community of passionate lighting enthusiasts.
      </Text>

      <Link href={dashboardUrl} style={styles.button}>
        Go to Your Dashboard
      </Link>

      <Hr style={styles.divider} />

      <Heading style={styles.h2}>What You Can Do Now</Heading>

      <Text style={styles.text}>
        <strong>Browse the Marketplace:</strong> Discover professional xLights sequences from
        talented creators. Filter by category, holiday, or price to find exactly what you need.
      </Text>

      <Text style={styles.text}>
        <strong>Start Selling:</strong> Ready to share your sequences? Set up your Stripe account
        and publish your first product in minutes.
      </Text>

      <Text style={styles.text}>
        <strong>Download & Organize:</strong> Your purchased sequences are always available in your
        library, with secure downloads and lifetime access.
      </Text>

      <Hr style={styles.divider} />

      <Heading style={styles.h2}>Need Help?</Heading>

      <Text style={styles.text}>
        Check out our{' '}
        <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/docs`} style={styles.link}>
          documentation
        </Link>{' '}
        or reach out to our{' '}
        <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/support`} style={styles.link}>
          support team
        </Link>
        . We're here to help!
      </Text>

      <Text style={styles.text}>
        Happy sequencing!
        <br />
        The SequenceHUB Team
      </Text>
    </EmailLayout>
  );
};

export default WelcomeEmail;
