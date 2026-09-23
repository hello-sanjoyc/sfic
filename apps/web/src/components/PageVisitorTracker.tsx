"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { UAParser } from "ua-parser-js";
import { appConfig } from "@/lib/app-config";
import { endpoints } from "@/lib/endpoints";

const VISITOR_ID_KEY = "page_visitor_id";
const SESSION_ID_KEY = "page_session_id";

function getOrCreateVisitorId() {
    let id = localStorage.getItem(VISITOR_ID_KEY);

    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(VISITOR_ID_KEY, id);
    }

    return id;
}

function getOrCreateSessionId() {
    let id = sessionStorage.getItem(SESSION_ID_KEY);

    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_ID_KEY, id);
    }

    return id;
}

export default function PageVisitorTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;

        if (
            pathname.startsWith("/admin") ||
            pathname.startsWith("/dashboard") ||
            pathname.startsWith("/api")
        ) {
            return;
        }

        let visitId: number | null = null;
        let disposed = false;

        let visibleStartedAt =
            document.visibilityState === "visible" ? Date.now() : null;

        let visibleDurationMs = 0;

        const parser = new UAParser(navigator.userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();

        const deviceType =
            device.type ??
            (window.innerWidth <= 768
                ? "mobile"
                : window.innerWidth <= 1024
                  ? "tablet"
                  : "desktop");

        const createVisit = async () => {
            try {
                const response = await fetch(
                    `${appConfig.apiUrl}${endpoints.analytics.visit}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            visitorId: getOrCreateVisitorId(),
                            sessionId: getOrCreateSessionId(),
                            pagePath: pathname,
                            pageTitle: document.title,
                            browser: browser.name ?? null,
                            browserVersion: browser.version ?? null,
                            os: os.name ?? null,
                            osVersion: os.version ?? null,
                            deviceType,
                            screenWidth: window.screen.width,
                            screenHeight: window.screen.height,
                        }),
                        keepalive: true,
                    },
                );

                if (!response.ok) return;

                const data = await response.json();

                if (!disposed && data.visitId) {
                    visitId = Number(data.visitId);
                }
            } catch {
                // Analytics must never break the public site.
            }
        };

        const addVisibleTime = () => {
            if (visibleStartedAt !== null) {
                visibleDurationMs += Date.now() - visibleStartedAt;
                visibleStartedAt = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                if (visibleStartedAt === null) {
                    visibleStartedAt = Date.now();
                }
            } else {
                addVisibleTime();
            }
        };

        const sendDuration = () => {
            if (!visitId) return;

            addVisibleTime();

            const durationSeconds = Math.max(
                0,
                Math.round(visibleDurationMs / 1000),
            );

            navigator.sendBeacon(
                `${appConfig.apiUrl}${endpoints.analytics.leave}`,
                new Blob(
                    [
                        JSON.stringify({
                            visitId,
                            durationSeconds,
                        }),
                    ],
                    {
                        type: "application/json",
                    },
                ),
            );
        };

        void createVisit();

        document.addEventListener("visibilitychange", handleVisibilityChange);

        window.addEventListener("pagehide", sendDuration);

        return () => {
            disposed = true;

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            window.removeEventListener("pagehide", sendDuration);

            sendDuration();
        };
    }, [pathname]);

    return null;
}
