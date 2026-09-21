import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]"><aside className="bg-slate-950 p-6 text-white"><Link className="text-lg font-bold" href="/dashboard">Inno Challenge</Link><nav className="mt-10 grid gap-3 text-slate-300"><Link href="/dashboard">Dashboard</Link></nav></aside><main className="p-6 md:p-10">{children}</main></div>;
}
