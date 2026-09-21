import { Activity, CheckCircle2, Clock3, FileText, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/admin/common/admin-shell";

const activities = [
  ["Application assigned", "SFIC-WB-1028 assigned to Dr. Aditi Sen", "10 min ago", FileText],
  ["Jury invited", "Invitation sent to Ananya Roy", "32 min ago", UserPlus],
  ["Status updated", "SFIC-JH-0766 moved to Shortlisted", "1 hour ago", CheckCircle2],
  ["Review pending", "Seven applications nearing SLA threshold", "2 hours ago", Clock3],
] as const;

export function AdminActivitiesPage() {
  return (
    <AdminShell eyebrow="Recent administrative actions and system events" title="Activities">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <Activity className="text-blue-600" size={22} />
          <div>
            <h2 className="text-lg font-black">Activity Timeline</h2>
            <p className="text-sm text-slate-500">Latest programme operations</p>
          </div>
        </div>
        <div className="grid gap-0 divide-y divide-slate-100">
          {activities.map(([title, body, time, Icon]) => (
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-5" key={title}>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-600">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
              <p className="text-sm font-semibold text-slate-500">{time}</p>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
