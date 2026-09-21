"use client";

import {
  ClipboardList,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";

type AdminSession = {
  actor?: string;
  admin?: {
    email?: string;
    name?: string;
    role?: string;
  };
  session?: {
    token?: string;
  };
};

const defaultAdmin = {
  email: "sany.chowdhury@gmail.com",
  name: "Sanjoy Chowdhury",
  role: "SUPERADMIN",
};

const navItems = [
  ["Dashboards", Home, "/admin/dashboard"],
  ["Applications", ClipboardList, "/admin/applications"],
  ["Users", Users, "/admin/users"],
  ["Settings", Settings, "/admin/settings"],
] as const;

function parseSession(value: string | null): AdminSession | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as AdminSession;
  } catch {
    return null;
  }
}

function isAdminSession(session: AdminSession | null) {
  return Boolean(
    session?.actor === "admin" &&
      session.admin?.email &&
      session.session?.token,
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdminShell({
  children,
  eyebrow,
  title,
}: Readonly<{
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(defaultAdmin);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  useEffect(() => {
    const session = parseSession(localStorage.getItem(AUTH_STORAGE_KEY));

    if (!isAdminSession(session)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      router.replace("/en/admin/login");
      return;
    }

    setAdmin({
      email: session?.admin?.email ?? defaultAdmin.email,
      name: session?.admin?.name ?? defaultAdmin.name,
      role: session?.admin?.role ?? defaultAdmin.role,
    });
    setIsSessionChecked(true);
  }, [router]);

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    router.replace("/en/admin/login");
    router.refresh();
  };

  if (!isSessionChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8fc] text-sm font-semibold text-slate-500">
        Loading admin workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#0b1f3a]">
      <div className="min-h-screen lg:pl-[17rem]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] bg-[#08213c] text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-7">
            <Image
              alt="Seva First Innovation Challenge"
              className="size-12 rounded-md bg-white object-contain p-1"
              height={56}
              src="/images/logo.webp"
              width={56}
            />
            <div>
              <p className="text-2xl font-black leading-none">SFIC</p>
              <p className="mt-1 text-xs font-semibold text-blue-100">
                Admin Workspace
              </p>
            </div>
          </div>

          <nav className="grid gap-2 px-3">
            {navItems.map(([label, Icon, href]) => {
              const active =
                pathname === href ||
                (href !== "/admin/dashboard" && pathname.startsWith(href));

              return (
                <Link
                  className={`flex h-12 items-center gap-4 rounded-lg px-5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                  href={href}
                  key={label}
                >
                  <Icon size={21} />
                  <span>{label}</span>
                </Link>
              );
            })}
            <button
              className="flex h-12 items-center gap-4 rounded-lg px-5 text-left text-sm font-semibold text-blue-100 transition hover:bg-white/10"
              onClick={logout}
              type="button"
            >
              <LogOut size={21} />
              <span>Logout</span>
            </button>
          </nav>

          <div className="mt-auto" />
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 py-4 md:px-10">
            <div className="flex min-h-16 items-center gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-normal text-black md:text-3xl">
                  {title}
                </h1>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-600">
                  {eyebrow ?? "Seva First Innovation Challenge"}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#f7eee6] to-[#edf2f7] text-base font-black text-[#0b1f3a]">
                  {initials(admin.name)}
                </div>
                <div className="hidden min-w-40 sm:block">
                  <p className="text-base font-black leading-tight text-[#0b1f3a]">
                    {admin.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {admin.role === "SUPERADMIN" ? "Super Admin" : admin.role}
                  </p>
                </div>
                <button
                  aria-label="Logout"
                  className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  onClick={logout}
                  type="button"
                >
                  <LogOut size={22} />
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 p-4 md:p-7">
            {children}
            <div className="rounded-lg border border-blue-100 bg-white p-4 text-sm text-slate-600 shadow-sm lg:hidden">
              <ShieldCheck className="mr-2 inline text-blue-600" size={18} />
              The admin workspace remains usable on smaller screens and is
              optimized for desktop review workflows.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
