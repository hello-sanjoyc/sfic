import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sewa First Innovation Challenge, Under Sewa Sankalp Abhiyan",
  description: "Join the Sewa First Innovation Challenge 2026. A public innovation challenge for science and technology solutions with real-world impact. Open to participants from Eastern & North-Eastern India.",
  keywords: "innovation challenge, hackathon, startup, Sewa, West Bengal, Eastern India",
  authors: [{ name: "Department of Science & Technology and Biotechnology" }],
  creator: "Department of Science & Technology and Biotechnology, Government of West Bengal",
  publisher: "Government of West Bengal",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://sewa-innovation-challenge.wb.gov.in",
    languages: {
      en: "https://sewa-innovation-challenge.wb.gov.in/en",
      hi: "https://sewa-innovation-challenge.wb.gov.in/hi",
      bn: "https://sewa-innovation-challenge.wb.gov.in/bn",
    },
  },
  openGraph: {
    type: "website",
    url: "https://sewa-innovation-challenge.wb.gov.in",
    title: "Sewa First Innovation Challenge 2026",
    description: "Join the Sewa First Innovation Challenge 2026. Submit innovative solutions to real-world problems. Challenge period: 17 September - 17 October 2026.",
    siteName: "Sewa First Innovation Challenge",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sewa First Innovation Challenge 2026 - Eastern Region",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sewa First Innovation Challenge 2026",
    description: "Join the innovation challenge. Challenge period: 17 Sep - 17 Oct 2026. Open to Eastern & North-Eastern India.",
    images: ["/images/og-image.jpg"],
    creator: "@WBGovt",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  applicationName: "Sewa First Innovation Challenge",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sewa First Innovation Challenge",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0b1f3a" />
        <meta name="msapplication-TileColor" content="#ff9933" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
