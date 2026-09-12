"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HeroSlide } from "@/mocks/public";

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [ref, api] = useEmblaCarousel({ loop: true });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const select = useCallback(() => setIndex(api?.selectedScrollSnap() ?? 0), [api]);

  useEffect(() => {
    if (!api) return;
    select();
    api.on("select", select);
    return () => { api.off("select", select); };
  }, [api, select]);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => api?.scrollNext(), 7000);
    return () => window.clearInterval(timer);
  }, [api, paused]);

  return (
    <section aria-roledescription="carousel" aria-label="Challenge highlights" className="relative h-[570px] overflow-hidden bg-[#071426] md:h-[620px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="h-full" ref={ref}>
        <div className="flex h-full">
          {slides.map((slide, slideIndex) => (
            <article className="relative min-w-0 flex-[0_0_100%]" key={slide.id} aria-hidden={index !== slideIndex}>
              <Image data-motion="image" src={slide.desktopImage} alt={slide.imageAlt} fill priority={slideIndex === 0} sizes="100vw" className="object-cover" />
              <div className="relative mx-auto grid h-full max-w-7xl md:grid-cols-[1.18fr_.82fr]">
                <div className="relative z-10 flex items-center px-5 py-16 sm:px-8 lg:px-12">
                  <span className="pointer-events-none absolute -left-6 -top-6 text-[12rem] font-black leading-none text-white/[.06] md:text-[16rem]">26</span>
                  <div data-motion="text" className="relative max-w-xl text-[#071426]">
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5c2b00]">{slide.eyebrow}</p>
                    <div className="tri-accent mt-4"><span /><span /><span /></div>
                    <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-[3.45rem] md:leading-[1.05]">{slide.title}</h1>
                    <p className="mt-5 max-w-lg text-base leading-7 text-[#071426]/85 md:text-lg">{slide.description}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link href={slide.primaryCTA.href} className="rounded-full bg-[#ff9933] px-5 py-3 font-extrabold text-[#071426] transition hover:bg-[#f08a24]">{slide.primaryCTA.label}</Link>
                      <Link href={slide.secondaryCTA.href} className="rounded-full border border-[#071426]/60 px-5 py-3 font-bold text-[#071426] transition hover:bg-[#071426]/10">{slide.secondaryCTA.label}</Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-2 tri-rule" />
            </article>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-6 mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex gap-2">{slides.map((slide, i) => <button aria-label={`Go to slide ${i + 1}`} aria-current={index === i} className={`h-1.5 ${index === i ? "w-9 bg-[#ff9933]" : "w-3 bg-white/40"}`} onClick={() => api?.scrollTo(i)} key={slide.id} />)}</div>
      </div>
    </section>
  );
}
