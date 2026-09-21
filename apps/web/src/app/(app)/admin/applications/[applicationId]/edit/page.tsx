import { AdminApplicationEditPage } from "@/components/admin/pages/admin-application-edit";

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{
    applicationId: string;
  }>;
}>) {
  const { applicationId } = await params;

  return <AdminApplicationEditPage applicationId={applicationId} />;
}
