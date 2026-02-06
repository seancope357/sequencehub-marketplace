import type { Metadata } from "next";
import { Geist_Mono, Libre_Franklin } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getBaseUrl } from "@/lib/seo";

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  display: "swap",
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
  metadataBase: new URL(getBaseUrl()),
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "SequenceHUB.com",
    description: "Marketplace for xLights sequences - buy and sell professional light show sequences",
    siteName: "SequenceHUB",
    url: "/",
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
      <body
        className={`${libreFranklin.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
