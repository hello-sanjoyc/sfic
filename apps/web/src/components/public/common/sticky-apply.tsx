"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Mobile-only bottom bar with the primary call to action. Hides once the closing CTA section is on screen. */
export function StickyApply({ href, label, hint, statusText, hideWhenVisible }: { href: string; label: string; hint: string; statusText: string; hideWhenVisible: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(hideWhenVisible);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hideWhenVisible]);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur transition-transform duration-300 md:hidden ${hidden ? "translate-y-full" : "translate-y-0"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#138808]"><span className="size-1.5 rounded-full bg-[#138808]" /> {statusText}</p>
          <p className="truncate text-xs font-semibold text-slate-600">{hint}</p>
        </div>
        <Link className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-[#ff9933] px-4 py-2.5 text-sm font-extrabold text-[#071426]" href={href}>{label} <ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}
