import { IPPolicy } from "@/components/public/pages/ip-policy";

export default async function IPPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <IPPolicy locale={locale} />;
}
