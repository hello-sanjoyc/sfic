import { Disclaimer } from "@/components/public/pages/disclaimer";

export default async function DisclaimerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <Disclaimer locale={locale} />;
}
