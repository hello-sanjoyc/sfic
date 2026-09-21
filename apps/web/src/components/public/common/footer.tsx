import Image from "next/image";
import Link from "next/link";
import { getSiteContent } from "@/content";
import { OnePageLink } from "./one-page-link";

export function Footer({ locale = "en" }: { locale?: string }) {
    const content = getSiteContent(locale);
    const groups = [
        {
            heading: content.footer.explore,
            policy: false,
            links: [
                [content.header.nav.home, ""],
                [content.header.nav.about, "#about"],
                [content.header.nav.themes, "#themes"],
                [content.header.nav.timeline, "#timeline"],
                [content.header.nav.faq, "#faq"],
                [content.header.nav.contact, "#contact"],
            ],
        },
    ] as const;
    return (
        <footer id="contact" className="mt-16 bg-gradient-to-b from-[#f8fafc] to-[#101213] px-5 pb-0 pt-5 sm:px-8 sm:pb-0 sm:pt-8 lg:px-[60px]">
            <div className="footer-surface w-full overflow-hidden rounded-t-[3rem] text-slate-200">
                <Image
                    src="/images/globe.webp"
                    alt=""
                    width={1254}
                    height={1254}
                    aria-hidden="true"
                    className="footer-globe"
                />
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,51.3fr)_minmax(0,21.4fr)_minmax(0,27.3fr)] lg:gap-x-0">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-white">
                                {content.footer.contact}
                            </h2>
                            <address className="mt-10 max-w-md not-italic text-base leading-8 text-slate-300">
                                {content.footer.department}
                                <br />
                                {content.footer.address}
                                <br />
                                {content.footer.landmark}
                                <br />
                                <a
                                    className="mt-7 inline-block text-lg font-bold text-white underline decoration-[#ff9933] underline-offset-4 hover:text-[#ffd29f]"
                                    href="mailto:sficeast@gmail.com"
                                >
                                    sficeast@gmail.com
                                </a>
                            </address>
                        </div>
                        {groups.map(({ heading, links, policy }) => (
                            <div
                                className="lg:col-start-3 lg:justify-self-end"
                                id={policy ? "policies" : undefined}
                                key={heading}
                            >
                                <h2 className="text-2xl font-bold tracking-tight text-white">
                                    {heading}
                                </h2>
                                <ul className="mt-10 grid gap-4 text-base text-slate-300">
                                    {links.map(([label, path]) => (
                                        <li key={label}>
                                            {policy ? (
                                                <Link
                                                    className="transition hover:text-[#ffd29f]"
                                                    href={`/${locale}${path}`}
                                                >
                                                    {label}
                                                </Link>
                                            ) : (
                                                <OnePageLink
                                                    className="transition hover:text-[#ffd29f]"
                                                    href={`/${locale}${path}`}
                                                    locale={locale}
                                                    target={path}
                                                >
                                                    {label}
                                                </OnePageLink>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="mt-14 flex flex-col gap-7 border-y border-white/15 py-7 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Image
                                src="/images/logo.webp"
                                alt="Government of West Bengal"
                                width={64}
                                height={64}
                                className="size-14 rounded-sm bg-white object-contain p-1"
                            />
                            <div>
                                <Link
                                    className="text-lg font-bold text-white hover:text-[#ffd29f]"
                                    href={`/${locale}`}
                                >
                                    {content.header.brand}
                                </Link>
                                <p className="mt-1 text-sm text-slate-300">
                                    {content.footer.tagline}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            &copy; {new Date().getFullYear()}{" "}
                            {content.footer.rights}
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
