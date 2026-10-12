"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
  Mail,
  Plus,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  SkipForward,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type NotificationStatus = "Queued" | "Processing" | "Sent" | "Delivered" | "Failed" | "Skipped";
type SortDirection = "asc" | "desc";
type NotificationSortKey = "name" | "subject" | "createdAt" | "scheduledFor" | "totalRecipients" | "sent" | "failed";
type RecipientSortKey = "recipientName" | "email" | "deliveryStatus" | "attemptCount" | "lastAttempt";
type EmailMode = "individual" | "bulk";

type Notification = {
  body: string;
  createdAt: string;
  createdByUserId: number;
  delivered: number | null;
  deliveryMode: "immediate" | "scheduled";
  failed: number;
  id: number;
  mode: "individual" | "bulk";
  name: string;
  processing: number;
  queued: number;
  replyToEmail: string;
  scheduledFor: string | null;
  senderName: string;
  sent: number;
  skipped: number;
  status: "draft" | "queued" | "processing" | "sent" | "failed";
  subject: string;
  totalRecipients: number;
  updatedAt: string;
};

type RecipientStatus = {
  attemptCount: number;
  deliveryStatus: NotificationStatus;
  email: string;
  failureReason: string | null;
  id: number;
  lastAttempt: string | null;
  recipientName: string | null;
};

type NotificationsResponse = {
  notifications: Notification[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type NotificationAnalyticsResponse = {
  notification: Notification;
};

type NotificationDetailsResponse = NotificationAnalyticsResponse & {
  recipients: RecipientStatus[];
};

type RecipientsResponse = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  recipients: RecipientStatus[];
};

const senderDefault = "Seva First Innovation Challenge - Eastern Region";
const replyToDefault = "sficeast@gmail.com";
const duplicateNotificationMessage =
  "This email notification already exists. Change at least one field before saving.";

function formatDate(value: string | null) {
  if (!value) return "Sent immediately";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(status: NotificationStatus) {
  const classes = {
    Delivered: "bg-emerald-50 text-emerald-700",
    Failed: "bg-rose-50 text-rose-700",
    Processing: "bg-blue-50 text-blue-700",
    Queued: "bg-amber-50 text-amber-700",
    Sent: "bg-indigo-50 text-indigo-700",
    Skipped: "bg-slate-100 text-slate-600",
  } satisfies Record<NotificationStatus, string>;

  return classes[status];
}

function notificationLifecycleLabel(status: Notification["status"]) {
  return status === "draft" ? "Draft" : "Submitted";
}

function notificationLifecycleClasses(status: Notification["status"]) {
  return status === "draft"
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";
}

function SortIcon({
  active,
  direction,
}: Readonly<{ active: boolean; direction: SortDirection }>) {
  if (!active) return <ChevronsUpDown size={14} />;
  return <ChevronDown className={direction === "asc" ? "rotate-180" : ""} size={14} />;
}

export function AdminEmailNotificationsPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortKey, setSortKey] = useState<NotificationSortKey>("createdAt");
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const resultStart = totalNotifications === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, totalNotifications);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<NotificationsResponse>(endpoints.admin.emailNotifications, {
        query: {
          page,
          pageSize,
          sortBy: sortKey,
          sortDirection,
        },
      })
      .then((result) => {
        if (!isMounted) return;
        setNotifications(result.notifications);
        setTotalNotifications(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;
        setNotifications([]);
        setTotalNotifications(0);
        setTotalPages(1);
        setErrorMessage(error instanceof Error ? error.message : "Email notifications could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, sortDirection, sortKey]);

  const sortBy = (key: NotificationSortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const columns: Array<{ key: NotificationSortKey; label: string }> = [
    { key: "name", label: "Notification" },
    { key: "subject", label: "Subject" },
    { key: "createdAt", label: "Created" },
    { key: "scheduledFor", label: "Schedule" },
    { key: "totalRecipients", label: "Recipients" },
    { key: "sent", label: "Sent" },
    { key: "failed", label: "Failed" },
  ];
  return (
    <AdminShell eyebrow="Review outbound email activity" title="Email Notification">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <Mail className="text-blue-600" size={22} />
            <div>
              <h2 className="text-lg font-black">Email Sending Register</h2>
              <p className="text-sm text-slate-500">Notification delivery batches and current sending status</p>
            </div>
          </div>
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
            href="/admin/email-notifications/new"
          >
            <Plus size={18} />
            New Notification
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[78rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th className="px-4 py-3" key={column.key}>
                    <button
                      className="inline-flex items-center gap-1 font-bold uppercase"
                      onClick={() => sortBy(column.key)}
                      type="button"
                    >
                      {column.label}
                      <SortIcon active={sortKey === column.key} direction={sortDirection} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={9}>
                    Loading email notifications...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-rose-600" colSpan={9}>
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading && !errorMessage && notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-4 py-3 font-black text-[#0b1f3a]">{notification.name}</td>
                  <td className="px-4 py-3 text-slate-700">{notification.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(notification.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(notification.scheduledFor)}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{notification.totalRecipients}</td>
                  <td className="px-4 py-3 text-slate-600">{notification.sent}</td>
                  <td className="px-4 py-3 text-slate-600">{notification.failed}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${notificationLifecycleClasses(notification.status)}`}>
                      {notificationLifecycleLabel(notification.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {notification.status === "draft" ? (
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
                        href={`/admin/email-notifications/${notification.id}/edit`}
                      >
                        Manage <ArrowRight size={15} />
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
                        href={`/admin/email-notifications/${notification.id}/analytics`}
                      >
                        View <ArrowRight size={15} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && !errorMessage && notifications.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={9}>
                    No email notifications have been created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
          <div className="font-semibold">
            Showing {resultStart}-{resultEnd} of {totalNotifications}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 font-semibold">
              Rows
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 font-bold text-slate-700 outline-none"
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
                value={pageSize}
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className="font-semibold">Page {page} of {totalPages}</div>
            <button
              aria-label="Previous page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function AnalyticsCard({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: typeof Mail; label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <Icon className="text-blue-600" size={20} />
      </div>
      <p className="mt-4 text-3xl font-black text-[#0b1f3a]">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

export function AdminEmailNotificationAnalyticsPage({
  notificationId,
}: Readonly<{ notificationId: string }>) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientPageSize, setRecipientPageSize] = useState(10);
  const [recipients, setRecipients] = useState<RecipientStatus[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortKey, setSortKey] = useState<RecipientSortKey>("recipientName");
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [totalRecipientPages, setTotalRecipientPages] = useState(1);
  const progress = notification?.totalRecipients
    ? Math.round(((notification.sent + notification.failed + notification.skipped) / notification.totalRecipients) * 100)
    : 0;
  const cards = notification
    ? ([
        ["Total Recipients", notification.totalRecipients, Mail],
        ["Queued", notification.queued, Clock3],
        ["Processing", notification.processing, RefreshCcw],
        ["Sent", notification.sent, Send],
        ...(notification.delivered === null ? [] : [["Delivered", notification.delivered, CheckCircle2] as const]),
        ["Failed", notification.failed, XCircle],
        ["Skipped", notification.skipped, SkipForward],
      ] as const)
    : [];

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    void Promise.all([
      apiClient.get<NotificationAnalyticsResponse>(
        endpoints.admin.emailNotificationAnalytics(notificationId),
      ),
      apiClient.get<RecipientsResponse>(
        endpoints.admin.emailNotificationRecipients(notificationId),
        {
          query: {
            page: recipientPage,
            pageSize: recipientPageSize,
            sortBy: sortKey,
            sortDirection,
          },
        },
      ),
    ])
      .then(([analyticsResult, recipientsResult]) => {
        if (!isMounted) return;
        setNotification(analyticsResult.notification);
        setRecipients(recipientsResult.recipients);
        setTotalRecipients(recipientsResult.pagination.total);
        setTotalRecipientPages(recipientsResult.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;
        setNotification(null);
        setRecipients([]);
        setTotalRecipients(0);
        setTotalRecipientPages(1);
        setErrorMessage(error instanceof Error ? error.message : "Email notification analytics could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [notificationId, recipientPage, recipientPageSize, sortDirection, sortKey]);

  const sortBy = (key: RecipientSortKey) => {
    setRecipientPage(1);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };
  const recipientColumns: Array<{ key: RecipientSortKey; label: string }> = [
    { key: "recipientName", label: "Recipient Name" },
    { key: "email", label: "Email Address" },
    { key: "deliveryStatus", label: "Delivery Status" },
    { key: "attemptCount", label: "Attempt Count" },
    { key: "lastAttempt", label: "Last Attempt" },
  ];

  return (
    <AdminShell eyebrow="Email delivery analytics" title="Notification Analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-600" href="/admin/email-notifications">
          <ArrowLeft size={16} />
          Back to Email Notification
        </Link>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
          href="/admin/email-notifications/new"
        >
          <Plus size={17} />
          New Notification
        </Link>
      </div>

      {isLoading && (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading email notification analytics...
        </section>
      )}

      {!isLoading && errorMessage && (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-rose-600 shadow-sm">
          {errorMessage}
        </section>
      )}

      {!isLoading && !errorMessage && notification && (
        <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[#0b1f3a]">{notification.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{notification.subject}</p>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
            {progress}% complete
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold uppercase text-slate-500">
            <span>Email delivery progress</span>
            <span>{notification.sent + notification.failed + notification.skipped}/{notification.totalRecipients}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <AnalyticsCard icon={Icon} key={label} label={label} value={value} />
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <BarChart3 className="text-blue-600" size={22} />
          <div>
            <h2 className="text-lg font-black">Recipient Status</h2>
            <p className="text-sm text-slate-500">Per-recipient delivery attempts and outcomes</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                {recipientColumns.map((column) => (
                  <th className="px-4 py-3" key={column.key}>
                    <button className="inline-flex items-center gap-1 font-bold uppercase" onClick={() => sortBy(column.key)} type="button">
                      {column.label}
                      <SortIcon active={sortKey === column.key} direction={sortDirection} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3">Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td className="px-4 py-3 font-black text-[#0b1f3a]">{recipient.recipientName ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{recipient.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(recipient.deliveryStatus)}`}>
                      {recipient.deliveryStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{recipient.attemptCount}</td>
                  <td className="px-4 py-3 text-slate-600">{recipient.lastAttempt ? formatDate(recipient.lastAttempt) : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{recipient.failureReason ?? "-"}</td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    No recipient rows are available for this notification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
          <div className="font-semibold">
            Showing {totalRecipients === 0 ? 0 : (recipientPage - 1) * recipientPageSize + 1}-{Math.min(recipientPage * recipientPageSize, totalRecipients)} of {totalRecipients}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 font-semibold">
              Rows
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 font-bold text-slate-700 outline-none"
                onChange={(event) => {
                  setRecipientPage(1);
                  setRecipientPageSize(Number(event.target.value));
                }}
                value={recipientPageSize}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className="font-semibold">Page {recipientPage} of {totalRecipientPages}</div>
            <button
              aria-label="Previous recipient page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={recipientPage === 1}
              onClick={() => setRecipientPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next recipient page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={recipientPage === totalRecipientPages}
              onClick={() => setRecipientPage((current) => Math.min(totalRecipientPages, current + 1))}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
        </>
      )}
    </AdminShell>
  );
}

type Draft = {
  body: string;
  emails: string;
  name: string;
  recipientEmail: string;
  replyToEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  senderName: string;
  subject: string;
};

const emptyDraft: Draft = {
  body: "",
  emails: "",
  name: "",
  recipientEmail: "",
  replyToEmail: replyToDefault,
  scheduledDate: "",
  scheduledTime: "",
  senderName: senderDefault,
  subject: "",
};

function dateTimeParts(value: string | null) {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function Field({
  children,
  label,
}: Readonly<{ children: React.ReactNode; label: string }>) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function inputClasses() {
  return "w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
}

function PreviewPanel({
  draft,
  mode,
}: Readonly<{ draft: Draft; mode: EmailMode }>) {
  const recipient = mode === "individual" ? draft.recipientEmail : draft.emails.split(",").map((email) => email.trim()).filter(Boolean)[0] ?? "bulk recipient list";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Mail className="text-blue-600" size={21} />
        <h2 className="text-lg font-black">Preview Email</h2>
      </div>
      <div className="mt-5 grid gap-4 text-sm">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Sender</p>
          <p className="mt-1 font-semibold text-[#0b1f3a]">{draft.senderName || senderDefault}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Recipient</p>
          <p className="mt-1 font-semibold text-[#0b1f3a]">{recipient || "Not selected"}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Subject</p>
          <p className="mt-1 font-semibold text-[#0b1f3a]">{draft.subject || "No subject yet"}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Rendered Body</p>
          <div className="mt-2 min-h-40 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 font-normal leading-7 text-slate-700">
            {draft.body || "Message body preview will appear here."}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminEmailNotificationNewPage({
  notificationId,
}: Readonly<{ notificationId?: string }>) {
  const router = useRouter();
  const [mode, setMode] = useState<EmailMode>("individual");
  const [deliveryMode, setDeliveryMode] = useState<"immediate" | "scheduled">("immediate");
  const [bulkSafeguards, setBulkSafeguards] = useState({
    excludeDuplicates: true,
    retryTemporaryErrors: true,
    skipInvalidSuppressed: true,
  });
  const [individualDraft, setIndividualDraft] = useState<Draft>(emptyDraft);
  const [bulkDraft, setBulkDraft] = useState<Draft>(emptyDraft);
  const [actionMessage, setActionMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState("");
  const [isDraftLoading, setIsDraftLoading] = useState(Boolean(notificationId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(notificationId);
  const draft = mode === "individual" ? individualDraft : bulkDraft;
  const setDraft = mode === "individual" ? setIndividualDraft : setBulkDraft;
  const hasRecipients =
    mode === "individual"
      ? draft.recipientEmail.trim().length > 0
      : draft.emails.split(",").some((email) => email.trim().length > 0);
  const canSubmit =
    hasRecipients &&
    draft.senderName.trim().length > 0 &&
    draft.replyToEmail.trim().length > 0 &&
    draft.name.trim().length > 0 &&
    draft.subject.trim().length > 0 &&
    draft.body.trim().length > 0;
  const isDuplicateNotificationMessage = actionMessage === duplicateNotificationMessage;
  const updateDraft = (field: keyof Draft) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    setActionMessage("");
  };
  const clearDraft = () => {
    setDraft(emptyDraft);
    setDeliveryMode("immediate");
    setActionMessage("");
  };
  const toggleBulkSafeguard = (key: keyof typeof bulkSafeguards) => {
    setBulkSafeguards((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };
  useEffect(() => {
    if (!notificationId) return;

    let isMounted = true;
    setIsDraftLoading(true);
    setDraftLoadError("");

    void apiClient
      .get<NotificationDetailsResponse>(endpoints.admin.emailNotification(notificationId))
      .then((result) => {
        if (!isMounted) return;
        const loadedMode = result.notification.mode;
        const scheduled = dateTimeParts(result.notification.scheduledFor);
        const nextDraft = {
          body: result.notification.body,
          emails: result.recipients.map((recipient) => recipient.email).join(", "),
          name: result.notification.name,
          recipientEmail: result.recipients[0]?.email ?? "",
          replyToEmail: result.notification.replyToEmail,
          scheduledDate: scheduled.date,
          scheduledTime: scheduled.time,
          senderName: result.notification.senderName,
          subject: result.notification.subject,
        };

        setMode(loadedMode);
        if (loadedMode === "individual") {
          setIndividualDraft(nextDraft);
        } else {
          setBulkDraft(nextDraft);
        }
        if (result.notification.status !== "draft") {
          setDraftLoadError("Only draft notifications can be modified.");
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setDraftLoadError(error instanceof Error ? error.message : "Draft could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsDraftLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [notificationId]);
  const notificationPayload = (action: "draft" | "send") => ({
    action,
    body: draft.body,
    deliveryMode,
    mode,
    name: draft.name,
    recipientEmail: mode === "individual" ? draft.recipientEmail : undefined,
    recipientEmails:
      mode === "bulk"
        ? draft.emails
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean)
        : undefined,
    replyToEmail: draft.replyToEmail,
    safeguards: mode === "bulk" ? bulkSafeguards : undefined,
    scheduledDate: draft.scheduledDate,
    scheduledTime: draft.scheduledTime,
    senderName: draft.senderName,
    subject: draft.subject,
  });
  const saveDraft = async () => {
    setIsSubmitting(true);
    setActionMessage("");
    try {
      if (notificationId) {
        await apiClient.patch(
          endpoints.admin.emailNotification(notificationId),
          notificationPayload("draft"),
        );
      } else {
        await apiClient.post(endpoints.admin.emailNotifications, notificationPayload("draft"));
      }
      setActionMessage(`${mode === "individual" ? "Individual" : "Bulk"} email draft saved.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Draft could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const sendNotification = async () => {
    setIsSubmitting(true);
    setActionMessage("");
    try {
      if (notificationId) {
        await apiClient.patch(
          endpoints.admin.emailNotification(notificationId),
          notificationPayload("send"),
        );
      } else {
        await apiClient.post(endpoints.admin.emailNotifications, notificationPayload("send"));
      }
      setActionMessage("Notification send request submitted successfully.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Notification could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const deleteDraft = async () => {
    if (!notificationId) return;

    setIsDeleting(true);
    setActionMessage("");
    try {
      await apiClient.delete(endpoints.admin.emailNotification(notificationId));
      router.push("/admin/email-notifications");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Draft could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminShell eyebrow="Compose and prepare participant email notifications" title={isEditing ? "Modify Notification" : "New Notification"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-600" href="/admin/email-notifications">
          <ArrowLeft size={16} />
          Back to Email Notification
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            disabled={isDeleting || isSubmitting}
            onClick={clearDraft}
            type="button"
          >
            <XCircle size={17} />
            Clear Current Draft
          </button>
          {isEditing && (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDeleting || isSubmitting}
              onClick={deleteDraft}
              type="button"
            >
              <Trash2 size={17} />
              {isDeleting ? "Deleting..." : "Delete Draft"}
            </button>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["individual", "Individual Email"],
            ["bulk", "Bulk Email"],
          ].map(([value, label]) => (
            <button
              className={`min-h-11 rounded-md px-3 text-sm font-black transition ${
                mode === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              key={value}
              onClick={() => setMode(value as EmailMode)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {isDraftLoading && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">
          Loading saved draft...
        </section>
      )}

      {draftLoadError && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-rose-600 shadow-sm">
          {draftLoadError}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Send className="text-blue-600" size={21} />
            <div>
              <h2 className="text-lg font-black">{mode === "individual" ? "Individual Email" : "Bulk Email"}</h2>
              <p className="text-sm text-slate-500">Switching modes preserves each draft until you clear it.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <Field label="Notification/Campaign Name">
              <input className={inputClasses()} onChange={updateDraft("name")} value={draft.name} />
            </Field>
            {mode === "individual" ? (
              <Field label="Recipient Email">
                <input className={inputClasses()} onChange={updateDraft("recipientEmail")} type="email" value={draft.recipientEmail} />
              </Field>
            ) : (
              <Field label="Recipient Emails">
                <textarea
                  className={`${inputClasses()} min-h-28 resize-y`}
                  onChange={updateDraft("emails")}
                  placeholder="Comma-separated emails"
                  value={draft.emails}
                />
              </Field>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Sender Name">
                <input className={inputClasses()} onChange={updateDraft("senderName")} value={draft.senderName} />
              </Field>
              <Field label="Reply-To Email">
                <input className={inputClasses()} onChange={updateDraft("replyToEmail")} type="email" value={draft.replyToEmail} />
              </Field>
            </div>
            <Field label="Subject">
              <input className={inputClasses()} onChange={updateDraft("subject")} value={draft.subject} />
            </Field>
            <Field label="Message Body">
              <textarea className={`${inputClasses()} min-h-52 resize-y`} onChange={updateDraft("body")} value={draft.body} />
            </Field>
          </div>
        </section>

        <div className="grid gap-4 content-start">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock3 className="text-blue-600" size={21} />
              <h2 className="text-lg font-black">Email Delivery Settings</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-bold text-slate-700">
                <input checked={deliveryMode === "immediate"} onChange={() => setDeliveryMode("immediate")} type="radio" />
                Send Immediately
              </label>
            </div>
          </section>

          {mode === "bulk" && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-blue-600" size={21} />
                <h2 className="text-lg font-black">Delivery Safeguards</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700">
                {[
                  ["excludeDuplicates", "Exclude duplicate addresses"],
                  ["skipInvalidSuppressed", "Skip invalid/suppressed emails"],
                  ["retryTemporaryErrors", "Retry temporary errors"],
                ].map(([key, label]) => (
                  <label className="flex items-start gap-3" key={key}>
                    <input
                      checked={bulkSafeguards[key as keyof typeof bulkSafeguards]}
                      className="mt-1 size-4 accent-blue-600"
                      onChange={() => toggleBulkSafeguard(key as keyof typeof bulkSafeguards)}
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <PreviewPanel draft={draft} mode={mode} />

      <section className="flex flex-wrap items-center justify-end gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {actionMessage && (
          <p
            className={`mr-auto text-sm font-semibold ${
              isDuplicateNotificationMessage ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {actionMessage}
          </p>
        )}
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          disabled={isSubmitting || isDeleting}
          onClick={saveDraft}
          type="button"
        >
          <Save size={18} />
          {isSubmitting ? "Saving..." : "Save Draft"}
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          disabled={isSubmitting || isDeleting || !canSubmit}
          onClick={sendNotification}
          type="button"
        >
          <Send size={18} />
          {isSubmitting
            ? "Submitting..."
            : isEditing
              ? "Submit Notification"
              : "Send Notification"}
        </button>
        {isEditing && (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDeleting || isSubmitting}
            onClick={deleteDraft}
            type="button"
          >
            <Trash2 size={18} />
            {isDeleting ? "Deleting..." : "Delete Draft"}
          </button>
        )}
      </section>
    </AdminShell>
  );
}
