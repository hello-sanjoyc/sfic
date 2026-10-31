import { ParticipantForgotPasswordPage } from "@/components/public/pages/participant-forgot-password";
import type { Locale } from "@/i18n/locales";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return <ParticipantForgotPasswordPage locale={locale} />;
}
