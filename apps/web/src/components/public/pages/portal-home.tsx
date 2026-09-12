import {
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Medal,
    Scale,
    UserRoundSearch,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
    awards,
    benefits,
    evaluationCriteria,
    heroSlides,
    stages,
    themes,
} from "@/mocks/public";
import { getSiteContent } from "@/content";
import { FAQAccordion } from "../common/faq-accordion";
import { HeroSlider } from "../common/hero-slider";
import { LandingScrollRestorer } from "../common/landing-scroll-restorer";
import { SectionHeading } from "../common/section-heading";
import { StickyApply } from "../common/sticky-apply";

const accent = ["bg-[#ff9933]", "bg-[#000080]", "bg-[#138808]", "bg-[#0b1f3a]"];
const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Sewa First Innovation Challenge 2026 - Eastern Region",
    description:
        "The Eastern Region Sewa First Innovation Challenge invites students, young professionals, startups, independent innovators and community groups to identify real problems and develop practical solutions.",
    startDate: "2026-09-17",
    endDate: "2026-10-17",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    location: {
        "@type": "Place",
        name: "Kolkata",
        address: {
            "@type": "PostalAddress",
            addressLocality: "Kolkata",
            addressCountry: "IN",
        },
    },
    organizer: {
        "@type": "GovernmentOrganization",
        name: "Department of Science & Technology and Biotechnology, Government of West Bengal",
    },
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        validFrom: "2026-09-17",
        validThrough: "2026-10-17",
    },
};

export function PortalHome({ locale }: { locale: string }) {
    const content = getSiteContent(locale);
    const home = content.home;
    const link = (path: string) => `/${locale}${path}`;
    const slides = heroSlides.map((slide) => ({
        ...slide,
        eyebrow: home.heroSlides.find((item) => item.eyebrow === slide.eyebrow)
            ?.eyebrow ?? home.heroSlides[heroSlides.indexOf(slide)]?.eyebrow ?? slide.eyebrow,
        title: home.heroSlides[heroSlides.indexOf(slide)]?.title ?? slide.title,
        description:
            home.heroSlides[heroSlides.indexOf(slide)]?.description ??
            slide.description,
        primaryCTA: {
            ...slide.primaryCTA,
            label:
                home.heroSlides[heroSlides.indexOf(slide)]?.primaryCTA ??
                slide.primaryCTA.label,
            href: slide.primaryCTA.href.replace("/en", `/${locale}`),
        },
        secondaryCTA: {
            ...slide.secondaryCTA,
            label:
                home.heroSlides[heroSlides.indexOf(slide)]?.secondaryCTA ??
                slide.secondaryCTA.label,
            href: slide.secondaryCTA.href.replace("/en", `/${locale}`),
        },
    }));
    const localizedThemes = themes.map((theme, index) => ({
        ...theme,
        title: home.themes.items[index]?.[0] ?? theme.title,
        description: home.themes.items[index]?.[1] ?? theme.description,
    }));
    const localizedStages = stages.map((stage, index) => ({
        ...stage,
        title: home.stages.items[index]?.[0] ?? stage.title,
        window: home.stages.items[index]?.[1] ?? stage.window,
        format: home.stages.items[index]?.[2] ?? stage.format,
        description: home.stages.items[index]?.[3] ?? stage.description,
        outcome: home.stages.items[index]?.[4] ?? stage.outcome,
    }));
    const localizedAwards = awards.map((award, index) => ({
        ...award,
        title: home.recognition.awards[index]?.[0] ?? award.title,
        value: home.recognition.awards[index]?.[1] ?? award.value,
        note: home.recognition.awards[index]?.[2] ?? award.note,
    }));
    const localizedBenefits = benefits.map((benefit, index) => ({
        ...benefit,
        title: home.recognition.benefits[index]?.[0] ?? benefit.title,
        description:
            home.recognition.benefits[index]?.[1] ?? benefit.description,
    }));
    const localizedCriteria = evaluationCriteria.map((criterion, index) => ({
        ...criterion,
        title: home.evaluation.items[index]?.[0] ?? criterion.title,
        note: home.evaluation.items[index]?.[1] ?? criterion.note,
    }));

    return (
        <>
            <LandingScrollRestorer />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(eventJsonLd),
                }}
            />
            <HeroSlider slides={slides} />

            {/* Quick information bar */}
            <section
                id="page-main-content"
                className="relative z-10 border-b border-slate-200 bg-white"
                aria-label="Quick information"
                tabIndex={-1}
            >
                <div className="mx-auto grid max-w-7xl divide-y divide-slate-200 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:divide-x md:divide-y-0">
                    {home.quick.map(([label, value], index) => (
                        <div
                            data-motion="card"
                            className="relative flex min-h-[90px] flex-col justify-center py-3 md:px-6"
                            key={label}
                        >
                            {index === 0 && (
                                <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#138808]">
                                    <span className="size-1.5 rounded-full bg-[#138808]" />{" "}
                                    {home.liveNow}
                                </span>
                            )}
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                {label}
                            </p>
                            {index === 3 ? (
                                <Link
                                    className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-[#000080] hover:underline"
                                    href={link("#contact")}
                                >
                                    {value} <ArrowRight size={14} />
                                </Link>
                            ) : (
                                <p className="mt-0.5 text-sm font-bold text-[#0b1f3a]">
                                    {value}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Pathway */}
            <section className="border-b border-slate-200 bg-orange-50/70">
                <div className="mx-auto max-w-7xl px-4 py-6 text-center sm:px-6">
                    <p className="text-base font-extrabold leading-8 text-[#0b1f3a] md:text-xl">
                        {home.pathway}
                    </p>
                </div>
            </section>

            {/* About */}
            <section
                id="about"
                className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center"
            >
                <div>
                    <SectionHeading
                        eyebrow={home.about.eyebrow}
                        title={home.about.title}
                        description={home.about.description}
                    />
                    <ul className="mt-7 grid gap-3 text-slate-700">
                        {home.about.bullets.map((item) => (
                            <li className="flex gap-3" key={item}>
                                <CheckCircle2
                                    className="mt-0.5 shrink-0 text-[#138808]"
                                    size={19}
                                />
                                {item}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap items-center gap-5">
                        <Link
                            className="inline-flex items-center gap-2 font-bold text-[#0b1f3a] hover:underline"
                            href={link("#participation")}
                        >
                            {home.about.link} <ArrowRight size={17} />
                        </Link>
                    </div>
                </div>
                <div data-motion="image" className="relative aspect-[1.554/1] w-full">
                    <div
                        aria-hidden="true"
                        className="absolute left-0 top-0 h-[92.5%] w-[95.2%] bg-[#ffd280]"
                    />
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 right-0 h-[92.5%] w-[95.2%] bg-[#cdffb9]"
                    />
                    <div className="absolute left-[2.4%] top-[3.75%] h-[92.5%] w-[95.2%] overflow-hidden">
                        <Image
                            src="/images/about.webp"
                            alt="Researchers collaborating around a prototype"
                            fill
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            className="object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* Participation categories */}
            <section
                id="participation"
                className="border-y border-slate-200 bg-[#f4f7fa] py-20"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <SectionHeading
                        centered
                        eyebrow={home.participation.eyebrow}
                        title={home.participation.title}
                        description={home.participation.description}
                    />
                    <div className="mt-10 grid gap-5 lg:grid-cols-2">
                        {home.participation.categories.map((category, index) => (
                            <article
                                data-motion="card"
                                className="contrast-surface border border-slate-200 bg-white p-6"
                                key={category.title}
                            >
                                <span
                                    className={`block h-1 w-20 ${accent[index]}`}
                                />
                                <h3 className="mt-5 text-2xl font-bold text-[#0b1f3a]">
                                    {category.title}
                                </h3>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {category.people.map((person) => (
                                        <span
                                            className="rounded-sm bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
                                            key={person}
                                        >
                                            {person}
                                        </span>
                                    ))}
                                </div>
                                <p className="mt-5 leading-7 text-slate-600">
                                    {category.note}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Themes */}
            <section
                id="themes"
                className="border-b border-slate-200 bg-white py-20"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <SectionHeading
                        centered
                        eyebrow={home.themes.eyebrow}
                        title={home.themes.title}
                        description={home.themes.description}
                    />
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {localizedThemes.map((theme, index) => {
                            const Icon = theme.icon;
                            return (
                                <Link
                                    href={link("#themes")}
                                    data-motion="card"
                                    className="contrast-surface group relative border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#000080] hover:shadow-md"
                                    key={theme.slug}
                                >
                                    <span
                                        className={`absolute inset-x-0 top-0 h-1 ${accent[index % 3]}`}
                                    />
                                    <Icon
                                        className={`mt-2 ${index % 2 ? "text-[#138808]" : "text-[#ff9933]"}`}
                                        size={28}
                                    />
                                    <h3 className="mt-5 font-bold text-[#0b1f3a]">
                                        {theme.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {theme.description}
                                    </p>
                                    <p className="mt-4 font-mono text-xs font-semibold text-slate-500">
                                        {theme.count} {home.themes.possibleAreas}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Eastern focus */}
            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
                <SectionHeading
                    eyebrow={home.focus.eyebrow}
                    title={home.focus.title}
                    description={home.focus.description}
                />
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {home.focus.items.map(([title, description], index) => (
                        <article
                            data-motion="card"
                            className="contrast-surface border border-slate-200 bg-white p-5"
                            key={title}
                        >
                            <span
                                className={`block h-1 w-16 ${accent[index % accent.length]}`}
                            />
                            <h3 className="mt-5 font-bold text-[#0b1f3a]">
                                {title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {description}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            {/* Stages */}
            <section id="timeline" className="bg-white py-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex flex-wrap items-end justify-between gap-5">
                        <SectionHeading
                            eyebrow={home.stages.eyebrow}
                            title={home.stages.title}
                            description={home.stages.description}
                        />
                    </div>
                    <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {localizedStages.map((stage) => (
                            <li
                                data-motion="card"
                                className="contrast-surface group relative flex flex-col border border-slate-200 bg-white p-6 transition duration-300 ease-out hover:-translate-y-1 hover:border-[#ff9933] hover:shadow-[0_16px_36px_-22px_rgba(255,153,51,.9)]"
                                id={stage.slug}
                                key={stage.slug}
                            >
                                <span
                                    className="absolute inset-x-0 top-0 h-1 bg-slate-300 transition-colors duration-300 group-hover:bg-[#ff9933]"
                                />
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-mono text-3xl font-black leading-none text-slate-200">
                                        {stage.index}
                                    </span>
                                </div>
                                <h3 className="mt-5 text-lg font-bold leading-tight text-[#0b1f3a]">
                                    {stage.title}
                                </h3>
                                <p className="mt-2 font-mono text-sm font-bold text-[#000080]">
                                    {stage.window}
                                </p>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {stage.format}
                                </p>
                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    {stage.description}
                                </p>
                                <p className="mt-auto border-t border-slate-200 pt-4 text-sm">
                                    <span className="font-bold text-[#0b1f3a]">
                                        {home.stages.outcome} ·{" "}
                                    </span>
                                    <span className="text-slate-700">
                                        {stage.outcome}
                                    </span>
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Recognition */}
            <section
                id="awards"
                className="border-y border-slate-200 bg-[#f4f7fa] py-20"
            >
                <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
                    <div>
                        <SectionHeading
                            eyebrow={home.recognition.eyebrow}
                            title={home.recognition.title}
                            description={home.recognition.description}
                        />
                        <div className="mt-8 border border-slate-200 bg-white">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-[#f4f7fa] px-5 py-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {home.recognition.selected}
                                </p>
                                <p className="font-mono text-xs font-semibold text-slate-500">
                                    {home.recognition.subject}
                                </p>
                            </div>
                            <div className="px-5 py-6">
                                <p className="text-4xl font-black tracking-tight text-[#0b1f3a] md:text-5xl">
                                    {home.recognition.main}
                                </p>
                                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    {localizedAwards.map((award, index) => (
                                        <article
                                            data-motion="card"
                                            className="contrast-surface border border-slate-200 p-4"
                                            key={award.title}
                                        >
                                            <Medal
                                                className={
                                                    index === 0
                                                        ? "text-[#ff9933]"
                                                        : index === 1
                                                          ? "text-[#000080]"
                                                          : "text-[#138808]"
                                                }
                                            />
                                            <p className="mt-4 text-sm font-semibold text-slate-600">
                                                {award.title}
                                            </p>
                                            <p className="mt-1 text-xl font-bold text-[#0b1f3a]">
                                                {award.value}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {award.note}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                                <p className="mt-5 text-sm text-slate-600">
                                    {home.recognition.body}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div data-motion="card" className="rounded-xl bg-[#0b1f3a] p-7 text-white">
                        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ffd29f]">
                            {home.recognition.beyond}
                        </p>
                        <h3 className="mt-3 text-2xl font-bold">
                            {home.recognition.finalist}
                        </h3>
                        <div className="mt-7 grid gap-5 sm:grid-cols-2">
                            {localizedBenefits.map((benefit, index) => {
                                const Icon = benefit.icon;
                                return (
                                    <div
                                        className={`border-l-2 pl-4 ${index % 2 ? "border-[#138808]" : "border-[#ff9933]"}`}
                                        key={benefit.title}
                                    >
                                        <Icon
                                            size={18}
                                            className="text-slate-300"
                                            aria-hidden="true"
                                        />
                                        <p className="mt-2 font-bold">
                                            {benefit.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-slate-300">
                                            {benefit.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Submission requirements */}
            <section
                id="guidelines"
                className="border-b border-slate-200 bg-white py-20"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
                        <div className="lg:sticky lg:top-36">
                            <SectionHeading
                                eyebrow={home.submission.eyebrow}
                                title={home.submission.title}
                                description={home.submission.description}
                            />
                            <div className="mt-7 grid gap-3 text-sm text-slate-700">
                                <p className="flex gap-3">
                                    <Scale
                                        className="mt-0.5 shrink-0 text-[#000080]"
                                        size={18}
                                    />{" "}
                                    {home.submission.notes[0]}
                                </p>
                                <p className="flex gap-3">
                                    <ClipboardList
                                        className="mt-0.5 shrink-0 text-[#138808]"
                                        size={18}
                                    />{" "}
                                    {home.submission.notes[1]}
                                </p>
                                <p className="flex gap-3">
                                    <UserRoundSearch
                                        className="mt-0.5 shrink-0 text-[#ff9933]"
                                        size={18}
                                    />{" "}
                                    {home.submission.notes[2]}
                                </p>
                            </div>
                        </div>
                        <ol className="contrast-surface divide-y divide-slate-200 border border-slate-200 bg-white">
                            {home.submission.items.map(([title, description], index) => (
                                <li
                                    data-motion="card"
                                    className="grid gap-3 p-5 sm:grid-cols-[56px_1fr] sm:gap-5"
                                    key={title}
                                >
                                    <span className="font-mono text-2xl font-black leading-none text-[#0b1f3a]">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-[#0b1f3a]">
                                                {title}
                                            </h3>
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">
                                            {description}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* Evaluation */}
            <section
                id="panel"
                className="mx-auto max-w-7xl px-4 py-20 sm:px-6"
            >
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <SectionHeading
                        eyebrow={home.evaluation.eyebrow}
                        title={home.evaluation.title}
                        description={home.evaluation.description}
                    />
                </div>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    {localizedCriteria.map((criterion, index) => (
                        <article
                            data-motion="card"
                            className={`contrast-surface relative border border-slate-200 bg-white p-5 lg:col-span-2 ${index === 3 ? "lg:col-start-2" : ""}`}
                            key={criterion.title}
                        >
                            <span
                                className={`absolute inset-x-0 top-0 h-1 ${accent[index % accent.length]}`}
                            />
                            <h3 className="mt-4 font-bold text-[#0b1f3a]">
                                {criterion.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {criterion.note}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
                <div className="grid gap-10">
                    <SectionHeading
                        centered
                            eyebrow={home.faq.eyebrow}
                            title={home.faq.title}
                            description={home.faq.description}
                    />
                    <div className="mx-auto w-full max-w-4xl">
                    <FAQAccordion items={home.faqItems} />
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section id="apply" className="mx-auto max-w-7xl px-4 sm:px-6">
                <div data-motion="text" className="science-grid rounded-xl bg-[#071426] px-6 py-14 text-white md:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
                    <div>
                        <div className="tri-accent">
                            <span />
                            <span />
                            <span />
                        </div>
                        <h2 className="mt-6 max-w-2xl text-3xl font-bold md:text-4xl">
                        {home.heroSlides[0].title}
                        </h2>
                        <p className="mt-4 max-w-xl leading-7 text-slate-300">
                        {home.heroSlides[2].description}
                        </p>
                    </div>
                    <div className="mt-8 flex shrink-0 lg:mt-0">
                        <Link
                            className="rounded-md bg-[#ff9933] px-9 py-5 text-lg font-bold text-[#071426] transition hover:bg-[#f08a24]"
                            href={link("/register")}
                        >
                            {content.common.applyNow}
                        </Link>
                    </div>
                </div>
            </section>

            <span className="sticky-apply-spacer" aria-hidden="true" />
            <StickyApply
                href={link("/register")}
                label={content.common.applyNow}
                statusText={content.common.applicationsOpen}
                hint={`17 ${content.common.months.short.sep} - 17 ${content.common.months.short.oct} 2026`}
                hideWhenVisible="apply"
            />
        </>
    );
}
