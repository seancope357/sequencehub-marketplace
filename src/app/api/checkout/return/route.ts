import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      // Redirect to browse with error
      return NextResponse.redirect(`${BASE_URL}/browse?error=invalid_session`);
    }

    // Check if session exists in database
    const checkoutSession = await db.checkoutSession.findUnique({
      where: { sessionId },
    });

    if (!checkoutSession) {
      // Session not found - redirect to browse
      return NextResponse.redirect(`${BASE_URL}/browse?error=session_not_found`);
    }

    // Check session status
    if (checkoutSession.status === 'COMPLETED') {
      // Already processed - redirect to library with success
      return NextResponse.redirect(`${BASE_URL}/library?purchase=success`);
    }

    if (checkoutSession.status === 'CANCELED' || checkoutSession.status === 'EXPIRED') {
      // Canceled or expired - redirect to product
      const product = await db.product.findUnique({
        where: { id: checkoutSession.productId },
        select: { slug: true },
      });

      if (product) {
        return NextResponse.redirect(`${BASE_URL}/browse/products/${product.slug}?checkout=canceled`);
      }

      return NextResponse.redirect(`${BASE_URL}/browse?error=checkout_canceled`);
    }

    // Status is PENDING - webhook may not have processed yet
    // Redirect to library with pending status
    return NextResponse.redirect(`${BASE_URL}/library?purchase=pending`);
  } catch (error) {
    console.error('Error processing checkout return:', error);
    return NextResponse.redirect(`${BASE_URL}/browse?error=unknown`);
  }
}
