"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function ScrollAnimations({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("scroll-smooth");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let observer: IntersectionObserver | null = null;
    const frame = window.requestAnimationFrame(() => {
      const motionElements =
        document.querySelectorAll<HTMLElement>("[data-motion]");

      if (!motionElements.length) {
        document.documentElement.classList.remove("motion-ready");
        return;
      }

      document.documentElement.classList.add("motion-ready");
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("motion-visible");
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -28px" },
      );

      motionElements.forEach((element) => {
        if (element.classList.contains("motion-visible")) return;
        observer?.observe(element);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname]);

  return <>{children}</>;
}
