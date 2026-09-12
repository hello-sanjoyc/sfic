"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getSiteContent } from "@/content";
import {
  scrollToPageSection,
} from "./one-page-nav";

export function MainHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";
  const content = getSiteContent(locale);
  const nav = [
    [content.header.nav.home, ""],
    [content.header.nav.about, "#about"],
    [content.header.nav.themes, "#themes"],
    [content.header.nav.timeline, "#timeline"],
    [content.header.nav.faq, "#faq"],
    [content.header.nav.contact, "#contact"],
  ];
  const [open, setOpen] = useState(false);
  const href = (part: string) => (part ? `/${locale}` : `/${locale}`);
  const actionHref = (path: string) => `/${locale}${path}`;
  const landingPath = `/${locale}`;
  const handleNavClick =
    (part: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setOpen(false);

      if (!part) {
        if (pathname === landingPath) {
          scrollToPageSection("");
          return;
        }
        router.push(landingPath, { scroll: false });
        return;
      }

      if (pathname === landingPath) {
        scrollToPageSection(part);
        return;
      }

      router.push(`${landingPath}${part}`);
    };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-[0_3px_16px_rgba(15,23,42,.04)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3.5 sm:px-6">
          <Link href={href("")} className="flex min-w-0 items-center gap-3.5">
            <Image src="/images/wb-logo.webp" alt="Government of West Bengal" width={56} height={56} className="size-12 shrink-0 object-contain" priority />
            <div className="min-w-0 border-l border-slate-200 pl-3 text-[#0b1f3a]">
              <div className="text-[16px] font-extrabold tracking-tight">{content.header.brand}</div>
              <div className="text-[14px] font-normal">{content.header.subtitle}</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-4 text-[15px] font-semibold text-slate-700 xl:flex">
            {nav.map(([label, part]) => <Link className="border-b-2 border-transparent py-2 transition hover:border-[#ff9933] hover:text-[#000080]" href={href(part)} key={label} onClick={handleNavClick(part)}>{label}</Link>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex"><Link className="text-base font-bold text-[#0b1f3a]" href={actionHref("/login")}>{content.common.login}</Link><Link className="rounded-sm bg-[#ff9933] px-4 py-2.5 text-base font-extrabold text-[#071426] transition hover:bg-[#f08a24]" href={actionHref("/register")}>{content.common.applyNow}</Link></div>
          <button className="rounded-full p-2 text-[#071426] xl:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={26} /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white text-[#071426]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5">
            <Link href={href("")} className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <Image src="/images/wb-logo.webp" alt="Government of West Bengal" width={40} height={40} className="size-10 object-contain" priority />
              <div className="min-w-0">
                <div className="text-sm font-extrabold tracking-tight">{content.header.brand}</div>
              </div>
            </Link>
            <button className="rounded-full p-2 text-[#071426]" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={28} /></button>
          </div>
          <nav className="divide-y divide-slate-200 bg-white">
            {nav.map(([label, part]) => (
              <Link
                className="block px-4 py-4 text-lg font-semibold text-[#071426] transition hover:bg-slate-50"
                href={href(part)}
                key={label}
                onClick={handleNavClick(part)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 bg-white px-4 py-4">
            <Link className="block rounded-sm bg-[#ff9933] px-4 py-3 text-center text-base font-extrabold text-[#071426] transition hover:bg-[#f08a24]" href={actionHref("/register")} onClick={() => setOpen(false)}>{content.common.applyNow}</Link>
            <Link className="mt-3 block px-4 py-3 text-center text-base font-semibold text-[#0b1f3a] transition hover:text-[#ff9933]" href={actionHref("/login")} onClick={() => setOpen(false)}>{content.common.login}</Link>
          </div>
        </div>
      )}
    </>
  );
}
