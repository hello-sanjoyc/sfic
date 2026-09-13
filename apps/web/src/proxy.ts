import createMiddleware from "next-intl/middleware";

export default createMiddleware({ locales: ["en", "bn", "hi"], defaultLocale: "en", localePrefix: "always" });

export const config = { matcher: ["/", "/(en|bn|hi)/:path*", "/((?!api|_next|participants|dashboard|.*\\..*).*)"] };
