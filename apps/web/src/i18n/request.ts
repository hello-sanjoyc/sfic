import { getRequestConfig } from "next-intl/server";
import { locales, type Locale } from "./locales";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const safeLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : "en";
  return { locale: safeLocale, messages: (await import(`../messages/${safeLocale}.json`)).default };
});
