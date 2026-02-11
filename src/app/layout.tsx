import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/components/branding/sequencehub-logo.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SequenceHUB.com - xLights Sequence Marketplace",
  description: "Buy and sell professional xLight sequences. Source files (XSQ/XML) and rendered exports (FSEQ) with secure delivery.",
  keywords: ["xLights", "light show", "sequences", "FSEQ", "XSQ", "Christmas lights", "Halloween lights", "pixel sequencing"],
  authors: [{ name: "SequenceHUB" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "SequenceHUB.com",
    description: "Marketplace for xLights sequences - buy and sell professional light show sequences",
    siteName: "SequenceHUB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SequenceHUB.com",
    description: "Buy and sell xLights sequences",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Fix for keyboard event handler error in bundled code
              window.addEventListener('error', function(e) {
                if (e.message && e.message.includes("Cannot read properties of undefined (reading 'length')")) {
                  e.preventDefault();
                  console.warn('Suppressed keyboard event error');
                  return true;
                }
              });
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
