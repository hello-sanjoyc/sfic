import { AdminUserEditPage } from "@/components/admin/pages/admin-users";

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{
    userId: string;
  }>;
}>) {
  const { userId } = await params;

  return <AdminUserEditPage userId={userId} />;
}
