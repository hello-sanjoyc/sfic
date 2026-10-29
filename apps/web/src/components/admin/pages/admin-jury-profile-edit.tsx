"use client";

import { CheckCircle2, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export type EditableJury = {
  address?: string | null;
  categories?: string[];
  city?: string | null;
  designation?: string | null;
  email: string;
  full_name: string;
  id?: number | string;
  mobile: string;
  organisation_name?: string | null;
  pin_code?: string | null;
  professional_experience_years?: number | null;
  status: string;
};

type LookupItem = { id: number; name: { en: string } };
type StoredAdmin = { actor?: string; admin?: { role?: string } };
type AppSetting = { key: string; value: string };

const DEFAULT_MAX_CATEGORIES = 2;

function isSuperAdmin() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? "{}") as StoredAdmin;
    return (session.admin?.role ?? "SUPERADMIN").trim().toUpperCase().replace(/[\s-]+/g, "_") === "SUPERADMIN";
  } catch {
    return false;
  }
}

/**
 * Admin-side edit panel for a jury profile.
 * SuperAdmin can change every field; Region / State / District admins can change only
 * the categories and the Active / Inactive status. Jurisdiction scoping is enforced by the API
 * (the profile endpoint already returns 403 for juries outside the admin's area).
 */
export function AdminJuryProfileEdit({ jury, juryId, onSaved }: { jury: EditableJury; juryId: string; onSaved: () => void }) {
  const invitationPending = jury.status === "Invitation pending";
  const [canEditAll, setCanEditAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lookups, setLookups] = useState<LookupItem[]>([]);
  const [maxCategories, setMaxCategories] = useState(DEFAULT_MAX_CATEGORIES);
  const [categories, setCategories] = useState<string[]>(jury.categories ?? []);
  const [isActive, setIsActive] = useState(jury.status === "Active");
  const [fullName, setFullName] = useState(jury.full_name);
  const [email, setEmail] = useState(jury.email);
  const [mobile, setMobile] = useState(jury.mobile);
  const [organisation, setOrganisation] = useState(jury.organisation_name ?? "");
  const [designation, setDesignation] = useState(jury.designation ?? "");
  const [experience, setExperience] = useState(jury.professional_experience_years?.toString() ?? "");
  const [address, setAddress] = useState(jury.address ?? "");
  const [city, setCity] = useState(jury.city ?? "");
  const [pinCode, setPinCode] = useState(jury.pin_code ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setCanEditAll(isSuperAdmin()), []);
  useEffect(() => {
    if (!isOpen || lookups.length) return;
    apiClient.get<{ challengeCategories: LookupItem[] }>(endpoints.common.lookups).then((result) => setLookups(result.challengeCategories)).catch(() => setError("Unable to load challenge categories."));
  }, [isOpen, lookups.length]);
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get<AppSetting[]>(endpoints.common.appSettings).then((settings) => {
      const value = Number(settings.find((setting) => setting.key === "JURY_MAX_CHALLENGE_CATEGORY")?.value);
      if (Number.isFinite(value) && value > 0) setMaxCategories(value);
    }).catch(() => {});
  }, [isOpen]);

  const reset = () => {
    setCategories(jury.categories ?? []); setIsActive(jury.status === "Active"); setFullName(jury.full_name); setEmail(jury.email); setMobile(jury.mobile);
    setOrganisation(jury.organisation_name ?? ""); setDesignation(jury.designation ?? ""); setExperience(jury.professional_experience_years?.toString() ?? "");
    setAddress(jury.address ?? ""); setCity(jury.city ?? ""); setPinCode(jury.pin_code ?? ""); setError("");
  };
  const close = () => { reset(); setIsOpen(false); };
  const toggleCategory = (name: string) => setCategories((current) => current.includes(name) ? current.filter((item) => item !== name) : current.length < maxCategories ? [...current, name] : current);

  const experienceValid = experience === "" || (/^\d{1,3}$/.test(experience) && Number(experience) <= 100);
  const adminFieldsValid = !canEditAll || (fullName.trim() && /^\S+@\S+\.\S+$/.test(email) && mobile.replace(/\D/g, "").length === 10 && experienceValid && (pinCode === "" || /^\d{6}$/.test(pinCode)));
  const canSave = Boolean(categories.length > 0 && adminFieldsValid);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    const categoryIds = categories.map((name) => lookups.find((item) => item.name.en === name)?.id).filter((id): id is number => Boolean(id));
    if (categoryIds.length !== categories.length) { setError("A selected category is not available. Please refresh and try again."); return; }
    setError(""); setNotice(""); setIsSaving(true);
    try {
      await apiClient.patch(endpoints.jury.adminProfile(juryId), {
        categoryIds,
        ...(invitationPending ? {} : { isActive }),
        ...(canEditAll ? { address: address.trim(), city: city.trim(), designation: designation.trim(), email: email.trim(), fullName: fullName.trim(), mobile: mobile.trim(), organisationName: organisation.trim(), pinCode: pinCode.trim(), professionalExperienceYears: experience === "" ? null : Number(experience) } : {}),
      });
      setNotice("Jury profile updated."); setIsOpen(false); onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the jury profile.");
    } finally { setIsSaving(false); }
  };

  return <>
    {notice && <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} /> {notice}</p>}
    {!isOpen && <button className="inline-flex w-fit items-center gap-2 justify-self-end rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700" onClick={() => { setNotice(""); setIsOpen(true); }} type="button"><Pencil size={16} /> Edit jury profile</button>}
    {isOpen && <form className="grid gap-5 rounded-lg border border-blue-200 bg-white p-6 shadow-sm" onSubmit={save}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">Edit jury profile</h3>
          <p className="mt-1 text-sm text-slate-500">{canEditAll ? "As SuperAdmin you can change all profile data." : "You can change the challenge categories and the Active / Inactive status."}</p>
        </div>
        <button aria-label="Close edit form" className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={close} type="button"><X size={20} /></button>
      </div>

      {canEditAll && <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" onChange={setFullName} value={fullName} />
        <TextField label="Email address" onChange={setEmail} type="email" value={email} />
        <TextField inputMode="numeric" label="Mobile phone" maxLength={10} onChange={(value) => setMobile(value.replace(/\D/g, ""))} value={mobile} />
        <TextField label="Organisation / institute" onChange={setOrganisation} value={organisation} />
        <TextField label="Designation" onChange={setDesignation} value={designation} />
        <TextField error={!experienceValid ? "Enter a whole number from 0 to 100." : ""} inputMode="numeric" label="Professional experience (years)" maxLength={3} onChange={(value) => setExperience(value.replace(/\D/g, ""))} value={experience} />
        <TextField label="Address" onChange={setAddress} value={address} />
        <TextField label="City" onChange={setCity} value={city} />
        <TextField error={pinCode !== "" && !/^\d{6}$/.test(pinCode) ? "PIN code must be 6 digits." : ""} inputMode="numeric" label="PIN code" maxLength={6} onChange={(value) => setPinCode(value.replace(/\D/g, ""))} value={pinCode} />
      </div>}

      <fieldset>
        <legend className="text-sm font-bold text-slate-700">Challenge categories <span className="font-normal text-slate-500">(select 1 to {maxCategories})</span></legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(lookups.length ? lookups.map((item) => item.name.en) : categories).map((name) => {
            const selected = categories.includes(name); const unavailable = !selected && categories.length >= maxCategories;
            return <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-semibold transition ${selected ? "border-blue-600 bg-blue-50 text-blue-800" : unavailable ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700 hover:border-blue-300"}`} key={name}><input checked={selected} className="size-4" disabled={unavailable} onChange={() => toggleCategory(name)} type="checkbox" />{name}</label>;
          })}
        </div>
        {categories.length === 0 && <p className="mt-2 text-xs font-semibold text-rose-600">Select at least one category.</p>}
      </fieldset>

      <fieldset disabled={invitationPending}>
        <legend className="text-sm font-bold text-slate-700">Status</legend>
        <div className="mt-2 flex gap-3">
          {[[true, "Active"], [false, "Inactive"]].map(([value, label]) => <label className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${invitationPending ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400" : isActive === value ? "cursor-pointer border-blue-600 bg-blue-50 text-blue-800" : "cursor-pointer border-slate-200 text-slate-700"}`} key={label as string}><input checked={!invitationPending && isActive === value} name="jury-status" onChange={() => setIsActive(value as boolean)} type="radio" />{label as string}</label>)}
        </div>
        {invitationPending && <p className="mt-2 text-xs text-slate-500">Status can be changed once the jury has accepted the invitation.</p>}
      </fieldset>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={close} type="button">Cancel</button>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300" disabled={!canSave || isSaving} type="submit"><Save size={16} /> {isSaving ? "Saving…" : "Save changes"}</button>
      </div>
    </form>}
  </>;
}

function TextField({ error, inputMode, label, maxLength, onChange, type = "text", value }: { error?: string; inputMode?: "numeric"; label: string; maxLength?: number; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="grid gap-1.5 text-sm font-bold text-slate-700">{label}<input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" inputMode={inputMode} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} type={type} value={value} />{error && <span className="text-xs font-semibold text-rose-600">{error}</span>}</label>;
}
