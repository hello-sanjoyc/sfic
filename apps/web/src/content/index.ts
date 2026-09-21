import { type Locale } from "@/i18n/locales";
import { bnContent } from "./bn";
import { enContent } from "./en";
import { hiContent } from "./hi";

export const siteContent = {
    en: enContent,
    bn: bnContent,
    hi: hiContent,
};

export type SiteContent = typeof enContent;

export function getSiteContent(locale: string): SiteContent {
    return siteContent[locale as Locale] ?? siteContent.en;
}
