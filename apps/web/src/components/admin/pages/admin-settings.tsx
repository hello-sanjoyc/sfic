import {
  Building2,
  ChevronRight,
  Layers3,
  Map,
  MapPinned,
  ShieldCheck,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/common/admin-shell";

const settingsLinks = [
  {
    description: "Manage state master records used by applications.",
    href: "/admin/settings/states",
    icon: Map,
    label: "States",
  },
  {
    description: "Manage districts and their state mapping.",
    href: "/admin/settings/districts",
    icon: MapPinned,
    label: "Districts",
  },
  {
    description: "Manage institute and organisation type options.",
    href: "/admin/settings/institute-types",
    icon: Building2,
    label: "Institute Types",
  },
  {
    description: "Manage participant category master records.",
    href: "/admin/settings/participant-categories",
    icon: Layers3,
    label: "Participant Categories",
  },
  {
    description: "Manage challenge category options.",
    href: "/admin/settings/challenge-categories",
    icon: Tags,
    label: "Challenge Categories",
  },
  {
    description: "Manage admin user role definitions.",
    href: "/admin/settings/user-roles",
    icon: ShieldCheck,
    label: "User Roles",
  },
] as const;

export function AdminSettingsPage() {
  return (
    <AdminShell eyebrow="Master data and access configuration" title="Settings">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-black text-[#0b1f3a]">Settings Directory</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a master-data section to manage.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {settingsLinks.map(({ description, href, icon: Icon, label }) => (
            <Link
              className="group flex min-h-32 items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
              href={href}
              key={label}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-[#0b1f3a]">
                  {label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-500">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="mt-1 text-slate-400 group-hover:text-blue-600"
                size={20}
              />
            </Link>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
