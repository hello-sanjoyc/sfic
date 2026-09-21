import { Award, Mail, Plus, Star, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/common/admin-shell";

const juries = [
  ["Dr. Aditi Sen", "Healthcare", "18 assigned", "Active"],
  ["Prof. Rahul Verma", "Energy", "14 assigned", "Active"],
  ["Ananya Roy", "Education", "11 assigned", "Invited"],
  ["S. K. Prasad", "Agriculture", "16 assigned", "Active"],
] as const;

export function AdminJuriesPage() {
  return (
    <AdminShell eyebrow="Manage reviewers, assignments and jury capacity" title="Juries">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Juries", "38", Users],
          ["Active Reviewers", "31", Star],
          ["Pending Invites", "7", Mail],
          ["Avg. Score Given", "8.2", Award],
        ].map(([label, value, Icon]) => (
          <div className="flex min-h-28 items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label as string}>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
              <Icon size={27} />
            </div>
            <div>
              <p className="text-2xl font-black">{value as string}</p>
              <p className="text-sm font-medium text-slate-600">{label as string}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-black">Jury Panel</h2>
            <p className="text-sm text-slate-500">Reviewer assignments and availability</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white" type="button">
            <Plus size={17} /> Add Jury
          </button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          {juries.map(([name, domain, assigned, state]) => (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-5" key={name}>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-black text-blue-700">
                {name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
              </div>
              <h3 className="mt-4 text-base font-black">{name}</h3>
              <p className="text-sm text-slate-500">{domain}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">{assigned}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${state === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {state}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
