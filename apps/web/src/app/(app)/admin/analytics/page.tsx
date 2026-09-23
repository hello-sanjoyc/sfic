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
import { Activity, BarChart3, Clock3, MousePointerClick } from "lucide-react";
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

function PageViewLineChart({
  isLoading,
  trend,
}: Readonly<{
  isLoading: boolean;
  trend: PageViewTrendPoint[];
}>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  useEffect(() => {
    if (!canvasRef.current || isLoading || !trend.length) return;

    chartRef.current?.destroy();

    const config: ChartConfiguration<"line"> = {
      data: {
        labels: trend.map((point) => formatChartDate(point.date)),
        datasets: [
          {
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            borderColor: "#2563eb",
            borderWidth: 2,
            data: trend.map((point) => point.pageViews),
            fill: true,
            label: "Page Views",
            pointBackgroundColor: "#2563eb",
            pointBorderWidth: 0,
            pointRadius: 3,
            tension: 0.35,
          },
          {
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderColor: "#10b981",
            borderWidth: 2,
            data: trend.map((point) => point.uniqueVisits),
            fill: true,
            label: "Unique Visits",
            pointBackgroundColor: "#10b981",
            pointBorderWidth: 0,
            pointRadius: 3,
            tension: 0.35,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            align: "end",
            labels: {
              boxHeight: 8,
              boxWidth: 8,
              color: "#475569",
              font: {
                size: 12,
                weight: "bold",
              },
              usePointStyle: true,
            },
            position: "top",
          },
          tooltip: {
            backgroundColor: "#0f172a",
            padding: 12,
            titleFont: {
              size: 12,
              weight: "bold",
            },
          },
        },
        responsive: true,
        scales: {
          x: {
            grid: {
              color: "rgba(148, 163, 184, 0.18)",
            },
            ticks: {
              color: "#64748b",
              maxRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(148, 163, 184, 0.22)",
            },
            ticks: {
              color: "#64748b",
              precision: 0,
            },
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
  }, [isLoading, trend]);

  return (
    <div className="border-t border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-[#0b1f3a]">
            Page Views and Unique Visits
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Daily trend for the last 30 days
          </p>
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

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        {isLoading ? (
          <div className="grid h-72 place-items-center text-sm font-bold text-slate-500">
            Loading chart...
          </div>
        ) : trend.length ? (
          <div className="h-72 w-full">
            <canvas
              aria-label="Line chart showing page views and unique visits"
              ref={canvasRef}
              role="img"
            />
          </div>
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
