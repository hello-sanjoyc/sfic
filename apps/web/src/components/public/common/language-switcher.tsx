"use client";

import { ChevronDown, Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/locales";

export function LanguageSwitcher() {
  const pathname = usePathname(); const router = useRouter();
  const current = (pathname.split("/")[1] || "en") as Locale;
  const change = (locale: Locale) => { const parts = pathname.split("/"); parts[1] = locale; router.push(parts.join("/") || `/${locale}`); };
  return <label className="relative flex items-center rounded-full border border-white/75 px-2.5 py-1 text-sm font-medium text-white"><Languages size={16} aria-hidden="true" /><span className="sr-only">Language</span><select aria-label="Choose language" className="appearance-none bg-transparent pl-1 pr-4 text-inherit outline-none" value={current} onChange={(event) => change(event.target.value as Locale)}>{locales.map((locale) => <option className="text-slate-900" key={locale} value={locale}>{localeLabels[locale]}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2" size={14} aria-hidden="true" /></label>;
}
