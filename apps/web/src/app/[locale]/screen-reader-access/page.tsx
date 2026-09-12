import { ScreenReaderHelp } from "@/components/public/pages/screen-reader-help";

export default async function ScreenReaderAccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ScreenReaderHelp locale={locale} />;
}
