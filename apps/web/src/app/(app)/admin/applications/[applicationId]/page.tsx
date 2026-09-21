import { AdminApplicationDetailsPage } from "@/components/admin/pages/admin-application-details";

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{
    applicationId: string;
  }>;
}>) {
  const { applicationId } = await params;

  return <AdminApplicationDetailsPage applicationId={applicationId} />;
}
