export const pendingScrollTargetKey =
    "seva-first-innovation-challenge-scroll-target";

function normalizeTarget(target: string) {
    return target.replace(/^#/, "");
}

export function getSectionTarget(target: string) {
    return normalizeTarget(target);
}

export function scrollToPageSection(target: string, behavior: ScrollBehavior = "smooth") {
    const targetId = normalizeTarget(target);

    if (!targetId) {
        window.scrollTo({ behavior, top: 0 });
        window.history.replaceState(null, "", window.location.pathname);
        return true;
    }

    const element = document.getElementById(targetId);
    if (!element) return false;

    element.scrollIntoView({ behavior, block: "start" });
    window.history.replaceState(null, "", window.location.pathname);
    return true;
}
