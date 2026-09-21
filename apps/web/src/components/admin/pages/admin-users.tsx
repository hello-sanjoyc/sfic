"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type AdminUser = {
  createdAt: string;
  email: string;
  fullName: string;
  id: number;
  isActive: boolean;
  mobile: string;
  role: string;
  updatedAt: string;
};

type UsersResponse = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  users: AdminUser[];
};

type UserResponse = {
  user: AdminUser;
};

type UserFormValues = {
  email: string;
  fullName: string;
  isActive: boolean;
  mobile: string;
  role: string;
};

const emptyForm: UserFormValues = {
  email: "",
  fullName: "",
  isActive: true,
  mobile: "",
  role: "ADMIN",
};

const roles = ["SUPERADMIN", "ADMIN", "JURY", "HELPDESK"];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(isActive: boolean) {
  return isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
}

function roleLabel(role: string) {
  if (role === "SUPERADMIN") return "Super Admin";
  if (role === "HELPDESK") return "Helpdesk";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function UserStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(isActive)}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function AdminUsersPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const effectiveSearch = query.trim();
  const resultStart = totalUsers === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, totalUsers);

  useEffect(() => {
    if (effectiveSearch.length > 0 && effectiveSearch.length < 3) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<UsersResponse>(endpoints.admin.users, {
        query: {
          page,
          pageSize,
          search: effectiveSearch || undefined,
        },
      })
      .then((result) => {
        if (!isMounted) return;
        setUsers(result.users);
        setTotalUsers(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
        setErrorMessage(error instanceof Error ? error.message : "Users could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveSearch, page, pageSize]);

  return (
    <AdminShell eyebrow="Manage admin access and roles" title="Users">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={22} />
            <div>
              <h2 className="text-lg font-black">User Register</h2>
              <p className="text-sm text-slate-500">Admin panel users and access status</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-80">
              <Search size={18} />
              <input
                aria-label="Search users"
                className="min-w-0 flex-1 bg-transparent font-medium text-slate-700 outline-none placeholder:text-slate-500"
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder="Search users"
                type="search"
                value={query}
              />
            </div>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
              href="/admin/users/new"
            >
              <Plus size={18} />
              Add User
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                    Loading users...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-rose-600" colSpan={7}>
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading && !errorMessage && users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-black text-[#0b1f3a]">{user.fullName}</td>
                  <td className="px-4 py-3 text-slate-700">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.mobile}</td>
                  <td className="px-4 py-3 text-slate-600">{roleLabel(user.role)}</td>
                  <td className="px-4 py-3"><UserStatusBadge isActive={user.isActive} /></td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" href={`/admin/users/${user.id}`}>
                      Manage <ArrowRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && !errorMessage && users.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
          <div className="font-semibold">
            Showing {resultStart}-{resultEnd} of {totalUsers}
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
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className="font-semibold">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
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
        </div>
      </section>
    </AdminShell>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-xs font-black uppercase text-slate-500">{label}</dt>
      <dd className="text-sm font-normal text-[#0b1f3a]">{value}</dd>
    </div>
  );
}

export function AdminUserDetailsPage({ userId }: Readonly<{ userId: string }>) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<UserResponse>(endpoints.admin.user(userId))
      .then((result) => {
        if (isMounted) setUser(result.user);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "User could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <AdminShell eyebrow="Profile detail and access status" title="User Details">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-600" href="/admin/users">
          <ArrowLeft size={18} />
          Back to Users
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {isLoading && <p className="text-sm font-semibold text-slate-500">Loading user...</p>}
        {!isLoading && errorMessage && <p className="text-sm font-semibold text-rose-600">{errorMessage}</p>}
        {!isLoading && !errorMessage && user && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <UserCog size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#0b1f3a]">{user.fullName}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{user.email}</p>
                </div>
              </div>
              <UserStatusBadge isActive={user.isActive} />
            </div>
            <dl className="mt-2">
              <DetailRow label="Full Name" value={user.fullName} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Mobile" value={user.mobile} />
              <DetailRow label="Role" value={roleLabel(user.role)} />
              <DetailRow label="Active Status" value={user.isActive ? "Active" : "Inactive"} />
              <DetailRow label="Created" value={formatDate(user.createdAt)} />
              <DetailRow label="Updated" value={formatDate(user.updatedAt)} />
            </dl>
          </>
        )}
      </section>

      {user && (
        <div className="flex flex-wrap justify-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700"
            href={`/admin/users/${user.id}/edit`}
          >
            <Pencil size={18} />
            Edit
          </Link>
        </div>
      )}
    </AdminShell>
  );
}

function UserForm({
  mode,
  userId,
}: Readonly<{
  mode: "create" | "edit";
  userId?: string;
}>) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const [initialForm, setInitialForm] = useState<UserFormValues | null>(
    mode === "create" ? emptyForm : null,
  );
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !userId) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<UserResponse>(endpoints.admin.user(userId))
      .then((result) => {
        if (!isMounted) return;
        const nextForm = {
          email: result.user.email,
          fullName: result.user.fullName,
          isActive: result.user.isActive,
          mobile: result.user.mobile,
          role: result.user.role,
        };
        setForm(nextForm);
        setInitialForm(nextForm);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "User could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode, userId]);

  const updateField = <Key extends keyof UserFormValues>(key: Key, value: UserFormValues[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    const changedValues = Object.fromEntries(
      (Object.keys(form) as Array<keyof UserFormValues>)
        .filter((key) => mode === "create" || form[key] !== initialForm?.[key])
        .map((key) => [key, form[key]]),
    );

    if (mode === "edit" && Object.keys(changedValues).length === 0) {
      setIsSaving(false);
      router.push(`/admin/users/${userId}`);
      return;
    }

    const request =
      mode === "create"
        ? apiClient.post<UserResponse>(endpoints.admin.users, form)
        : apiClient.patch<UserResponse>(
            endpoints.admin.user(userId ?? ""),
            changedValues,
          );

    void request
      .then((result) => {
        router.push(`/admin/users/${result.user.id}`);
        router.refresh();
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "User could not be saved.");
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <AdminShell
      eyebrow={mode === "create" ? "Create admin panel access" : "Edit admin panel access"}
      title={mode === "create" ? "Add User" : "Edit User"}
    >
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-600" href={mode === "edit" && userId ? `/admin/users/${userId}` : "/admin/users"}>
        <ArrowLeft size={18} />
        Back
      </Link>

      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
        {isLoading ? (
          <p className="text-sm font-semibold text-slate-500">Loading user...</p>
        ) : mode === "edit" && !initialForm && errorMessage ? (
          <div className="grid gap-4">
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              <Link
                className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700"
                href="/admin/users"
              >
                Back to Users
              </Link>
              <button
                className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white"
                onClick={() => window.location.reload()}
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {errorMessage && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                Full Name
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  required
                  value={form.fullName}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                Email
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  type="email"
                  value={form.email}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                Mobile
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                  maxLength={10}
                  onChange={(event) => updateField("mobile", event.target.value.replace(/\D/g, ""))}
                  pattern="[0-9]{10}"
                  required
                  value={form.mobile}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                Role
                <select
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                  onChange={(event) => updateField("role", event.target.value)}
                  value={form.role}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="inline-flex items-center gap-3 text-sm font-bold text-[#0b1f3a]">
              <input
                checked={form.isActive}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                onChange={(event) => updateField("isActive", event.target.checked)}
                type="checkbox"
              />
              Active user
            </label>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              <Link
                className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700"
                href={mode === "edit" && userId ? `/admin/users/${userId}` : "/admin/users"}
              >
                Cancel
              </Link>
              <button
                className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save User"}
              </button>
            </div>
          </div>
        )}
      </form>
    </AdminShell>
  );
}

export function AdminUserCreatePage() {
  return <UserForm mode="create" />;
}

export function AdminUserEditPage({ userId }: Readonly<{ userId: string }>) {
  return <UserForm mode="edit" userId={userId} />;
}
