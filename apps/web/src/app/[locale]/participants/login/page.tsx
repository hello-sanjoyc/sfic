import { ParticipantLoginPage } from "@/components/public/pages/participant-login";
import type { Locale } from "@/i18n/locales";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return <ParticipantLoginPage locale={locale} />;
}
