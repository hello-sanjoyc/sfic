import { PrivacyPolicy } from "@/components/public/pages/privacy-policy";

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PrivacyPolicy locale={locale} />;
}
