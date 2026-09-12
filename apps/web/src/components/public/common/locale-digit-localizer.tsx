"use client";

import { useEffect, useRef } from "react";

const digitMaps: Record<string, string[]> = {
    bn: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
    hi: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
};

const skippedTags = new Set([
    "SCRIPT",
    "STYLE",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
]);

function shouldSkip(node: Node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (skippedTags.has(parent.tagName)) return true;
    return Boolean(parent.closest("[data-preserve-digits]"));
}

function localizeDigits(value: string, locale: string) {
    const digits = digitMaps[locale];
    if (!digits) return value;
    return value.replace(/\d/g, (digit) => digits[Number(digit)]);
}

export function LocaleDigitLocalizer({
    children,
    className = "",
    locale,
}: Readonly<{
    children: React.ReactNode;
    className?: string;
    locale: string;
}>) {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root || !digitMaps[locale]) return;

        const localizeTextNode = (node: Node) => {
            if (node.nodeType !== Node.TEXT_NODE || shouldSkip(node)) return;
            const current = node.nodeValue ?? "";
            const next = localizeDigits(current, locale);
            if (next !== current) node.nodeValue = next;
        };

        const localizeTree = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                localizeTextNode(node);
                return;
            }

            const walker = document.createTreeWalker(
                node,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (textNode) =>
                        shouldSkip(textNode)
                            ? NodeFilter.FILTER_REJECT
                            : NodeFilter.FILTER_ACCEPT,
                },
            );

            let textNode = walker.nextNode();
            while (textNode) {
                localizeTextNode(textNode);
                textNode = walker.nextNode();
            }
        };

        localizeTree(root);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "characterData") {
                    localizeTextNode(mutation.target);
                    continue;
                }

                mutation.addedNodes.forEach(localizeTree);
            }
        });

        observer.observe(root, {
            characterData: true,
            childList: true,
            subtree: true,
        });

        return () => observer.disconnect();
    }, [locale]);

    return (
        <div
            className={`locale-shell locale-${locale} ${className}`}
            lang={locale}
            ref={rootRef}
        >
            {children}
        </div>
    );
}
