import { AdminSettingsResourceFormPage } from "@/components/admin/pages/admin-settings-resource";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ itemId: string }> }>) {
  const { itemId } = await params;

  return <AdminSettingsResourceFormPage itemId={itemId} mode="edit" resourceKey="challenge-categories" />;
}
