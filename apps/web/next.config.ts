import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
    "default-src 'self'",

    // Allow Google Analytics / Google Tag Manager scripts
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,

    "style-src 'self' 'unsafe-inline'",

    // GA may use image/beacon requests
    "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",

    "font-src 'self' data:",

    // Allow your API + Google Analytics data collection
    `connect-src 'self' ${apiUrl}${isDev ? " ws:" : ""} https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com`,

    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

const securityHeaders = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
    reactStrictMode: true,

    allowedDevOrigins: [],

    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
