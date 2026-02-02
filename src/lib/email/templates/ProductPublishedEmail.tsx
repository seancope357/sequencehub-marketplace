/**
 * Product Published Email Template
 * Sent to creators when their product goes live
 */

import { Heading, Link, Text, Hr, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, styles } from './components/EmailLayout';
import type { ProductPublishedEmailData } from '../types';

export const ProductPublishedEmail = ({
  recipientName,
  productName,
  productSlug,
  productUrl,
  price,
  currency,
  publishDate,
}: ProductPublishedEmailData) => {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(price);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(publishDate));

  return (
    <EmailLayout preview={`Your product "${productName}" is now live!`}>
      <Heading style={styles.h1}>Your Product is Live! 🚀</Heading>

      <Text style={styles.text}>
        {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
      </Text>

      <Text style={styles.text}>
        Congratulations! Your sequence <strong>{productName}</strong> has been successfully
        published on SequenceHUB and is now available for purchase.
      </Text>

      {/* Product Details Box */}
      <Section style={{ ...styles.box, backgroundColor: '#dcfce7', borderLeft: '4px solid #16a34a' }}>
        <Text style={{ ...styles.label, color: '#15803d' }}>Now Live</Text>
        <Text style={{ ...styles.value, fontSize: '24px', color: '#15803d', margin: '8px 0 16px 0' }}>
          {productName}
        </Text>
        <Text style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a', margin: '0' }}>
          {formattedPrice}
        </Text>
      </Section>

      {/* CTA */}
      <Link href={productUrl} style={styles.button}>
        View Your Product Page
      </Link>

      <Hr style={styles.divider} />

      {/* Publishing Details */}
      <Heading style={styles.h2}>Publishing Details</Heading>

      <Section style={styles.box}>
        <Text style={styles.label}>Product Name</Text>
        <Text style={{ ...styles.text, margin: '0 0 12px 0' }}>{productName}</Text>

        <Text style={styles.label}>Price</Text>
        <Text style={{ ...styles.text, margin: '0 0 12px 0' }}>{formattedPrice}</Text>

        <Text style={styles.label}>Product URL</Text>
        <Text style={{ ...styles.text, margin: '0 0 12px 0', wordBreak: 'break-all' as const }}>
          <Link href={productUrl} style={styles.link}>
            {productUrl}
          </Link>
        </Text>

        <Text style={styles.label}>Published On</Text>
        <Text style={{ ...styles.text, margin: '0' }}>{formattedDate}</Text>
      </Section>

      <Hr style={styles.divider} />

      {/* Next Steps */}
      <Heading style={styles.h2}>What's Next?</Heading>

      <Text style={styles.text}>
        <strong>Share Your Product:</strong> Promote your sequence on social media, forums, and
        with your lighting community. The more people know about it, the more sales you'll get!
      </Text>

      <Text style={styles.text}>
        <strong>Track Your Sales:</strong> Monitor your product's performance in your creator
        dashboard. You'll receive email notifications whenever someone purchases your sequence.
      </Text>

      <Text style={styles.text}>
        <strong>Engage with Buyers:</strong> Respond to questions and feedback to build your
        reputation as a creator. Great customer service leads to more sales and positive reviews.
      </Text>

      <Link
        href={`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`}
        style={{ ...styles.buttonSecondary, display: 'block', textAlign: 'center' as const }}
      >
        Go to Dashboard
      </Link>

      <Hr style={styles.divider} />

      {/* Tips for Success */}
      <Section
        style={{
          ...styles.box,
          backgroundColor: '#eff6ff',
          borderLeft: '4px solid #3b82f6',
        }}
      >
        <Text style={{ ...styles.text, fontWeight: '600', color: '#1e40af', margin: '0 0 12px 0' }}>
          💡 Tips for Success
        </Text>
        <Text style={{ ...styles.text, fontSize: '14px', margin: '0 0 8px 0' }}>
          • Add high-quality preview images and videos
        </Text>
        <Text style={{ ...styles.text, fontSize: '14px', margin: '0 0 8px 0' }}>
          • Write detailed descriptions with xLights version compatibility
        </Text>
        <Text style={{ ...styles.text, fontSize: '14px', margin: '0 0 8px 0' }}>
          • Tag your product appropriately for better discoverability
        </Text>
        <Text style={{ ...styles.text, fontSize: '14px', margin: '0' }}>
          • Keep your sequences updated and add new versions over time
        </Text>
      </Section>

      <Hr style={styles.divider} />

      <Text style={styles.text}>
        Thank you for contributing to the xLights community! We're excited to see your sequences
        help bring holiday displays to life.
      </Text>

      <Text style={styles.text}>
        Need help?{' '}
        <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/support`} style={styles.link}>
          Contact support
        </Link>
        .
      </Text>

      <Text style={styles.text}>
        Best of luck with your sales!
        <br />
        The SequenceHUB Team
      </Text>
    </EmailLayout>
  );
};

export default ProductPublishedEmail;
