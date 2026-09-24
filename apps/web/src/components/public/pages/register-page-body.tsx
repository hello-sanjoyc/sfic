"use client";

import { FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getSiteContent } from "@/content";
import { RegistrationProcessForm } from "./registration-process-form";

const guidelinesPdfByLocale: Record<string, string> = {
  bn: "/documents/SFIC-Guidelines-BN.pdf",
  en: "/documents/SFIC-Guidelines-EN.pdf",
  hi: "/documents/SFIC-Guidelines-HI.pdf",
};

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
  const guidelinesPdfHref =
    guidelinesPdfByLocale[locale] ?? guidelinesPdfByLocale.en;

  return (
    <section
      className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
      id={id}
      tabIndex={id ? -1 : undefined}
    >
      <div className="mb-5 flex justify-end">
        <a
          className="inline-flex items-center gap-2 rounded-full bg-[#000080] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b1f3a]"
          href={guidelinesPdfHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <FileText size={16} aria-hidden="true" />
          {content.showInfo}
        </a>
      </div>
      <RegistrationProcessForm showStartButton={false} startOpen />
      <div className="mt-16 sm:mt-20">{children}</div>
    </section>
  );
}
