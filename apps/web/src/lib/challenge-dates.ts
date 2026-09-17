import type { Locale } from "@/i18n/locales";

const defaultStartDate = "2026-09-17";
const defaultEndDate = "2026-10-30";

const localeMap: Record<Locale, string> = {
  bn: "bn-IN",
  en: "en-IN",
  hi: "hi-IN",
};

function normalizeIsoDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return fallback;

  return value;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatShortDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeMap[locale], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

const startIso = normalizeIsoDate(
  process.env.NEXT_PUBLIC_CHALLENGE_START_DATE,
  defaultStartDate,
);
const endIso = normalizeIsoDate(
  process.env.NEXT_PUBLIC_LAST_DATE_OF_SUBMISSION,
  defaultEndDate,
);

export const challengeDates = {
  endIso,
  startIso,
  display: {
    bn: formatDate(startIso, "bn"),
    en: formatDate(startIso, "en"),
    hi: formatDate(startIso, "hi"),
  },
  shortDisplay: {
    bn: formatShortDate(startIso, "bn"),
    en: formatShortDate(startIso, "en"),
    hi: formatShortDate(startIso, "hi"),
  },
} as const;
