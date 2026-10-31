import { JuryApplicationDetailsPage } from "@/components/jury/pages/jury-application-details";

export default async function Page({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return <JuryApplicationDetailsPage applicationId={applicationId} />;
}
