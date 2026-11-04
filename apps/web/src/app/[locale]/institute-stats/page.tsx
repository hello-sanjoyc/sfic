import { InstituteStatsPage } from "@/components/public/pages/institute-stats";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <InstituteStatsPage locale={locale} />;
}
