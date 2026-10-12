import { AdminEmailNotificationAnalyticsPage } from "@/components/admin/pages/admin-email-notifications";

export default async function Page({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  const { notificationId } = await params;

  return <AdminEmailNotificationAnalyticsPage notificationId={notificationId} />;
}
