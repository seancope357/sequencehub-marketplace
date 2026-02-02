/**
 * Base Email Layout Component
 * Provides consistent styling and structure for all emails
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>SequenceHUB</Heading>
            <Text style={tagline}>xLights Sequences, Simplified</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} SequenceHUB. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings`} style={footerLink}>
                Notification Settings
              </Link>
              {' • '}
              <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/support`} style={footerLink}>
                Help & Support
              </Link>
            </Text>
            <Text style={footerTextSmall}>
              SequenceHUB is a marketplace for xLights sequence creators and buyers.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// ============================================
// STYLES
// ============================================

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 48px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6e6e6',
};

const logoText = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#16a34a',
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px',
};

const tagline = {
  fontSize: '14px',
  color: '#666666',
  margin: '0',
};

const content = {
  padding: '48px 48px 24px',
};

const footer = {
  padding: '0 48px 32px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e6e6e6',
  marginTop: '32px',
};

const footerText = {
  fontSize: '14px',
  color: '#666666',
  lineHeight: '24px',
  margin: '8px 0',
};

const footerTextSmall = {
  fontSize: '12px',
  color: '#999999',
  lineHeight: '20px',
  margin: '16px 0 0',
};

const footerLink = {
  color: '#16a34a',
  textDecoration: 'none',
};

// ============================================
// REUSABLE COMPONENT STYLES
// ============================================

export const styles = {
  h1: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 16px 0',
    lineHeight: '1.3',
  },
  h2: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '24px 0 12px 0',
    lineHeight: '1.4',
  },
  text: {
    fontSize: '16px',
    color: '#4a4a4a',
    lineHeight: '26px',
    margin: '0 0 16px 0',
  },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
    margin: '24px 0',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    color: '#1a1a1a',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
    margin: '12px 0',
  },
  divider: {
    borderTop: '1px solid #e6e6e6',
    margin: '24px 0',
  },
  box: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    margin: '16px 0',
  },
  label: {
    fontSize: '14px',
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 4px 0',
  },
  value: {
    fontSize: '18px',
    color: '#1a1a1a',
    fontWeight: '600',
    margin: '0',
  },
  link: {
    color: '#16a34a',
    textDecoration: 'underline',
  },
  code: {
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '14px',
    fontFamily: 'monospace',
    color: '#1a1a1a',
  },
};
