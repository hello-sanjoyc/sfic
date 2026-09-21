import { TermsConditions } from "@/components/public/pages/terms-conditions";

export default async function TermsConditionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <TermsConditions locale={locale} />;
}
