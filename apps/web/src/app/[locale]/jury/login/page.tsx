import { JuryLoginPage } from "@/components/jury/pages/jury-portal";
import type { Locale } from "@/i18n/locales";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <JuryLoginPage locale={locale} />;
}
