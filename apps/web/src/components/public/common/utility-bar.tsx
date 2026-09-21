"use client";

import { useState, type ComponentType } from "react";
import {
  Accessibility,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Droplet,
  ImageOff,
  Link2,
  Minus,
  Moon,
  MousePointer2,
  MoveVertical,
  RotateCcw,
  Sun,
  Volume2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getSiteContent } from "@/content";
import { LanguageSwitcher } from "./language-switcher";

type ToolButtonProps = {
  active?: boolean;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  onClick: () => void;
};

function ToolButton({ active = false, icon: Icon, label, onClick }: ToolButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-md px-2 py-2 text-center text-sm font-medium leading-5 transition hover:bg-slate-200 focus-visible:outline-[#0b1f3a] ${active ? "bg-[#dcefe2] text-[#0b5f22] ring-2 ring-[#138808]" : "bg-[#f0f0f0] text-slate-800"}`}
      onClick={onClick}
    >
      <Icon size={23} aria-hidden={true} />
      <span>{label}</span>
    </button>
  );
}

export function UtilityBar() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";
  const labels = getSiteContent(locale).common.accessibility;
  const [scale, setScale] = useState(100);
  const [colorMode, setColorMode] = useState("normal");
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [lineHeight, setLineHeight] = useState(false);
  const [textSpacing, setTextSpacing] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);
  const [hideImages, setHideImages] = useState(false);

  const setDocumentOption = (option: string, enabled: boolean) => {
    document.documentElement.dataset[option] = enabled ? "true" : "false";
  };
  const updateScale = (next: number) => {
    setScale(next);
    document.documentElement.style.fontSize = `${next}%`;
  };
  const updateColorMode = (next: string) => {
    const selected = colorMode === next ? "normal" : next;
    setColorMode(selected);
    document.documentElement.dataset.colorMode = selected;
    document.documentElement.dataset.contrast = selected === "high" ? "high" : "normal";
  };
  const openScreenReaderPage = () => {
    setAccessibilityOpen(false);
    router.push(`/${locale}/screen-reader-access`);
  };
  return (
    <div className="bg-gradient-to-r from-[#ff9933] to-[#138808] text-white">
      <div className="mx-auto flex min-h-12 max-w-7xl items-center justify-end px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher />
          <div className="relative border-l border-white/55 pl-3">
            <button
              aria-controls="accessibility-options"
              aria-expanded={accessibilityOpen}
              aria-label={labels.options}
              className="grid size-7 place-items-center rounded-full transition hover:bg-white/15 focus-visible:outline-white"
              onClick={() => setAccessibilityOpen((open) => !open)}
            >
              <Accessibility size={22} aria-hidden="true" />
            </button>
            {accessibilityOpen && (
              <section
                aria-label={labels.tools}
                className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-4rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-xl bg-white p-4 text-slate-800 shadow-2xl sm:p-5"
                id="accessibility-options"
              >
                <h2 className="text-xl font-bold tracking-tight">{labels.tools}</h2>

                <div className="mt-6">
                  <div className="flex items-center justify-between border-b-2 border-slate-700 pb-2">
                    <h3 className="text-base font-bold">{labels.colorAdjustment}</h3>
                    <span className="grid size-5 place-items-center rounded bg-[#ef6c2f] text-white"><Minus size={14} /></span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <ToolButton active={colorMode === "high"} icon={Sun} label={labels.highContrast} onClick={() => updateColorMode("high")} />
                    <ToolButton active={colorMode === "dark"} icon={Moon} label={labels.darkContrast} onClick={() => updateColorMode("dark")} />
                    <ToolButton active={highlightLinks} icon={Link2} label={labels.highlightLinks} onClick={() => { const next = !highlightLinks; setHighlightLinks(next); setDocumentOption("highlightLinks", next); }} />
                    <ToolButton active={colorMode === "invert"} icon={Droplet} label={labels.invert} onClick={() => updateColorMode("invert")} />
                    <ToolButton active={colorMode === "saturation"} icon={Droplet} label={labels.saturation} onClick={() => updateColorMode("saturation")} />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between border-b-2 border-slate-700 pb-2">
                    <h3 className="text-base font-bold">{labels.textSize}</h3>
                    <span className="grid size-5 place-items-center rounded bg-[#ef6c2f] text-white"><Minus size={14} /></span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <ToolButton icon={ArrowUp} label={labels.increaseText} onClick={() => updateScale(Math.min(115, scale + 5))} />
                    <ToolButton icon={ArrowDown} label={labels.decreaseText} onClick={() => updateScale(Math.max(90, scale - 5))} />
                    <ToolButton icon={RotateCcw} label={labels.resetText} onClick={() => updateScale(100)} />
                    <ToolButton active={lineHeight} icon={MoveVertical} label={labels.lineHeight} onClick={() => { const next = !lineHeight; setLineHeight(next); setDocumentOption("lineHeight", next); }} />
                    <ToolButton active={textSpacing} icon={ArrowLeftRight} label={labels.textSpacing} onClick={() => { const next = !textSpacing; setTextSpacing(next); setDocumentOption("textSpacing", next); }} />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between border-b-2 border-slate-700 pb-2">
                    <h3 className="text-base font-bold">{labels.navigationAdjustment}</h3>
                    <span className="grid size-5 place-items-center rounded bg-[#ef6c2f] text-white"><Minus size={14} /></span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <ToolButton active={bigCursor} icon={MousePointer2} label={labels.bigCursor} onClick={() => { const next = !bigCursor; setBigCursor(next); setDocumentOption("bigCursor", next); }} />
                    <ToolButton active={hideImages} icon={ImageOff} label={labels.hideImage} onClick={() => { const next = !hideImages; setHideImages(next); setDocumentOption("hideImages", next); }} />
                    <ToolButton icon={Volume2} label={labels.screenReader} onClick={openScreenReaderPage} />
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
