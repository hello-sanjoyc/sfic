import { Mail, Phone, ShieldCheck, User } from "lucide-react";
import { AdminShell } from "@/components/admin/common/admin-shell";

export function AdminProfilePage() {
  return (
    <AdminShell eyebrow="Your administrator identity and account details" title="Profile">
      <section className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-2xl font-black">
            SC
          </div>
          <h2 className="mt-5 text-2xl font-black">Sanjoy Chowdhury</h2>
          <p className="mt-1 text-sm font-bold text-blue-600">SUPERADMIN</p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-3"><Mail size={17} /> sany.chowdhury@gmail.com</span>
            <span className="inline-flex items-center gap-3"><Phone size={17} /> 9830799651</span>
            <span className="inline-flex items-center gap-3"><ShieldCheck size={17} /> Full programme access</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <User className="text-blue-600" size={22} />
            <div>
              <h2 className="text-lg font-black">Account Information</h2>
              <p className="text-sm text-slate-500">Static profile view for admin workspace</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Full Name", "Sanjoy Chowdhury"],
              ["Email Address", "sany.chowdhury@gmail.com"],
              ["Mobile Number", "9830799651"],
              ["Role", "SUPERADMIN"],
            ].map(([label, value]) => (
              <label className="text-sm font-bold text-slate-700" key={label}>
                {label}
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-sm font-normal text-slate-700 outline-none"
                  readOnly
                  value={value}
                />
              </label>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
