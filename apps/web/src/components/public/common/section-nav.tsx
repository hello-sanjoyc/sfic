"use client";

import { useEffect, useState } from "react";

export type SectionLink = { id: string; label: string };

export function SectionNav({ sections }: { sections: SectionLink[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const targets = sections.map((section) => document.getElementById(section.id)).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="mr-3 hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 lg:inline">On this page</span>
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <a
              className={`shrink-0 border-b-2 px-3 py-3 text-[13px] font-semibold transition ${isActive ? "border-[#ff9933] text-[#000080]" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-[#0b1f3a]"}`}
              aria-current={isActive ? "location" : undefined}
              href={`#${section.id}`}
              key={section.id}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
