import { Suspense } from "react";
import { ParticipantResetPasswordPage } from "@/components/public/pages/participant-reset-password";
import type { Locale } from "@/i18n/locales";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <Suspense>
      <ParticipantResetPasswordPage locale={locale} />
    </Suspense>
  );
}
