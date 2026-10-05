"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Database,
  Edit,
  Plus,
  Save,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type RbacRule = {
  analyticsAccess: string;
  applicationsAccess: string;
  description: string;
  id: number;
  isActive: boolean;
  role: string;
  scope: string;
  scopeNotes: string[];
  settingsAccess: string;
  usersAccess: string;
};

type RbacRulesResponse = {
  rbacRules: RbacRule[];
};

type RbacRuleResponse = {
  rbacRule: RbacRule;
};

type UserRoleSetting = {
  isActive: boolean;
  role: string;
};

type UserRolesResponse = {
  userRoles: UserRoleSetting[];
};

type RbacFormValues = {
  analyticsAccess: string;
  applicationsAccess: string;
  description: string;
  isActive: boolean;
  role: string;
  scope: string;
  scopeNotes: string;
  settingsAccess: string;
  usersAccess: string;
};

const emptyForm: RbacFormValues = {
  analyticsAccess: "No Access",
  applicationsAccess: "No Access",
  description: "",
  isActive: true,
  role: "",
  scope: "Application",
  scopeNotes: "",
  settingsAccess: "No Access",
  usersAccess: "No Access",
};

const accessOptions = ["Full Access", "View Only", "No Access"] as const;
const scopeOptions = ["Application", "Region", "State", "District"] as const;

const moduleColumns = [
  ["applicationsAccess", "Applications", ClipboardList],
  ["usersAccess", "Users", Users],
  ["settingsAccess", "Settings", Settings],
  ["analyticsAccess", "Reports & Analytics", Database],
] as const;

function toFormValues(rule: RbacRule): RbacFormValues {
  return {
    analyticsAccess: rule.analyticsAccess,
    applicationsAccess: rule.applicationsAccess,
    description: rule.description,
    isActive: rule.isActive,
    role: rule.role,
    scope: rule.scope,
    scopeNotes: rule.scopeNotes.join("\n"),
    settingsAccess: rule.settingsAccess,
    usersAccess: rule.usersAccess,
  };
}

function toPayload(form: RbacFormValues) {
  return {
    ...form,
    role: form.role.trim().toUpperCase(),
    scopeNotes: form.scopeNotes
      .split("\n")
      .map((note) => note.trim())
      .filter(Boolean),
  };
}

function accessBadge(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  const classes =
    normalizedValue === "no access"
      ? "bg-rose-50 text-rose-700"
      : normalizedValue === "view only"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";
  const showIcon = normalizedValue !== "no access";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${classes}`}
    >
      {showIcon && <CheckCircle2 size={14} />}
      {value}
    </span>
  );
}

export function AdminRbacSettingsPage() {
  const [editingRule, setEditingRule] = useState<RbacRule | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<RbacFormValues>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [rules, setRules] = useState<RbacRule[]>([]);
  const activeRules = useMemo(
    () => rules.filter((rule) => rule.isActive),
    [rules],
  );
  const roleOptionsForForm =
    form.role && !roleOptions.includes(form.role)
      ? [form.role, ...roleOptions]
      : roleOptions;

  const loadRules = () => {
    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<RbacRulesResponse>(endpoints.admin.settings.rbac)
      .then((result) => setRules(result.rbacRules))
      .catch((error) => {
        setRules([]);
        setErrorMessage(
          error instanceof Error ? error.message : "RBAC rules could not be loaded.",
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(loadRules, []);

  useEffect(() => {
    let isMounted = true;

    setIsRolesLoading(true);

    void apiClient
      .get<UserRolesResponse>(endpoints.admin.settings.userRoles)
      .then((result) => {
        if (!isMounted) return;
        const activeRoles = result.userRoles
          .filter((role) => role.isActive)
          .map((role) => role.role);
        setRoleOptions(activeRoles);
        setForm((current) =>
          current.role || !activeRoles.length
            ? current
            : { ...current, role: activeRoles[0] },
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setRoleOptions([]);
        setErrorMessage(
          error instanceof Error ? error.message : "User roles could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsRolesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openCreateForm = () => {
    setEditingRule(null);
    setForm({
      ...emptyForm,
      role: roleOptions[0] ?? "",
    });
    setErrorMessage("");
    setIsFormOpen(true);
  };

  const openEditForm = (rule: RbacRule) => {
    setEditingRule(rule);
    setForm(toFormValues(rule));
    setErrorMessage("");
    setIsFormOpen(true);
  };

  const updateField = <Key extends keyof RbacFormValues>(
    key: Key,
    value: RbacFormValues[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRolesLoading || !roleOptionsForForm.length) {
      setErrorMessage("At least one active role is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const request = editingRule
      ? apiClient.patch<RbacRuleResponse>(
          endpoints.admin.settings.rbacRule(editingRule.id),
          toPayload(form),
        )
      : apiClient.post<RbacRuleResponse>(
          endpoints.admin.settings.rbac,
          toPayload(form),
        );

    void request
      .then(() => {
        setIsFormOpen(false);
        setEditingRule(null);
        setForm(emptyForm);
        loadRules();
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : "RBAC rule could not be saved.",
        );
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <AdminShell
      eyebrow="Role based access configuration"
      title="RBAC Settings"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          href="/admin/settings"
        >
          <ArrowLeft size={18} />
          Back to Settings
        </Link>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
          onClick={openCreateForm}
          type="button"
        >
          <Plus size={18} />
          Add RBAC Rule
        </button>
      </div>

      {errorMessage && !isFormOpen && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      {isFormOpen && (
        <form
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#0b1f3a]">
                {editingRule ? "Edit RBAC Rule" : "Add RBAC Rule"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure a role, its scope and module-level access text.
              </p>
            </div>
            <button
              aria-label="Close form"
              className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setIsFormOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
              Role
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                disabled={isRolesLoading || !roleOptionsForForm.length}
                onChange={(event) => updateField("role", event.target.value)}
                required
                value={form.role}
              >
                {roleOptionsForForm.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
              Scope
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                onChange={(event) => updateField("scope", event.target.value)}
                required
                value={form.scope}
              >
                {scopeOptions.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#0b1f3a] md:col-span-2">
              Description
              <textarea
                className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-700 outline-none focus:border-blue-500"
                onChange={(event) => updateField("description", event.target.value)}
                required
                value={form.description}
              />
            </label>
            {moduleColumns.map(([key, label]) => (
              <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]" key={key}>
                {label} Access
                <select
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                  onChange={(event) => updateField(key, event.target.value)}
                  required
                  value={form[key]}
                >
                  {accessOptions.map((access) => (
                    <option key={access} value={access}>
                      {access}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="grid gap-2 text-sm font-bold text-[#0b1f3a] md:col-span-2">
              Scope Notes
              <textarea
                className="min-h-28 rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-700 outline-none focus:border-blue-500"
                onChange={(event) => updateField("scopeNotes", event.target.value)}
                placeholder="One note per line"
                value={form.scopeNotes}
              />
            </label>
          </div>

          <label className="mt-5 inline-flex items-center gap-3 text-sm font-bold text-[#0b1f3a]">
            <input
              checked={form.isActive}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              onChange={(event) => updateField("isActive", event.target.checked)}
              type="checkbox"
            />
            Active rule
          </label>

          {errorMessage && (
            <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700"
              onClick={() => setIsFormOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || isRolesLoading || !roleOptionsForForm.length}
                type="submit"
              >
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              Access matrix
            </p>
            <h2 className="mt-2 text-xl font-black text-[#0b1f3a]">
              RBAC Rules
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {activeRules.length} active role{activeRules.length === 1 ? "" : "s"} configured.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[76rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Scope</th>
                {moduleColumns.map(([, label]) => (
                  <th className="px-4 py-3" key={label}>
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan={8}>
                    Loading RBAC rules...
                  </td>
                </tr>
              )}
              {!isLoading && rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-4">
                    <p className="font-black text-[#0b1f3a]">{rule.role}</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                      {rule.description}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {rule.scope}
                  </td>
                  {moduleColumns.map(([key]) => (
                    <td className="px-4 py-4" key={key}>
                      {accessBadge(rule[key])}
                    </td>
                  ))}
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        rule.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      aria-label={`Edit ${rule.role}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => openEditForm(rule)}
                      type="button"
                    >
                      <Edit size={17} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && !rules.length && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan={8}>
                    No RBAC rules configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#0b1f3a]">
          Scope Enforcement Notes
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {activeRules.flatMap((rule) =>
            rule.scopeNotes.map((note) => (
              <div
                className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700"
                key={`${rule.id}-${note}`}
              >
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                <span>{note}</span>
              </div>
            )),
          )}
        </div>
      </section>
    </AdminShell>
  );
}
