"use client";

import {
  ArrowLeft,
  Edit,
  Plus,
  RotateCcw,
  Save,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type ResourceKey =
  | "challenge-categories"
  | "configuration"
  | "districts"
  | "institute-types"
  | "participant-categories"
  | "states"
  | "user-roles";

type NamedSetting = {
  createdAt?: string;
  id: number;
  isActive: boolean;
  name: {
    bn: string;
    en: string;
    hi: string;
  };
  sortOrder?: number;
  updatedAt?: string;
};

type DistrictSetting = NamedSetting & {
  stateId: number;
};

type ParticipantCategorySetting = NamedSetting & {
  code: string;
  sortOrder: number;
};

type UserRoleSetting = {
  isActive: boolean;
  role: string;
};

type ConfigurationSetting = {
  createdAt?: string;
  description: string | null;
  isActive: boolean;
  key: string;
  type: "boolean" | "integer" | "string" | "timestamp";
  updatedAt?: string;
  value: string;
};

type SettingItem =
  | ConfigurationSetting
  | DistrictSetting
  | NamedSetting
  | ParticipantCategorySetting
  | UserRoleSetting;

type SettingFormValues = {
  code: string;
  description: string;
  isActive: boolean;
  key: string;
  nameBn: string;
  nameEn: string;
  nameHi: string;
  role: string;
  sortOrder: string;
  stateId: string;
  type: ConfigurationSetting["type"];
  value: string;
};

type ResourceConfig = {
  collectionKey: string;
  detailKey: string;
  endpoint: string;
  formTitle: string;
  itemEndpoint: (id: string | number) => string;
  key: ResourceKey;
  listTitle: string;
  path: string;
  title: string;
  usesCode?: boolean;
  usesConfiguration?: boolean;
  usesNames?: boolean;
  usesSortOrder?: boolean;
  usesState?: boolean;
  usesRole?: boolean;
};

const emptyForm: SettingFormValues = {
  code: "",
  description: "",
  isActive: true,
  key: "",
  nameBn: "",
  nameEn: "",
  nameHi: "",
  role: "",
  sortOrder: "0",
  stateId: "",
  type: "string",
  value: "",
};

const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  "challenge-categories": {
    collectionKey: "challengeCategories",
    detailKey: "challengeCategory",
    endpoint: endpoints.admin.settings.challengeCategories,
    formTitle: "Challenge Category",
    itemEndpoint: endpoints.admin.settings.challengeCategory,
    key: "challenge-categories",
    listTitle: "Challenge Categories",
    path: "/admin/settings/challenge-categories",
    title: "Challenge Categories",
    usesNames: true,
    usesSortOrder: true,
  },
  configuration: {
    collectionKey: "configurations",
    detailKey: "configuration",
    endpoint: endpoints.admin.settings.configurations,
    formTitle: "Configuration",
    itemEndpoint: (key) => endpoints.admin.settings.configuration(String(key)),
    key: "configuration",
    listTitle: "Configurations",
    path: "/admin/settings/configuration",
    title: "Configuration",
    usesConfiguration: true,
  },
  districts: {
    collectionKey: "districts",
    detailKey: "district",
    endpoint: endpoints.admin.settings.districts,
    formTitle: "District",
    itemEndpoint: endpoints.admin.settings.district,
    key: "districts",
    listTitle: "Districts",
    path: "/admin/settings/districts",
    title: "Districts",
    usesNames: true,
    usesState: true,
  },
  "institute-types": {
    collectionKey: "instituteTypes",
    detailKey: "instituteType",
    endpoint: endpoints.admin.settings.instituteTypes,
    formTitle: "Institute Type",
    itemEndpoint: endpoints.admin.settings.instituteType,
    key: "institute-types",
    listTitle: "Institute Types",
    path: "/admin/settings/institute-types",
    title: "Institute Types",
    usesNames: true,
    usesSortOrder: true,
  },
  "participant-categories": {
    collectionKey: "participantCategories",
    detailKey: "participantCategory",
    endpoint: endpoints.admin.settings.participantCategories,
    formTitle: "Participant Category",
    itemEndpoint: endpoints.admin.settings.participantCategory,
    key: "participant-categories",
    listTitle: "Participant Categories",
    path: "/admin/settings/participant-categories",
    title: "Participant Categories",
    usesCode: true,
    usesNames: true,
    usesSortOrder: true,
  },
  states: {
    collectionKey: "states",
    detailKey: "state",
    endpoint: endpoints.admin.settings.states,
    formTitle: "State",
    itemEndpoint: endpoints.admin.settings.state,
    key: "states",
    listTitle: "States",
    path: "/admin/settings/states",
    title: "States",
    usesNames: true,
  },
  "user-roles": {
    collectionKey: "userRoles",
    detailKey: "userRole",
    endpoint: endpoints.admin.settings.userRoles,
    formTitle: "User Role",
    itemEndpoint: (role) => endpoints.admin.settings.userRole(String(role)),
    key: "user-roles",
    listTitle: "User Roles",
    path: "/admin/settings/user-roles",
    title: "User Roles",
    usesRole: true,
  },
};

function isConfiguration(item: SettingItem): item is ConfigurationSetting {
  return "key" in item && "value" in item && "type" in item;
}

function isUserRole(item: SettingItem): item is UserRoleSetting {
  return "role" in item;
}

function isNamedSetting(item: SettingItem): item is NamedSetting {
  return !isUserRole(item) && !isConfiguration(item);
}

function itemId(item: SettingItem) {
  if (isConfiguration(item)) return item.key;
  return isUserRole(item) ? item.role : item.id;
}

function itemName(item: SettingItem) {
  if (isConfiguration(item)) return item.key;
  return isUserRole(item) ? item.role : item.name.en;
}

function statusClasses(isActive: boolean) {
  return isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toFormValues(item: SettingItem): SettingFormValues {
  if (isConfiguration(item)) {
    return {
      ...emptyForm,
      description: item.description ?? "",
      isActive: item.isActive,
      key: item.key,
      type: item.type,
      value: item.value,
    };
  }

  if (isUserRole(item)) {
    return {
      ...emptyForm,
      isActive: item.isActive,
      role: item.role,
    };
  }

  return {
    ...emptyForm,
    code: "code" in item ? item.code : "",
    isActive: item.isActive,
    nameBn: item.name.bn,
    nameEn: item.name.en,
    nameHi: item.name.hi,
    role: "",
    sortOrder: String(item.sortOrder ?? 0),
    stateId: "stateId" in item ? String(item.stateId) : "",
  };
}

function toPayload(config: ResourceConfig, values: SettingFormValues) {
  if (config.usesConfiguration) {
    return {
      description: values.description,
      isActive: values.isActive,
      key: values.key,
      type: values.type,
      value: values.value,
    };
  }

  if (config.usesRole) {
    return {
      isActive: values.isActive,
      role: values.role,
    };
  }

  return {
    ...(config.usesCode ? { code: values.code } : {}),
    isActive: values.isActive,
    nameBn: values.nameBn,
    nameEn: values.nameEn,
    nameHi: values.nameHi,
    ...(config.usesSortOrder ? { sortOrder: Number(values.sortOrder || 0) } : {}),
    ...(config.usesState ? { stateId: Number(values.stateId) } : {}),
  };
}

function getCollection(body: unknown, config: ResourceConfig): SettingItem[] {
  if (!body || typeof body !== "object") return [];
  const value = (body as Record<string, unknown>)[config.collectionKey];
  return Array.isArray(value) ? (value as SettingItem[]) : [];
}

function getDetail(body: unknown, config: ResourceConfig): SettingItem | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)[config.detailKey];
  return value && typeof value === "object" ? (value as SettingItem) : null;
}

function stateName(states: SettingItem[], stateId: number) {
  const state = states.find((item) => isNamedSetting(item) && item.id === stateId);
  return state && isNamedSetting(state) ? state.name.en : `State #${stateId}`;
}

export function AdminSettingsResourceListPage({
  resourceKey,
}: Readonly<{
  resourceKey: ResourceKey;
}>) {
  const config = resourceConfigs[resourceKey];
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<SettingItem[]>([]);
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<SettingItem[]>([]);
  const effectiveQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (!effectiveQuery) return true;
        const text = isUserRole(item)
          ? item.role
          : isConfiguration(item)
            ? `${item.key} ${item.value} ${item.type} ${item.description ?? ""}`
          : `${item.name.en} ${item.name.bn} ${item.name.hi} ${
              "code" in item ? item.code : ""
            }`;
        return text.toLowerCase().includes(effectiveQuery);
      }),
    [effectiveQuery, items],
  );
  const tableColumnCount =
    1 +
    (config.usesCode ? 1 : 0) +
    (config.usesConfiguration ? 3 : 0) +
    (config.usesState ? 1 : 0) +
    (config.usesSortOrder ? 1 : 0) +
    1 +
    (config.usesConfiguration ? 0 : 1) +
    1;

  const loadItems = () => {
    setIsLoading(true);
    setErrorMessage("");

    const requests: Array<Promise<unknown>> = [apiClient.get(config.endpoint)];
    if (config.usesState) {
      requests.push(apiClient.get(endpoints.admin.settings.states));
    }

    void Promise.all(requests)
      .then(([resourceResult, statesResult]) => {
        setItems(getCollection(resourceResult, config));
        if (statesResult) {
          setStates(getCollection(statesResult, resourceConfigs.states));
        }
      })
      .catch((error) => {
        setItems([]);
        setErrorMessage(
          error instanceof Error ? error.message : `${config.title} could not be loaded.`,
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(loadItems, [config]);

  return (
    <AdminShell eyebrow="Master data and access configuration" title={config.title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-600" href="/admin/settings">
          <ArrowLeft size={18} />
          Back to Settings
        </Link>
        <Link
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
          href={`${config.path}/new`}
        >
          <Plus size={18} />
          Add {config.formTitle}
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-black text-[#0b1f3a]">{config.listTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredItems.length} record{filteredItems.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-80">
            <Search size={18} />
            <input
              aria-label={`Search ${config.title}`}
              className="min-w-0 flex-1 bg-transparent font-normal text-slate-700 outline-none placeholder:text-slate-500"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}`}
              type="search"
              value={query}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  {config.usesConfiguration ? "Key" : "Name / Role"}
                </th>
                {config.usesCode && <th className="px-4 py-3">Code</th>}
                {config.usesConfiguration && <th className="px-4 py-3">Type</th>}
                {config.usesConfiguration && <th className="px-4 py-3">Value</th>}
                {config.usesConfiguration && (
                  <th className="px-4 py-3">Description</th>
                )}
                {config.usesState && <th className="px-4 py-3">State</th>}
                {config.usesSortOrder && <th className="px-4 py-3">Sort</th>}
                <th className="px-4 py-3">Status</th>
                {!config.usesConfiguration && (
                  <th className="px-4 py-3">Updated</th>
                )}
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan={tableColumnCount}>
                    Loading {config.title.toLowerCase()}...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-rose-600" colSpan={tableColumnCount}>
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading && !errorMessage && filteredItems.map((item) => (
                <tr key={String(itemId(item))}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#0b1f3a]">{itemName(item)}</p>
                    {!isUserRole(item) && !isConfiguration(item) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.name.bn} / {item.name.hi}
                      </p>
                    )}
                  </td>
                  {config.usesCode && (
                    <td className="px-4 py-3 text-slate-600">
                      {"code" in item ? item.code : "-"}
                    </td>
                  )}
                  {config.usesConfiguration && (
                    <td className="px-4 py-3 text-slate-600">
                      {isConfiguration(item) ? item.type : "-"}
                    </td>
                  )}
                  {config.usesConfiguration && (
                    <td className="max-w-72 px-4 py-3 text-slate-600">
                      <span className="line-clamp-2 break-words">
                        {isConfiguration(item) ? item.value : "-"}
                      </span>
                    </td>
                  )}
                  {config.usesConfiguration && (
                    <td className="max-w-80 px-4 py-3 text-slate-600">
                      <span className="line-clamp-2 break-words">
                        {isConfiguration(item) ? item.description || "-" : "-"}
                      </span>
                    </td>
                  )}
                  {config.usesState && (
                    <td className="px-4 py-3 text-slate-600">
                      {"stateId" in item ? stateName(states, item.stateId) : "-"}
                    </td>
                  )}
                  {config.usesSortOrder && (
                    <td className="px-4 py-3 text-slate-600">
                      {isNamedSetting(item) ? item.sortOrder ?? 0 : "-"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(item.isActive)}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {!config.usesConfiguration && (
                    <td className="px-4 py-3 text-slate-600">
                      {isUserRole(item) ? "-" : formatDate(item.updatedAt)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      aria-label={`Edit ${itemName(item)}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50"
                      href={`${config.path}/${encodeURIComponent(String(itemId(item)))}/edit`}
                    >
                      <Edit size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && !errorMessage && filteredItems.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan={tableColumnCount}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

export function AdminSettingsResourceFormPage({
  itemId: selectedItemId,
  mode,
  resourceKey,
}: Readonly<{
  itemId?: string;
  mode: "create" | "edit";
  resourceKey: ResourceKey;
}>) {
  const config = resourceConfigs[resourceKey];
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<SettingFormValues>(emptyForm);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [states, setStates] = useState<SettingItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const requests: Array<Promise<unknown>> = [];

    if (mode === "edit" && selectedItemId) {
      requests.push(apiClient.get(config.itemEndpoint(selectedItemId)));
    }

    if (config.usesState) {
      requests.push(apiClient.get(endpoints.admin.settings.states));
    }

    if (!requests.length) return;

    setIsLoading(true);
    setErrorMessage("");

    void Promise.all(requests)
      .then((results) => {
        if (!isMounted) return;
        const detailResult = mode === "edit" ? results[0] : null;
        const statesResult = config.usesState
          ? results[mode === "edit" ? 1 : 0]
          : null;

        if (detailResult) {
          const item = getDetail(detailResult, config);
          if (item) setForm(toFormValues(item));
        }

        if (statesResult) {
          setStates(getCollection(statesResult, resourceConfigs.states));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : `${config.formTitle} could not be loaded.`,
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [config, mode, selectedItemId]);

  const updateField = <Key extends keyof SettingFormValues>(
    key: Key,
    value: SettingFormValues[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    const payload = toPayload(config, form);
    const request =
      mode === "create"
        ? apiClient.post(config.endpoint, payload)
        : apiClient.patch(config.itemEndpoint(selectedItemId ?? ""), payload);

    void request
      .then(() => {
        router.push(config.path);
        router.refresh();
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : `${config.formTitle} could not be saved.`,
        );
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <AdminShell
      eyebrow="Master data and access configuration"
      title={`${mode === "create" ? "Add" : "Edit"} ${config.formTitle}`}
    >
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-600" href={config.path}>
        <ArrowLeft size={18} />
        Back to {config.title}
      </Link>

      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
        {isLoading ? (
          <p className="text-sm font-semibold text-slate-500">Loading...</p>
        ) : (
          <div className="grid gap-5">
            {errorMessage && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {config.usesRole && (
                <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                  Role
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                    onChange={(event) => updateField("role", event.target.value.toUpperCase())}
                    required
                    value={form.role}
                  />
                </label>
              )}

              {config.usesCode && (
                <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                  Code
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                    onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                    required
                    value={form.code}
                  />
                </label>
              )}

              {config.usesState && (
                <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                  State
                  <select
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                    onChange={(event) => updateField("stateId", event.target.value)}
                    required
                    value={form.stateId}
                  >
                    <option value="">Select state</option>
                    {states.filter(isNamedSetting).map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name.en}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {config.usesConfiguration && (
                <>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                    Key
                    <input
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) => updateField("key", event.target.value.toUpperCase())}
                      pattern="[A-Z0-9_]{2,120}"
                      required
                      value={form.key}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                    Type
                    <select
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) =>
                        updateField("type", event.target.value as SettingFormValues["type"])
                      }
                      required
                      value={form.type}
                    >
                      <option value="string">String</option>
                      <option value="boolean">Boolean</option>
                      <option value="integer">Integer</option>
                      <option value="timestamp">Timestamp</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a] md:col-span-2">
                    Value
                    <input
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) => updateField("value", event.target.value)}
                      required
                      type={form.type === "integer" ? "number" : "text"}
                      value={form.value}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a] md:col-span-2">
                    Description
                    <textarea
                      className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) => updateField("description", event.target.value)}
                      value={form.description}
                    />
                  </label>
                </>
              )}

              {config.usesNames && (
                <>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                    Name (English)
                    <input
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) => updateField("nameEn", event.target.value)}
                      required
                      value={form.nameEn}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                    Name (Bengali)
                    <input
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) => updateField("nameBn", event.target.value)}
                      required
                      value={form.nameBn}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                    Name (Hindi)
                    <input
                      className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                      onChange={(event) => updateField("nameHi", event.target.value)}
                      required
                      value={form.nameHi}
                    />
                  </label>
                </>
              )}

              {config.usesSortOrder && (
                <label className="grid gap-2 text-sm font-bold text-[#0b1f3a]">
                  Sort Order
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 font-normal text-slate-700 outline-none focus:border-blue-500"
                    min={0}
                    onChange={(event) => updateField("sortOrder", event.target.value)}
                    required
                    type="number"
                    value={form.sortOrder}
                  />
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
              Active
            </label>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700"
                href={config.path}
              >
                <RotateCcw size={18} />
                Cancel
              </Link>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                <Save size={18} />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </form>
    </AdminShell>
  );
}
