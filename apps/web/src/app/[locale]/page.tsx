import { PortalHome } from "@/components/public/pages/portal-home";
export default async function Home({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; return <PortalHome locale={locale} />; }
