import { AccessibilityStatement } from "@/components/public/pages/accessibility-statement";

export default async function AccessibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AccessibilityStatement locale={locale} />;
}
