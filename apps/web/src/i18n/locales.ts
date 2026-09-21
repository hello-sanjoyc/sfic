export const locales = ["en", "bn", "hi"] as const;
export type Locale = (typeof locales)[number];
export const localeLabels: Record<Locale, string> = { en: "English", bn: "বাংলা", hi: "हिंदी" };
