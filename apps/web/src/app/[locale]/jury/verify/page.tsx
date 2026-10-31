import { JuryVerificationPage } from "@/components/jury/pages/jury-portal";
import type { Locale } from "@/i18n/locales";
import { Suspense } from "react";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <Suspense><JuryVerificationPage locale={locale} /></Suspense>;
}
