import { JuryApplicationEvaluatePage } from "@/components/jury/pages/jury-application-evaluate";

export default async function Page({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return <JuryApplicationEvaluatePage applicationId={applicationId} />;
}
