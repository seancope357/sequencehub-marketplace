/**
 * Download Ready Email Template
 * Sent when files are ready for download
 */

import { Heading, Link, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, styles } from './components/EmailLayout';
import type { DownloadReadyEmailData } from '../types';

export const DownloadReadyEmail = ({
  recipientName,
  productName,
  files,
  downloadUrl,
  expirationHours,
  rateLimit,
}: DownloadReadyEmailData) => {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <EmailLayout preview={`Your download is ready: ${productName}`}>
      <Heading style={styles.h1}>Your Download is Ready! 📦</Heading>

      <Text style={styles.text}>
        {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
      </Text>

      <Text style={styles.text}>
        Your files for <strong>{productName}</strong> are ready to download. Click the button
        below to start your download.
      </Text>

      {/* Download CTA */}
      <Link href={downloadUrl} style={styles.button}>
        Download Files ({formatSize(totalSize)})
      </Link>

      <Text style={{ ...styles.text, textAlign: 'center' as const, fontSize: '14px', color: '#666' }}>
        This download link expires in {expirationHours} hours
      </Text>

      <Hr style={styles.divider} />

      {/* Files List */}
      <Heading style={styles.h2}>What's Included</Heading>

      <Section style={styles.box}>
        {files.map((file, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Hr style={{ ...styles.divider, margin: '12px 0' }} />}
            <Section>
              <Text style={{ ...styles.text, margin: '0 0 4px 0', fontWeight: '600' }}>
                {file.name}
              </Text>
              <Text style={{ ...styles.text, margin: '0', fontSize: '14px', color: '#666' }}>
                {file.type} • {formatSize(file.size)}
              </Text>
            </Section>
          </React.Fragment>
        ))}
      </Section>

      <Hr style={styles.divider} />

      {/* Download Info */}
      <Heading style={styles.h2}>Download Information</Heading>

      <Text style={styles.text}>
        <strong>Rate Limit:</strong> You can download these files up to {rateLimit} times per day.
        If you need additional downloads, please contact support.
      </Text>

      <Text style={styles.text}>
        <strong>Lifetime Access:</strong> Don't worry about the expiration time – you can generate
        a new download link anytime from your library. Your purchase includes lifetime access to
        these files.
      </Text>

      <Link
        href={`${process.env.NEXT_PUBLIC_BASE_URL}/library`}
        style={{ ...styles.buttonSecondary, display: 'block', textAlign: 'center' as const }}
      >
        Go to My Library
      </Link>

      <Hr style={styles.divider} />

      <Text style={styles.text}>
        Need help? <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/support`} style={styles.link}>
          Contact our support team
        </Link>
        .
      </Text>

      <Text style={styles.text}>
        Happy sequencing!
        <br />
        The SequenceHUB Team
      </Text>
    </EmailLayout>
  );
};

export default DownloadReadyEmail;
