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
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type AdminUser = {
  createdAt: string;
  districtId: number | null;
  email: string;
  fullName: string;
  id: number;
  isActive: boolean;
  mobile: string;
  role: string;
  stateId: number | null;
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

type UserRoleSetting = {
  isActive: boolean;
  role: string;
};

type UserRolesResponse = {
  userRoles: UserRoleSetting[];
};

type UserFormValues = {
  districtId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  mobile: string;
  role: string;
  stateId: string;
};

type LookupName = {
  bn?: string;
  en: string;
  hi?: string;
};

type LookupOption = {
  id: number;
  name: LookupName;
  stateId?: number;
};

type AdminSession = {
  actor?: string;
  admin?: {
    districtId?: number | null;
    role?: string;
    stateId?: number | null;
    usersAccess?: string;
  };
};

const emptyForm: UserFormValues = {
  districtId: "",
  email: "",
  fullName: "",
  isActive: true,
  mobile: "",
  role: "ADMIN",
  stateId: "",
};

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
  if (role === "ADMIN_REGION") return "Region Admin";
  if (role === "ADMIN_STATE") return "State Admin";
  if (role === "ADMIN_DISTRICT") return "District Admin";
  if (role === "JURY_L1") return "Jury L1";
  if (role === "JURY_L2") return "Jury L2";
  if (role === "HELPDESK") return "Helpdesk";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function parseAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? "null") as AdminSession | null;
  } catch {
    return null;
  }
}

function writableRolesForAdmin(role?: string) {
  if (role === "ADMIN_REGION") return new Set(["ADMIN_STATE"]);
  if (role === "ADMIN_STATE") return new Set(["ADMIN_DISTRICT"]);
  if (role === "ADMIN_DISTRICT") return new Set<string>();
  return null;
}

function hasFullUsersAccess() {
  const session = parseAdminSession();
  const access = session?.admin?.usersAccess;

  if (access) return access.trim().toLowerCase() === "full access";

  return session?.admin?.role !== "ADMIN_DISTRICT";
}

function userRequiresState(role: string) {
  return role === "ADMIN_STATE" || role === "ADMIN_DISTRICT";
}

function userRequiresDistrict(role: string) {
  return role === "ADMIN_DISTRICT";
}

function locationPayload(form: UserFormValues) {
  if (form.role === "ADMIN_STATE") {
    return {
      districtId: null,
      stateId: form.stateId || null,
    };
  }

  if (form.role === "ADMIN_DISTRICT") {
    return {
      districtId: form.districtId || null,
      stateId: form.stateId || null,
    };
  }

  return {
    districtId: null,
    stateId: null,
  };
}

function UserStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(isActive)}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function AdminUsersPage() {
  const [canWriteUsers, setCanWriteUsers] = useState(false);
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
    setCanWriteUsers(hasFullUsersAccess());
  }, []);

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
            {canWriteUsers && (
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
                href="/admin/users/new"
              >
                <Plus size={18} />
                Add User
              </Link>
            )}
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

function lookupName(options: LookupOption[], id: number | null) {
  if (!id) return "Not available";
  return options.find((option) => option.id === id)?.name.en ?? `#${id}`;
}

export function AdminUserDetailsPage({ userId }: Readonly<{ userId: string }>) {
  const [canWriteUsers, setCanWriteUsers] = useState(false);
  const [districts, setDistricts] = useState<LookupOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [states, setStates] = useState<LookupOption[]>([]);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setCanWriteUsers(hasFullUsersAccess());
  }, []);

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

  useEffect(() => {
    if (!user || !userRequiresState(user.role)) {
      setStates([]);
      setDistricts([]);
      setLocationError("");
      return;
    }

    let isMounted = true;

    setIsLocationLoading(true);
    setLocationError("");

    const requests: Array<Promise<unknown>> = [
      apiClient.get<LookupOption[]>(endpoints.common.states),
    ];

    if (userRequiresDistrict(user.role) && user.stateId) {
      requests.push(
        apiClient.get<LookupOption[]>(endpoints.common.districts, {
          query: { stateId: user.stateId },
        }),
      );
    }

    void Promise.all(requests)
      .then(([statesResult, districtsResult]) => {
        if (!isMounted) return;
        setStates(statesResult as LookupOption[]);
        setDistricts((districtsResult as LookupOption[] | undefined) ?? []);
      })
      .catch((error) => {
        if (!isMounted) return;
        setStates([]);
        setDistricts([]);
        setLocationError(
          error instanceof Error
            ? error.message
            : "Location details could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLocationLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

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
              {userRequiresState(user.role) && (
                <DetailRow
                  label="State"
                  value={
                    isLocationLoading
                      ? "Loading..."
                      : locationError || lookupName(states, user.stateId)
                  }
                />
              )}
              {userRequiresDistrict(user.role) && (
                <DetailRow
                  label="District"
                  value={
                    isLocationLoading
                      ? "Loading..."
                      : locationError || lookupName(districts, user.districtId)
                  }
                />
              )}
              <DetailRow label="Active Status" value={user.isActive ? "Active" : "Inactive"} />
              <DetailRow label="Created" value={formatDate(user.createdAt)} />
              <DetailRow label="Updated" value={formatDate(user.updatedAt)} />
            </dl>
          </>
        )}
      </section>

      {user && canWriteUsers && (
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
  const [currentAdmin, setCurrentAdmin] = useState<AdminSession["admin"] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const [initialForm, setInitialForm] = useState<UserFormValues | null>(
    mode === "create" ? emptyForm : null,
  );
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [districts, setDistricts] = useState<LookupOption[]>([]);
  const [isDistrictsLoading, setIsDistrictsLoading] = useState(false);
  const [isStatesLoading, setIsStatesLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesError, setRolesError] = useState("");
  const [states, setStates] = useState<LookupOption[]>([]);
  const [statesError, setStatesError] = useState("");

  useEffect(() => {
    const session = parseAdminSession();
    setCurrentAdmin(session?.actor === "admin" ? (session.admin ?? null) : null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsRolesLoading(true);
    setRolesError("");

    void apiClient
      .get<UserRolesResponse>(endpoints.admin.settings.userRoles)
      .then((result) => {
        if (!isMounted) return;

        const session = parseAdminSession();
        const effectiveAllowedRoles = writableRolesForAdmin(session?.admin?.role);
        const activeRoles = result.userRoles
          .filter((role) => role.isActive)
          .map((role) => role.role)
          .filter((role) => !effectiveAllowedRoles || effectiveAllowedRoles.has(role));
        setRoles(activeRoles);
        if (mode === "create" && activeRoles.length) {
          setForm((current) =>
            activeRoles.includes(current.role)
              ? current
              : { ...current, role: activeRoles[0] },
          );
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setRoles([]);
        setRolesError(
          error instanceof Error ? error.message : "User roles could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsRolesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode]);

  useEffect(() => {
    let isMounted = true;

    setIsStatesLoading(true);
    setStatesError("");

    void apiClient
      .get<LookupOption[]>(endpoints.common.states)
      .then((result) => {
        if (!isMounted) return;
        const nextStates =
          currentAdmin?.role === "ADMIN_STATE" && currentAdmin.stateId
            ? result.filter((state) => state.id === currentAdmin.stateId)
            : result;
        setStates(nextStates);
        if (mode === "create" && currentAdmin?.role === "ADMIN_STATE" && currentAdmin.stateId) {
          setForm((current) => ({
            ...current,
            role: "ADMIN_DISTRICT",
            stateId: String(currentAdmin.stateId),
          }));
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setStates([]);
        setStatesError(
          error instanceof Error ? error.message : "States could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsStatesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentAdmin?.role, currentAdmin?.stateId, mode]);

  useEffect(() => {
    if (!userRequiresDistrict(form.role) || !form.stateId) {
      setDistricts([]);
      setIsDistrictsLoading(false);
      return;
    }

    let isMounted = true;

    setIsDistrictsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<LookupOption[]>(endpoints.common.districts, {
        query: { stateId: form.stateId },
      })
      .then((result) => {
        if (!isMounted) return;
        setDistricts(result);
        setForm((current) =>
          current.districtId &&
          !result.some((district) => String(district.id) === current.districtId)
            ? { ...current, districtId: "" }
            : current,
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setDistricts([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Districts could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsDistrictsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [form.role, form.stateId]);

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
          districtId: result.user.districtId ? String(result.user.districtId) : "",
          email: result.user.email,
          fullName: result.user.fullName,
          isActive: result.user.isActive,
          mobile: result.user.mobile,
          role: result.user.role,
          stateId: result.user.stateId ? String(result.user.stateId) : "",
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
    setForm((current) => {
      if (key === "role") {
        const nextRole = String(value);
        return {
          ...current,
          districtId: userRequiresDistrict(nextRole) ? current.districtId : "",
          role: nextRole,
          stateId: userRequiresState(nextRole) ? current.stateId : "",
        };
      }

      if (key === "stateId") {
        return { ...current, districtId: "", stateId: String(value) };
      }

      return { ...current, [key]: value };
    });
  };

  const roleOptions = roles.includes(form.role)
    ? roles
    : mode === "edit" && form.role
      ? [form.role, ...roles]
      : roles;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRolesLoading || !roleOptions.length) {
      setErrorMessage("At least one active user role is required.");
      return;
    }
    if (userRequiresState(form.role) && !form.stateId) {
      setErrorMessage("State is required for this role.");
      return;
    }
    if (userRequiresDistrict(form.role) && !form.districtId) {
      setErrorMessage("District is required for this role.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const nextForm = {
      ...form,
      ...locationPayload(form),
    };

    const changedValues = Object.fromEntries(
      (Object.keys(nextForm) as Array<keyof typeof nextForm>)
        .filter((key) => mode === "create" || nextForm[key] !== initialForm?.[key])
        .map((key) => [key, nextForm[key]]),
    );

    if (mode === "edit" && Object.keys(changedValues).length === 0) {
      setIsSaving(false);
      router.push(`/admin/users/${userId}`);
      return;
    }

    const request =
      mode === "create"
        ? apiClient.post<UserResponse>(endpoints.admin.users, nextForm)
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
            {rolesError && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                {rolesError}
              </div>
            )}
            {statesError && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                {statesError}
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
                  disabled={isRolesLoading || !roleOptions.length}
                  onChange={(event) => updateField("role", event.target.value)}
                  value={form.role}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
                  ))}
                </select>
              </label>
              {userRequiresState(form.role) && (
                <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                  State
                  <select
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                    disabled={
                      isStatesLoading ||
                      !states.length ||
                      currentAdmin?.role === "ADMIN_STATE"
                    }
                    onChange={(event) => updateField("stateId", event.target.value)}
                    required
                    value={form.stateId}
                  >
                    <option value="">
                      {isStatesLoading ? "Loading states..." : "Select state"}
                    </option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name.en}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {userRequiresDistrict(form.role) && form.stateId && (
                <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                  District
                  <select
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                    disabled={isDistrictsLoading || !districts.length}
                    onChange={(event) => updateField("districtId", event.target.value)}
                    required
                    value={form.districtId}
                  >
                    <option value="">
                      {isDistrictsLoading
                        ? "Loading districts..."
                        : "Select district"}
                    </option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name.en}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
                disabled={
                  isSaving ||
                  isRolesLoading ||
                  isStatesLoading ||
                  isDistrictsLoading ||
                  !roleOptions.length
                }
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
