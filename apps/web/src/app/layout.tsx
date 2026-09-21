import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { challengeDates } from "@/lib/challenge-dates";
import "./globals.css";

const archivoBlack = localFont({
    src: "../fonts/ArchivoBlack-Regular.ttf",
    display: "swap",
    variable: "--font-archivo-black",
    weight: "400",
});

const ubuntu = localFont({
    src: [
        { path: "../fonts/Ubuntu-Light.ttf", weight: "300", style: "normal" },
        { path: "../fonts/Ubuntu-Regular.ttf", weight: "400", style: "normal" },
        { path: "../fonts/Ubuntu-Medium.ttf", weight: "500", style: "normal" },
        { path: "../fonts/Ubuntu-Bold.ttf", weight: "700", style: "normal" },
    ],
    display: "swap",
    variable: "--font-ubuntu",
});

const anekBangla = localFont({
    // Note: If you downloaded a variable font file from Google, point directly to it.
    // Otherwise, configure multiple weights in an array like Ubuntu above.
    src: "../fonts/AnekBangla.ttf",
    display: "swap",
    variable: "--font-anek-bangla",
});

const tiroBangla = localFont({
    src: "../fonts/TiroBangla-Regular.ttf",
    display: "swap",
    variable: "--font-tiro-bangla",
    weight: "400",
});

const rozhaOne = localFont({
    src: "../fonts/RozhaOne-Regular.ttf",
    display: "swap",
    variable: "--font-rozha-one",
    weight: "400",
});

const googleSans = localFont({
    src: [
        { path: "../fonts/GoogleSans-Regular.ttf", weight: "400", style: "normal" },
        { path: "../fonts/GoogleSans-Medium.ttf", weight: "500", style: "normal" },
        { path: "../fonts/GoogleSans-Bold.ttf", weight: "700", style: "normal" },
    ],
    display: "swap",
    variable: "--font-google-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sfic.wb.gov.in";
const ogImageUrl = `${siteUrl}/images/og-image.jpg`;

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export const metadata: Metadata = {
    title: "Seva First Innovation Challenge, Under Seva Sankalp Abhiyan",
    description:
        "Join the Seva First Innovation Challenge 2026. A public innovation challenge for science and technology solutions with real-world impact. Open to participants from Eastern & North-Eastern India.",
    keywords:
        "innovation challenge, hackathon, startup, Seva, West Bengal, Eastern India",
    authors: [{ name: "Department of Science & Technology and Biotechnology" }],
    creator:
        "Department of Science & Technology and Biotechnology, Government of West Bengal",
    publisher: "Government of West Bengal",
    robots: "index, follow",
    icons: {
        icon: [
            { url: "/images/favicon.ico", sizes: "any" },
            { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        shortcut: "/images/favicon.ico",
        apple: "/images/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
    alternates: {
        canonical: siteUrl,
        languages: {
            en: `${siteUrl}/en`,
            hi: `${siteUrl}/hi`,
            bn: `${siteUrl}/bn`,
        },
    },
    openGraph: {
        type: "website",
        url: siteUrl,
        title: "Seva First Innovation Challenge 2026",
        description:
            `Join the Seva First Innovation Challenge 2026. Submit innovative solutions to real-world problems. Challenge open: ${challengeDates.display.en}.`,
        siteName: "Seva First Innovation Challenge",
        images: [
            {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: "Seva First Innovation Challenge 2026 - Eastern Region",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Seva First Innovation Challenge 2026",
        description:
            `Join the innovation challenge. Challenge open: ${challengeDates.shortDisplay.en}. Open to Eastern & North-Eastern India.`,
        images: [ogImageUrl],
        creator: "@WBGovt",
    },
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    applicationName: "Seva First Innovation Challenge",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Seva First Innovation Challenge",
    },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${archivoBlack.variable} ${ubuntu.variable} ${anekBangla.variable} ${tiroBangla.variable} ${rozhaOne.variable} ${googleSans.variable}`}>
            <head>
                <meta name="theme-color" content="#0b1f3a" />
                <meta name="msapplication-TileColor" content="#ff9933" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <link rel="icon" href="/images/favicon.ico" sizes="any" />
                <link
                    rel="icon"
                    href="/images/favicon-32x32.png"
                    sizes="32x32"
                    type="image/png"
                />
                <link
                    rel="icon"
                    href="/images/favicon-16x16.png"
                    sizes="16x16"
                    type="image/png"
                />
                <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body>{children}</body>
        </html>
    );
}