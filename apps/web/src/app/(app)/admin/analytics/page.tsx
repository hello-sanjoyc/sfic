"use client";

import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import { Activity, BarChart3, Clock3, MousePointerClick, RotateCcw, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";

Chart.register(
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

type PageViewTrendPoint = {
  date: string;
  pageViews: number;
  uniqueVisits: number;
};

type PageViewAnalyticsResponse = {
  averageTimeSeconds: number;
  totalPageViews: number;
  trend: PageViewTrendPoint[];
  uniqueVisits: number;
};

const initialAnalytics: PageViewAnalyticsResponse = {
  averageTimeSeconds: 0,
  totalPageViews: 0,
  trend: [],
  uniqueVisits: 0,
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatChartDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

const RANGE_PRESETS = [7, 14, 30] as const;
type RangePreset = (typeof RANGE_PRESETS)[number];

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function PageViewLineChart({
  isLoading,
  trend,
}: Readonly<{
  isLoading: boolean;
  trend: PageViewTrendPoint[];
}>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  // Zoom state: null means "show all (default 30d)"
  const [zoomStart, setZoomStart] = useState<string | null>(null);
  const [zoomEnd, setZoomEnd] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<RangePreset | null>(30);

  // Derived: full date bounds from trend data
  const fullStart = trend.length ? trend[0].date : null;
  const fullEnd = trend.length ? trend[trend.length - 1].date : null;

  // Visible slice
  const visibleTrend = (() => {
    if (!zoomStart && !zoomEnd) return trend;
    return trend.filter((p) => {
      const d = p.date;
      if (zoomStart && d < zoomStart) return false;
      if (zoomEnd && d > zoomEnd) return false;
      return true;
    });
  })();

  const isZoomed = zoomStart !== null || zoomEnd !== null;

  function applyPreset(days: RangePreset) {
    if (!trend.length) return;
    const end = trend[trend.length - 1].date;
    const startDate = new Date(`${end}T00:00:00`);
    startDate.setDate(startDate.getDate() - (days - 1));
    setZoomStart(toIsoDate(startDate));
    setZoomEnd(end);
    setActivePreset(days);
  }

  function resetZoom() {
    setZoomStart(null);
    setZoomEnd(null);
    setActivePreset(30);
  }

  // Apply 30d preset once trend loads
  useEffect(() => {
    if (trend.length) applyPreset(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend.length]);

  useEffect(() => {
    if (!canvasRef.current || isLoading || !visibleTrend.length) return;

    chartRef.current?.destroy();

    const config: ChartConfiguration<"line"> = {
      data: {
        labels: visibleTrend.map((point) => formatChartDate(point.date)),
        datasets: [
          {
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            borderColor: "#2563eb",
            borderWidth: 2,
            data: visibleTrend.map((point) => point.pageViews),
            fill: true,
            label: "Page Views",
            pointBackgroundColor: "#2563eb",
            pointBorderWidth: 0,
            pointHoverRadius: 5,
            pointRadius: visibleTrend.length <= 14 ? 4 : 3,
            tension: 0.35,
          },
          {
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderColor: "#10b981",
            borderWidth: 2,
            data: visibleTrend.map((point) => point.uniqueVisits),
            fill: true,
            label: "Unique Visits",
            pointBackgroundColor: "#10b981",
            pointBorderWidth: 0,
            pointHoverRadius: 5,
            pointRadius: visibleTrend.length <= 14 ? 4 : 3,
            tension: 0.35,
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            align: "end",
            labels: {
              boxHeight: 8,
              boxWidth: 8,
              color: "#475569",
              font: { size: 12, weight: "bold" },
              usePointStyle: true,
            },
            position: "top",
          },
          tooltip: {
            backgroundColor: "#0f172a",
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const raw = visibleTrend[idx]?.date ?? "";
                const d = new Date(`${raw}T00:00:00`);
                return Number.isNaN(d.getTime())
                  ? raw
                  : new Intl.DateTimeFormat("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(d);
              },
            },
            padding: 12,
            titleFont: { size: 12, weight: "bold" },
          },
        },
        responsive: true,
        scales: {
          x: {
            grid: { color: "rgba(148, 163, 184, 0.18)" },
            ticks: {
              color: "#64748b",
              maxRotation: 0,
              maxTicksLimit: visibleTrend.length <= 7 ? 7 : 10,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(148, 163, 184, 0.22)" },
            ticks: { color: "#64748b", precision: 0 },
          },
        },
      },
      type: "line",
    };

    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [isLoading, visibleTrend]);

  const rangeLabel = (() => {
    if (!isZoomed || !zoomStart || !zoomEnd) return "Last 30 days";
    const fmt = (d: string) =>
      new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${d}T00:00:00`),
      );
    return `${fmt(zoomStart)} – ${fmt(zoomEnd)}`;
  })();

  return (
    <div className="border-t border-slate-200 p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-[#0b1f3a]">Page Views and Unique Visits</h3>
          <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Page Views
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Unique Visits
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      {!isLoading && trend.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ZoomIn size={13} />
            Zoom
          </span>
          <div className="flex items-center gap-1">
            {RANGE_PRESETS.map((days) => (
              <button
                className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                  activePreset === days
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                key={days}
                onClick={() => applyPreset(days)}
                type="button"
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={zoomEnd ?? fullEnd ?? undefined}
              min={fullStart ?? undefined}
              onChange={(e) => {
                setZoomStart(e.target.value || null);
                setActivePreset(null);
              }}
              type="date"
              value={zoomStart ?? ""}
            />
            <span className="text-slate-400">–</span>
            <input
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={fullEnd ?? undefined}
              min={zoomStart ?? fullStart ?? undefined}
              onChange={(e) => {
                setZoomEnd(e.target.value || null);
                setActivePreset(null);
              }}
              type="date"
              value={zoomEnd ?? ""}
            />
          </div>

          {/* Reset */}
          <button
            className="ml-auto flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
            disabled={activePreset === 30 && !isZoomed}
            onClick={resetZoom}
            title="Reset to last 30 days"
            type="button"
          >
            <RotateCcw size={12} />
            Reset to 30 days
          </button>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        {isLoading ? (
          <div className="grid h-72 place-items-center text-sm font-bold text-slate-500">
            Loading chart...
          </div>
        ) : trend.length ? (
          visibleTrend.length ? (
            <div className="h-72 w-full">
              <canvas
                aria-label="Line chart showing page views and unique visits"
                ref={canvasRef}
                role="img"
              />
            </div>
          ) : (
            <div className="grid h-72 place-items-center text-sm font-bold text-slate-500">
              No data in this date range.
            </div>
          )
        ) : (
          <div className="grid h-72 place-items-center text-sm font-bold text-slate-500">
            No page view trend data available.
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const [analytics, setAnalytics] =
    useState<PageViewAnalyticsResponse>(initialAnalytics);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<PageViewAnalyticsResponse>(endpoints.admin.pageViewAnalytics)
      .then((result) => {
        if (!isMounted) return;
        setAnalytics(result);
      })
      .catch((error) => {
        if (!isMounted) return;
        setAnalytics(initialAnalytics);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Page view analytics could not be fetched.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = [
    [
      "Page Views",
      isLoading ? "Loading..." : formatCount(analytics.totalPageViews),
      BarChart3,
    ],
    [
      "Unique Visits",
      isLoading ? "Loading..." : formatCount(analytics.uniqueVisits),
      MousePointerClick,
    ],
    [
      "Average Time",
      isLoading ? "Loading..." : formatDuration(analytics.averageTimeSeconds),
      Clock3,
    ],
  ] as const;

  return (
    <AdminShell
      eyebrow="Review public page traffic and engagement"
      title="Page View Analytics"
    >
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <Activity className="text-blue-600" size={22} />
          <div>
            <h2 className="text-lg font-black">Page View Analytics</h2>
            <p className="text-sm text-slate-500">
              Traffic summary for public website pages
            </p>
          </div>
        </div>
        {errorMessage && (
          <div className="mx-5 mt-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {cards.map(([label, value, Icon]) => (
            <article
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              key={label}
            >
              <Icon className="text-blue-600" size={22} />
              <p className="mt-4 text-sm font-black uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black text-[#0b1f3a]">{value}</p>
            </article>
          ))}
        </div>
        <PageViewLineChart isLoading={isLoading} trend={analytics.trend} />
      </section>
    </AdminShell>
  );
}
