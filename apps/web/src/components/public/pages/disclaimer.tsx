"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSiteContent } from "@/content";

type DisclaimerProps = {
    locale: string;
};

export function Disclaimer({ locale }: DisclaimerProps) {
    const router = useRouter();
    const siteContent = getSiteContent(locale);
    const pageContent = siteContent.pages.disclaimer;
    const backLabel = locale === "en" ? "Back" : locale === "hi" ? "वापस जाएं" : "ফিরে যান";

    return (
        <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
            <div className="border-b border-[var(--border)] sticky top-0 z-10 bg-white">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition focus-visible:outline-offset-2"
                        aria-label={backLabel}
                    >
                        <ArrowLeft size={20} />
                        <span>{backLabel}</span>
                    </button>
                </div>
            </div>

            <main id="main-content" className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16">
                <header className="mb-12">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="tri-accent" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] tracking-tight mb-4">
                        {pageContent.title}
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">{pageContent.lastUpdated}</p>
                </header>

                <div className="space-y-12">
                    {pageContent.sections.map((section: any, index: number) => (
                        <section key={index} className="scroll-mt-24">
                            <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-4">
                                {section.heading}
                            </h2>
                            <div className="space-y-3">
                                {section.content.map((paragraph: string, pIndex: number) => (
                                    <p
                                        key={pIndex}
                                        className="text-base text-[var(--text-secondary)] leading-relaxed"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
}
