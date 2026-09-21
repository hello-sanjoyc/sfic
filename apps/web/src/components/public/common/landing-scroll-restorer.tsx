"use client";

import { useEffect } from "react";
import { scrollToPageSection } from "./one-page-nav";

export function LandingScrollRestorer() {
    useEffect(() => {
        const target = window.location.hash;
        if (!target) return;

        let attempts = 0;
        let frame = 0;
        let timeout = 0;

        const tryScroll = () => {
            attempts += 1;
            scrollToPageSection(target, attempts <= 2 ? "auto" : "smooth");

            if (attempts >= 18) return;
            timeout = window.setTimeout(() => {
                frame = window.requestAnimationFrame(tryScroll);
            }, attempts <= 3 ? 80 : 120);
        };

        timeout = window.setTimeout(() => {
            frame = window.requestAnimationFrame(tryScroll);
        }, 120);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
        };
    }, []);

    return null;
}
