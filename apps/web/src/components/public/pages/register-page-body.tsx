"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getSiteContent } from "@/content";
import { RegistrationProcessForm } from "./registration-process-form";

export function RegisterPageBody({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const content = getSiteContent(locale).register;
  const [showInfo, setShowInfo] = useState(false);

  return (
    <section
      className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
      id={id}
      tabIndex={id ? -1 : undefined}
    >
      <div className="mb-5 flex justify-end">
        <button
          className="text-sm font-bold text-[#000080] underline underline-offset-4 hover:text-[#0b1f3a]"
          onClick={() => setShowInfo(true)}
          type="button"
        >
          {content.showInfo}
        </button>
      </div>
      <RegistrationProcessForm showStartButton={false} startOpen />

      {showInfo && (
        <div
          aria-labelledby="registration-info-title"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-8"
          role="dialog"
        >
          <div className="mx-auto max-w-5xl rounded-xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#138808]">
                  {content.details}
                </p>
                <h2
                  className="mt-2 text-2xl font-bold text-[#0b1f3a]"
                  id="registration-info-title"
                >
                  {content.title}
                </h2>
              </div>
              <button
                aria-label={content.closeInfo}
                className="grid size-10 place-items-center rounded-md border border-slate-300 text-[#0b1f3a] hover:border-[#0b1f3a]"
                onClick={() => setShowInfo(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 grid gap-6">{children}</div>
          </div>
        </div>
      )}
    </section>
  );
}
