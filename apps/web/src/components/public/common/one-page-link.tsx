"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    scrollToPageSection,
} from "./one-page-nav";

export function OnePageLink({
    children,
    className,
    href,
    locale,
    target,
}: Readonly<{
    children: React.ReactNode;
    className?: string;
    href: string;
    locale: string;
    target: string;
}>) {
    const pathname = usePathname();
    const router = useRouter();
    const landingPath = `/${locale}`;

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();

        if (!target) {
            if (pathname === landingPath) {
                scrollToPageSection("");
                return;
            }

            router.push(landingPath, { scroll: false });
            return;
        }

        if (pathname === landingPath) {
            scrollToPageSection(target);
            return;
        }

        router.push(`${landingPath}${target}`);
    };

    return (
        <Link className={className} href={href} onClick={handleClick}>
            {children}
        </Link>
    );
}
