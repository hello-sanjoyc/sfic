import Link from "next/link";
import { getSiteContent } from "@/content";

export function PageHero({
  title,
  description,
  locale,
}: {
  title: string;
  description: string;
  locale: string;
}) {
  const content = getSiteContent(locale);

  return (
    <section className="inner-page-banner bg-[#0b1f3a] py-14 text-white md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm text-slate-300">
          <Link href={`/${locale}`} className="hover:underline">
            {content.header.nav.home}
          </Link>{" "}
          <span aria-hidden="true">/</span> {title}
        </p>
        <div className="tri-accent mt-6">
          <span />
          <span />
          <span />
        </div>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">
          {description}
        </p>
      </div>
    </section>
  );
}
