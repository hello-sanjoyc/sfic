import { AdminLoginPage } from "@/components/public/pages/admin-login";
import type { Locale } from "@/i18n/locales";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return <AdminLoginPage locale={locale} />;
}
