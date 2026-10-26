import { AdminJuryProfilePage } from "@/components/admin/pages/admin-jury-profile";

export default async function Page({ params }: { params: Promise<{ juryId: string }> }) { const { juryId } = await params; return <AdminJuryProfilePage juryId={juryId} />; }
