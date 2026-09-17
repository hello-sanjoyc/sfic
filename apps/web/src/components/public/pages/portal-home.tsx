import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ClipboardList,
    CloudRain,
    Diamond,
    Fish,
    Grid3X3,
    Leaf,
    Mountain,
    Scale,
    Target,
    TrendingUp,
    UsersRound,
    UserRoundSearch,
    Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
    benefits,
    evaluationCriteria,
    flowNodes,
    heroSlides,
    stages,
    themes,
} from "@/mocks/public";
import { getSiteContent } from "@/content";
import { challengeDates } from "@/lib/challenge-dates";
import { FAQAccordion } from "../common/faq-accordion";
import { HeroSlider } from "../common/hero-slider";
import { LandingScrollRestorer } from "../common/landing-scroll-restorer";
import { SectionHeading } from "../common/section-heading";
import { StickyApply } from "../common/sticky-apply";

const accent = ["bg-[#ff9933]", "bg-[#000080]", "bg-[#138808]", "bg-[#0b1f3a]"];
const categoryBackground = ["bg-[#fff8f0]", "bg-[#e9f0fb]"];
const chipBackground = ["bg-[#ffe9cc]", "bg-[#d6e4f7]"];
const principleIcons = [Target, Diamond, TrendingUp];
const principleIconColor = [
    "text-[#ff9933]",
    "text-[#000080]",
    "text-[#138808]",
];
const focusCards = [
    {
        icon: CloudRain,
        tone: "bg-[#ff7a1a]",
    },
    {
        icon: Mountain,
        tone: "bg-[#334196]",
    },
    {
        icon: Leaf,
        tone: "bg-[#258834]",
    },
    {
        icon: Fish,
        tone: "bg-[#2f72d7]",
    },
    {
        icon: UsersRound,
        tone: "bg-[#ff7a1a]",
    },
    {
        icon: Grid3X3,
        tone: "bg-[#0a348f]",
    },
    {
        icon: Waves,
        tone: "bg-[#258834]",
    },
];

function FlowNodeCard({
    node,
    tone = false,
}: {
    node: (typeof flowNodes)[number] & { title: string; note: string };
    tone?: boolean;
}) {
    const Icon = node.icon;
    return (
        <div
            data-motion="card"
            className={`flex items-center gap-3 rounded-full border py-2.5 pl-2.5 pr-5 shadow-md transition duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${
                tone ? "sm:min-w-[19rem] sm:flex-1" : "w-full max-w-xs"
            }`}
            style={{
                backgroundColor: `color-mix(in srgb, ${node.color} 12%, white)`,
                borderColor: `color-mix(in srgb, ${node.color} 30%, white)`,
            }}
        >
            <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: node.color }}
            >
                <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-left">
                <span className="block whitespace-nowrap text-base font-bold text-[#0b1f3a]">
                    {node.title}
                </span>
                <span className="block whitespace-nowrap text-sm text-slate-500">
                    {node.note}
                </span>
            </span>
        </div>
    );
}
const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Seva First Innovation Challenge 2026 - Eastern Region",
    description:
        "The Eastern Region Seva First Innovation Challenge invites students, young professionals, startups, independent innovators and community groups to identify real problems and develop practical solutions.",
    startDate: challengeDates.startIso,
    endDate: challengeDates.endIso,
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
        validFrom: challengeDates.startIso,
        validThrough: challengeDates.endIso,
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
    const localizedBenefits = benefits.map((benefit, index) => ({
        ...benefit,
        title: home.recognition.benefits[index]?.[0] ?? benefit.title,
        description:
            home.recognition.benefits[index]?.[1] ?? benefit.description,
    }));
    const localizedFlow = flowNodes.map((node, index) => ({
        ...node,
        title: home.recognition.flow[index]?.title ?? node.title,
        note: home.recognition.flow[index]?.note ?? node.note,
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
                    <ul className="mt-7 grid gap-4 text-slate-700">
                        {home.about.bullets.map((item, index) => {
                            const Icon = principleIcons[index % principleIcons.length];
                            const heading = home.about.principles[index]?.label;
                            return (
                                <li className="flex gap-3" key={item}>
                                    <Icon
                                        className={`mt-0.5 shrink-0 ${principleIconColor[index % principleIconColor.length]}`}
                                        size={19}
                                    />
                                    <p>
                                        {heading && (
                                            <span className="font-extrabold text-[#0b1f3a]">
                                                {heading}:{" "}
                                            </span>
                                        )}
                                        {item}
                                    </p>
                                </li>
                            );
                        })}
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
                        className="absolute left-0 top-0 h-[92.5%] w-[95.2%] rounded-3xl bg-[#ffd280]"
                    />
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 right-0 h-[92.5%] w-[95.2%] rounded-3xl bg-[#cdffb9]"
                    />
                    <div className="absolute left-[2.4%] top-[3.75%] h-[92.5%] w-[95.2%] overflow-hidden rounded-3xl">
                        <Image
                            src="/images/about.webp"
                            alt="Researchers collaborating around a prototype"
                            fill
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            className="rounded-3xl object-cover"
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
                                className={`contrast-surface rounded-2xl border border-slate-200 p-6 ${categoryBackground[index % categoryBackground.length]}`}
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
                                            className={`rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 ${chipBackground[index % chipBackground.length]}`}
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
                                    className="contrast-surface group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#000080] hover:shadow-md"
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
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Eastern focus */}
            <section
                className="relative overflow-hidden bg-[#f8fbfb] py-16 lg:py-20"
                style={{
                    backgroundImage: "url('/images/eastern-region.webp')",
                    backgroundPosition: "center bottom",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                }}
            >
                <div className="absolute inset-0 bg-white/45" aria-hidden="true" />
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="max-w-4xl">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0b1f3a]">
                            {home.focus.eyebrow}
                        </p>
                        <div className="mt-4 flex gap-6" aria-hidden="true">
                            <span className="h-1 w-9 bg-[#ff9933]" />
                            <span className="h-1 w-9 bg-[#138808]" />
                        </div>
                        <h2 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#0b1f3a] md:text-4xl">
                            {home.focus.title}
                        </h2>
                        <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600">
                            {home.focus.description}
                        </p>
                        <p className="mt-8 max-w-2xl text-2xl font-semibold italic leading-snug text-[#0b1f3a]">
                            {home.focus.tagline[0]}
                            <br />
                            {home.focus.tagline[1]}
                        </p>
                        <div className="mt-4 flex gap-6" aria-hidden="true">
                            <span className="h-1 w-9 bg-[#ff9933]" />
                            <span className="h-1 w-9 bg-[#138808]" />
                        </div>
                    </div>

                    <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        <div
                            data-motion="text"
                            className="relative grid min-h-[12rem] place-items-center overflow-hidden px-4 py-3 text-center"
                        >
                            <div className="focus-stat-rotator relative min-h-[7.75rem] w-full">
                                {home.focus.stats.map(([value, label], index) => {
                                    const statIcons = [UsersRound, Leaf, Mountain];
                                    const statTones = [
                                        "text-[#ff9933]",
                                        "text-[#138808]",
                                        "text-[#000080]",
                                    ];
                                    const Icon = statIcons[index % statIcons.length];
                                    const tone = statTones[index % statTones.length];

                                    return (
                                    <div className="focus-stat-frame" key={label}>
                                        <div className="flex items-end justify-center gap-3">
                                            <Icon className={`${tone} mb-1 shrink-0`} size={34} aria-hidden="true" />
                                            <p className="text-5xl font-black leading-none tracking-tight text-[#0b1f3a]">
                                                {value}
                                            </p>
                                        </div>
                                        <p className="mt-2 text-lg font-extrabold leading-tight text-slate-700">
                                            {label}
                                        </p>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                        {home.focus.items.map(([title, description], index) => {
                            const card = focusCards[index % focusCards.length];
                            const Icon = card.icon;
                            return (
                                <article
                                    data-motion="card"
                                    className="rounded-2xl border border-white/60 bg-white/60 p-5 shadow-[0_12px_32px_rgba(15,23,42,.12)] backdrop-blur-md transition duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-white/85 hover:bg-white/72 hover:shadow-[0_18px_42px_rgba(15,23,42,.18)]"
                                    key={title}
                                >
                                    <div className="flex gap-4">
                                        <span
                                            className={`grid size-14 shrink-0 place-items-center rounded-full text-white shadow-lg ${card.tone}`}
                                        >
                                            <Icon size={26} aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h3 className="text-lg font-black leading-snug text-[#0b1f3a]">
                                                {title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                {description}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
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
                                className="contrast-surface group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 ease-out hover:-translate-y-1 hover:border-[#ff9933] hover:shadow-[0_16px_36px_-22px_rgba(255,153,51,.9)]"
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
                className="relative overflow-hidden border-y border-slate-200 bg-[#f4f7fa] py-20"
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-[100px] hidden aspect-[492/608] w-1/3 lg:block"
                >
                    <Image
                        src="/images/recognition-left.webp"
                        alt=""
                        fill
                        sizes="33vw"
                        className="object-contain object-top"
                    />
                </div>
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 hidden aspect-[492/608] w-1/3 lg:block"
                >
                    <Image
                        src="/images/recognition-right.webp"
                        alt=""
                        fill
                        sizes="33vw"
                        className="object-contain object-right-top"
                    />
                </div>
                <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
                    <p className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-[#ff9933]">
                        <span className="h-px w-8 bg-[#ff9933]" />
                        {home.recognition.eyebrow}
                        <span className="h-px w-8 bg-[#ff9933]" />
                    </p>
                    <h2 className="mt-4 text-3xl font-bold text-[#0b1f3a] sm:text-4xl md:text-5xl">
                        {home.recognition.headlineLine1}
                        <br />
                        {home.recognition.headlineLine2}{" "}
                        <span className="text-[#ff9933]">
                            {home.recognition.headlineHighlight}
                        </span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
                        {home.recognition.flowNote}
                    </p>
                </div>

                {/* Flow diagram */}
                <div className="relative z-10 mx-auto mt-12 max-w-4xl px-4 sm:px-6">
                    <div className="flex flex-col items-center">
                        <FlowNodeCard node={localizedFlow[0]} />
                        <ArrowDown
                            aria-hidden="true"
                            className="my-2 shrink-0 text-slate-400"
                            size={22}
                        />
                        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                            <FlowNodeCard node={localizedFlow[1]} tone />
                            <ArrowRight
                                aria-hidden="true"
                                className="mx-auto hidden shrink-0 text-slate-400 sm:block"
                                size={22}
                            />
                            <FlowNodeCard node={localizedFlow[2]} tone />
                            <ArrowRight
                                aria-hidden="true"
                                className="mx-auto hidden shrink-0 text-slate-400 sm:block"
                                size={22}
                            />
                            <FlowNodeCard node={localizedFlow[3]} tone />
                        </div>
                        <ArrowUp
                            aria-hidden="true"
                            className="my-2 shrink-0 text-slate-400"
                            size={22}
                        />
                        <FlowNodeCard node={localizedFlow[4]} />
                    </div>
                </div>

                {/* Support grid */}
                <div className="relative z-10 mx-auto mt-14 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-6">
                    {localizedBenefits.map((benefit, index) => {
                        const Icon = benefit.icon;
                        return (
                            <article
                                data-motion="card"
                                className="contrast-surface rounded-2xl border border-slate-200 bg-white p-5"
                                key={benefit.title}
                            >
                                <Icon
                                    className={
                                        index % 2 ? "text-[#138808]" : "text-[#ff9933]"
                                    }
                                    size={22}
                                    aria-hidden="true"
                                />
                                <p className="mt-3 font-bold text-[#0b1f3a]">
                                    {benefit.title}
                                </p>
                                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                                    {benefit.description}
                                </p>
                            </article>
                        );
                    })}
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
                        <ol className="contrast-surface divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                <div data-motion="text" className="relative min-h-[28rem] overflow-hidden rounded-2xl border border-blue-100 bg-[#f5fbff] px-6 py-10 shadow-sm sm:px-10 md:min-h-[23rem] md:py-12 lg:min-h-[22rem] lg:px-14">
                    <Image
                        src="/images/cta-bg.webp"
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 1200px, 100vw"
                        className="pointer-events-none object-contain object-bottom opacity-45 sm:opacity-55 md:object-right-bottom md:opacity-90"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#f5fbff] via-[#f5fbff]/92 to-[#f5fbff]/10 md:w-[62%]" />
                    <div className="relative z-10 max-w-2xl">
                        <div className="tri-accent">
                            <span />
                            <span />
                            <span />
                        </div>
                        <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-700">
                            {home.cta.eyebrow}
                        </p>
                        <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight text-[#0b1f3a] md:text-5xl">
                            {home.cta.titleLine1}
                            <br />
                            {home.cta.titleLine2}
                        </h2>
                        <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-700 md:text-lg">
                            {home.cta.description}
                        </p>
                        <Link
                            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#ff6b1a] px-8 py-4 text-lg font-bold text-white shadow-[0_14px_30px_rgba(255,107,26,.25)] transition hover:-translate-y-0.5 hover:bg-[#f08a24]"
                            href={link("/register")}
                        >
                            {content.common.applyNow} <ArrowRight size={20} />
                        </Link>
                        <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#5f8fce]">
                            {home.cta.footer}
                        </p>
                    </div>
                </div>
            </section>

            <span className="sticky-apply-spacer" aria-hidden="true" />
            <StickyApply
                href={link("/register")}
                label={content.common.applyNow}
                statusText={content.common.applicationsOpen}
                hint={challengeDates.shortDisplay[locale as keyof typeof challengeDates.shortDisplay] ?? challengeDates.shortDisplay.en}
                hideWhenVisible="apply"
            />
        </>
    );
}
