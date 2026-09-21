"use client";

import {
  ArrowLeft,
  ClipboardList,
  FileText,
  GraduationCap,
  Lightbulb,
  MapPin,
  Save,
  Trash2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type LocalizedText = {
  bn?: string | null;
  en?: string | null;
  hi?: string | null;
};

type LookupItem = {
  code?: string;
  id: number;
  name: LocalizedText;
  participantCategoryCodes?: string[];
  stateId?: number;
};

type LookupsResponse = {
  challengeCategories: LookupItem[];
  districts: LookupItem[];
  instituteTypes: LookupItem[];
  participantCategories: LookupItem[];
  states: LookupItem[];
};

type ApplicationDetails = {
  applicationNumber?: string | null;
  createdAt?: string | null;
  documents?: Array<{
    documentType?: string | null;
    fileSizeBytes?: number | string | null;
    id?: number | string | null;
    originalFileName?: string | null;
  }>;
  formLanguage?: string | null;
  participant?: {
    dateOfBirth?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    fullName?: string | null;
    gender?: string | null;
    mobile?: string | null;
  } | null;
  participationMode?: string | null;
  profile?: Record<string, string | number | null | undefined>;
  proposal?: Record<string, string | number | null | undefined>;
  status?: string | null;
  submittedAt?: string | null;
  teamMembers?: Array<{
    email?: string | null;
    fullName?: string | null;
    id?: number | string | null;
    isApplicant?: boolean | null;
    mobile?: string | null;
  }>;
};

type ApplicationDetailsResponse = {
  application: ApplicationDetails;
};

type EditApplicationForm = {
  address: string;
  beneficiaries: string;
  challengeCategoryId: string;
  city: string;
  costFunding: string;
  districtId: string;
  expectedImpact: string;
  formLanguage: string;
  fullName: string;
  gender: string;
  highestEducationalQualification: string;
  implementationRoute: string;
  instituteName: string;
  instituteTypeId: string;
  intellectualPropertyPublication: string;
  lastAttendedEducationalInstitute: string;
  mentorAcknowledgeTo: string;
  participantCategoryId: string;
  participationMode: string;
  participantDateOfBirth: string;
  participantEmail: string;
  participantMobile: string;
  pinCode: string;
  problemLocation: string;
  projectTimeline: string;
  proposedSolution: string;
  prototypePilot: string;
  scalability: string;
  stateId: string;
  status: string;
  technologyMethod: string;
  videoUrl: string;
  yearOfPassing: string;
};

function localizedName(value?: LocalizedText | null) {
  return value?.en ?? value?.bn ?? value?.hi ?? "Not available";
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatFileSize(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";

  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "Not available";

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function toEditForm(application: ApplicationDetails): EditApplicationForm {
  return {
    address: stringValue(application.profile?.address),
    beneficiaries: stringValue(application.proposal?.beneficiaries),
    challengeCategoryId: stringValue(application.proposal?.challengeCategoryId),
    city: stringValue(application.profile?.city),
    costFunding: stringValue(application.proposal?.costFunding),
    districtId: stringValue(application.profile?.districtId),
    expectedImpact: stringValue(application.proposal?.expectedImpact),
    formLanguage: application.formLanguage ?? "en",
    fullName: application.participant?.fullName ?? "",
    gender: application.participant?.gender ?? "",
    highestEducationalQualification: stringValue(
      application.profile?.highestEducationalQualification,
    ),
    implementationRoute: stringValue(application.proposal?.implementationRoute),
    instituteName: stringValue(application.profile?.instituteName),
    instituteTypeId: stringValue(application.profile?.instituteTypeId),
    intellectualPropertyPublication: stringValue(
      application.proposal?.intellectualPropertyPublication,
    ),
    lastAttendedEducationalInstitute: stringValue(
      application.profile?.lastAttendedEducationalInstitute,
    ),
    mentorAcknowledgeTo: stringValue(application.proposal?.mentorAcknowledgeTo),
    participantCategoryId: stringValue(application.profile?.participantCategoryId),
    participationMode: application.participationMode ?? "Individual",
    participantDateOfBirth: dateInputValue(application.participant?.dateOfBirth),
    participantEmail: application.participant?.email ?? "",
    participantMobile: application.participant?.mobile ?? "",
    pinCode: stringValue(application.profile?.pinCode),
    problemLocation: stringValue(application.proposal?.problemLocation),
    projectTimeline: stringValue(application.proposal?.projectTimeline),
    proposedSolution: stringValue(application.proposal?.proposedSolution),
    prototypePilot: stringValue(application.proposal?.prototypePilot),
    scalability: stringValue(application.proposal?.scalability),
    stateId: stringValue(application.profile?.stateId),
    status: application.status ?? "draft",
    technologyMethod: stringValue(application.proposal?.technologyMethod),
    videoUrl: stringValue(application.proposal?.videoUrl),
    yearOfPassing: stringValue(application.profile?.yearOfPassing),
  };
}

function Section({
  children,
  icon: Icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  icon: typeof ClipboardList;
  title: string;
}>) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 p-5">
        <Icon className="text-blue-600" size={21} />
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="grid gap-4 p-5">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  name,
  onChange,
  type = "text",
  value,
}: Readonly<{
  label: string;
  name: keyof EditApplicationForm;
  onChange: (name: keyof EditApplicationForm, value: string) => void;
  type?: string;
  value: string;
}>) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#0b1f3a]">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-blue-500"
        onChange={(event) => onChange(name, event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  onChange,
  value,
}: Readonly<{
  label: string;
  name: keyof EditApplicationForm;
  onChange: (name: keyof EditApplicationForm, value: string) => void;
  value: string;
}>) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#0b1f3a]">
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500"
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  name,
  onChange,
  value,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  name: keyof EditApplicationForm;
  onChange: (name: keyof EditApplicationForm, value: string) => void;
  value: string;
}>) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#0b1f3a]">
      {label}
      <select
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500"
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: Readonly<{
  label: string;
  value: unknown;
}>) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase text-[#0b1f3a]">{label}</p>
      <p className="mt-1 break-words text-sm font-normal text-[#0b1f3a]">
        {formatValue(value)}
      </p>
    </div>
  );
}

export function AdminApplicationEditPage({
  applicationId,
}: Readonly<{
  applicationId: string;
}>) {
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<
    NonNullable<ApplicationDetails["documents"]>[number] | null
  >(null);
  const [editForm, setEditForm] = useState<EditApplicationForm | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lookups, setLookups] = useState<LookupsResponse>({
    challengeCategories: [],
    districts: [],
    instituteTypes: [],
    participantCategories: [],
    states: [],
  });

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void Promise.all([
      apiClient.get<ApplicationDetailsResponse>(
        endpoints.admin.application(applicationId),
      ),
      apiClient.get<LookupsResponse>(endpoints.common.lookups),
    ])
      .then(([applicationResult, lookupResult]) => {
        if (!isMounted) return;
        setApplication(applicationResult.application);
        setEditForm(toEditForm(applicationResult.application));
        setLookups(lookupResult);
      })
      .catch((error) => {
        if (!isMounted) return;
        setApplication(null);
        setEditForm(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Application details could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applicationId]);

  const title = application?.applicationNumber
    ? `Edit ${application.applicationNumber}`
    : "Edit Application";

  const selectedParticipantCategory = lookups.participantCategories.find(
    (category) => String(category.id) === editForm?.participantCategoryId,
  );

  const districtOptions = useMemo(
    () =>
      lookups.districts.filter(
        (district) =>
          !editForm?.stateId || String(district.stateId) === editForm.stateId,
      ),
    [editForm?.stateId, lookups.districts],
  );

  const instituteTypeOptions = useMemo(
    () =>
      lookups.instituteTypes.filter(
        (type) =>
          !selectedParticipantCategory?.code ||
          type.participantCategoryCodes?.includes(selectedParticipantCategory.code),
      ),
    [lookups.instituteTypes, selectedParticipantCategory?.code],
  );

  const updateFormField = (name: keyof EditApplicationForm, value: string) => {
    setEditForm((current) => {
      if (!current) return current;

      if (name === "stateId") {
        return { ...current, districtId: "", stateId: value };
      }

      if (name === "participantCategoryId") {
        return { ...current, instituteTypeId: "", participantCategoryId: value };
      }

      return { ...current, [name]: value };
    });
  };

  const saveApplication = () => {
    if (!editForm) return;

    setIsSaving(true);
    setErrorMessage("");

    void apiClient
      .patch<ApplicationDetailsResponse>(endpoints.admin.application(applicationId), {
        formLanguage: editForm.formLanguage,
        participant: {
          dateOfBirth: editForm.participantDateOfBirth || null,
          gender: editForm.gender || null,
        },
        participationMode: editForm.participationMode,
        profile: {
          address: editForm.address,
          city: editForm.city,
          districtId: editForm.districtId || null,
          highestEducationalQualification:
            editForm.highestEducationalQualification,
          instituteName: editForm.instituteName,
          instituteTypeId: editForm.instituteTypeId || null,
          lastAttendedEducationalInstitute:
            editForm.lastAttendedEducationalInstitute,
          participantCategoryId: editForm.participantCategoryId,
          pinCode: editForm.pinCode,
          stateId: editForm.stateId || null,
          yearOfPassing: editForm.yearOfPassing,
        },
        proposal: {
          beneficiaries: editForm.beneficiaries,
          challengeCategoryId: editForm.challengeCategoryId || null,
          costFunding: editForm.costFunding,
          expectedImpact: editForm.expectedImpact,
          implementationRoute: editForm.implementationRoute,
          intellectualPropertyPublication:
            editForm.intellectualPropertyPublication,
          mentorAcknowledgeTo: editForm.mentorAcknowledgeTo,
          problemLocation: editForm.problemLocation,
          projectTimeline: editForm.projectTimeline,
          proposedSolution: editForm.proposedSolution,
          prototypePilot: editForm.prototypePilot,
          scalability: editForm.scalability,
          technologyMethod: editForm.technologyMethod,
          videoUrl: editForm.videoUrl,
        },
        status: editForm.status,
      })
      .then(() => {
        router.push(`/admin/applications/${applicationId}`);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Application could not be updated.",
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const deleteDocument = () => {
    if (!documentToDelete?.id || isDeletingDocument) return;

    const documentId = documentToDelete.id;

    setIsDeletingDocument(true);
    setErrorMessage("");

    void apiClient
      .delete(endpoints.admin.applicationDocument(applicationId, documentId))
      .then(() => {
        setApplication((current) =>
          current
            ? {
                ...current,
                documents: (current.documents ?? []).filter(
                  (document) => String(document.id) !== String(documentId),
                ),
              }
            : current,
        );
        setDocumentToDelete(null);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Document could not be deleted.",
        );
      })
      .finally(() => {
        setIsDeletingDocument(false);
      });
  };

  return (
    <AdminShell eyebrow="Update application submission data" title={title}>
      <Link
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
        href={`/admin/applications/${applicationId}`}
      >
        <ArrowLeft size={17} />
        Back to application details
      </Link>

      {isLoading && (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading application edit form...
        </section>
      )}

      {!isLoading && errorMessage && !editForm && (
        <section className="rounded-lg border border-rose-200 bg-white p-8 text-center text-sm font-semibold text-rose-600 shadow-sm">
          {errorMessage}
        </section>
      )}

      {!isLoading && editForm && (
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            saveApplication();
          }}
        >
          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <Section icon={User} title="Applicant">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ReadOnlyField
                label="Name"
                value={editForm.fullName}
              />
              <ReadOnlyField
                label="Email"
                value={editForm.participantEmail}
              />
              <ReadOnlyField
                label="Mobile"
                value={editForm.participantMobile}
              />
              <TextInput
                label="Date of Birth"
                name="participantDateOfBirth"
                onChange={updateFormField}
                type="date"
                value={editForm.participantDateOfBirth}
              />
              <TextInput
                label="Gender"
                name="gender"
                onChange={updateFormField}
                value={editForm.gender}
              />
              <ReadOnlyField
                label="Email Verified"
                value={application?.participant?.emailVerified}
              />
            </div>
          </Section>

          <Section icon={MapPin} title="Location Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="State"
                name="stateId"
                onChange={updateFormField}
                value={editForm.stateId}
              >
                <option value="">Select state</option>
                {lookups.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {localizedName(state.name)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="District"
                name="districtId"
                onChange={updateFormField}
                value={editForm.districtId}
              >
                <option value="">Select district</option>
                {districtOptions.map((district) => (
                  <option key={district.id} value={district.id}>
                    {localizedName(district.name)}
                  </option>
                ))}
              </SelectField>
              <TextInput
                label="City"
                name="city"
                onChange={updateFormField}
                value={editForm.city}
              />
              <TextInput
                label="PIN Code"
                name="pinCode"
                onChange={updateFormField}
                value={editForm.pinCode}
              />
            </div>
            <TextArea
              label="Address"
              name="address"
              onChange={updateFormField}
              value={editForm.address}
            />
          </Section>

          <Section icon={ClipboardList} title="Participation Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Participant Category"
                name="participantCategoryId"
                onChange={updateFormField}
                value={editForm.participantCategoryId}
              >
                <option value="">Select category</option>
                {lookups.participantCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {localizedName(category.name)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Institute Type"
                name="instituteTypeId"
                onChange={updateFormField}
                value={editForm.instituteTypeId}
              >
                <option value="">Select institute type</option>
                {instituteTypeOptions.map((type) => (
                  <option key={type.id} value={type.id}>
                    {localizedName(type.name)}
                  </option>
                ))}
              </SelectField>
              <TextInput
                label="Institute"
                name="instituteName"
                onChange={updateFormField}
                value={editForm.instituteName}
              />
              <SelectField
                label="Participation Mode"
                name="participationMode"
                onChange={updateFormField}
                value={editForm.participationMode}
              >
                <option value="Individual">Individual</option>
                <option value="Team">Team</option>
              </SelectField>
            </div>
          </Section>

          <Section icon={GraduationCap} title="Education Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextInput
                label="Highest Educational Qualification"
                name="highestEducationalQualification"
                onChange={updateFormField}
                value={editForm.highestEducationalQualification}
              />
              <TextInput
                label="Last Attended Educational Institute"
                name="lastAttendedEducationalInstitute"
                onChange={updateFormField}
                value={editForm.lastAttendedEducationalInstitute}
              />
              <TextInput
                label="Year of Passing"
                name="yearOfPassing"
                onChange={updateFormField}
                value={editForm.yearOfPassing}
              />
            </div>
          </Section>

          <Section icon={Lightbulb} title="Proposal">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Challenge Category"
                name="challengeCategoryId"
                onChange={updateFormField}
                value={editForm.challengeCategoryId}
              >
                <option value="">Select challenge category</option>
                {lookups.challengeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {localizedName(category.name)}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextArea
              label="Problem Location"
              name="problemLocation"
              onChange={updateFormField}
              value={editForm.problemLocation}
            />
            <TextArea
              label="Proposed Solution"
              name="proposedSolution"
              onChange={updateFormField}
              value={editForm.proposedSolution}
            />
            <TextArea
              label="Technology / Method"
              name="technologyMethod"
              onChange={updateFormField}
              value={editForm.technologyMethod}
            />
            <TextArea
              label="Implementation Route"
              name="implementationRoute"
              onChange={updateFormField}
              value={editForm.implementationRoute}
            />
            <TextArea
              label="Cost / Funding"
              name="costFunding"
              onChange={updateFormField}
              value={editForm.costFunding}
            />
            <TextArea
              label="Beneficiaries"
              name="beneficiaries"
              onChange={updateFormField}
              value={editForm.beneficiaries}
            />
            <TextArea
              label="Project Timeline"
              name="projectTimeline"
              onChange={updateFormField}
              value={editForm.projectTimeline}
            />
            <TextArea
              label="Expected Impact"
              name="expectedImpact"
              onChange={updateFormField}
              value={editForm.expectedImpact}
            />
            <TextArea
              label="Scalability"
              name="scalability"
              onChange={updateFormField}
              value={editForm.scalability}
            />
            <TextArea
              label="Prototype / Pilot"
              name="prototypePilot"
              onChange={updateFormField}
              value={editForm.prototypePilot}
            />
            <TextArea
              label="Mentor / Acknowledge To"
              name="mentorAcknowledgeTo"
              onChange={updateFormField}
              value={editForm.mentorAcknowledgeTo}
            />
            <TextArea
              label="Intellectual Property / Publication"
              name="intellectualPropertyPublication"
              onChange={updateFormField}
              value={editForm.intellectualPropertyPublication}
            />
          </Section>

          <Section icon={Users} title="Team Members">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Applicant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(application?.teamMembers ?? []).map((member) => (
                    <tr key={String(member.id ?? member.email)}>
                      <td className="px-4 py-3">{formatValue(member.fullName)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatValue(member.email)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatValue(member.mobile)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatValue(member.isApplicant)}
                      </td>
                    </tr>
                  ))}
                  {(!application?.teamMembers ||
                    application.teamMembers.length === 0) && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                        No team members available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section icon={FileText} title="Documents">
            <div className="grid gap-3">
              <TextInput
                label="Video URL"
                name="videoUrl"
                onChange={updateFormField}
                value={editForm.videoUrl}
              />
              {(application?.documents ?? []).map((document) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
                  key={String(document.id ?? document.originalFileName)}
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-normal">
                      {formatValue(document.originalFileName)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatValue(document.documentType)} ·{" "}
                      {formatFileSize(document.fileSizeBytes)}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDeletingDocument}
                    onClick={() => setDocumentToDelete(document)}
                    type="button"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              ))}
              {(!application?.documents || application.documents.length === 0) && (
                <p className="text-sm font-semibold text-slate-500">
                  No documents available.
                </p>
              )}
            </div>
          </Section>

          <section className="flex flex-wrap justify-end gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b1f3a]"
              href={`/admin/applications/${applicationId}`}
            >
              Cancel
            </Link>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              <Save size={17} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </section>
        </form>
      )}

      {documentToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-black text-[#0b1f3a]">
                Delete Document
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Delete {formatValue(documentToDelete.originalFileName)}? This will
                remove the document record and file from storage.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-5">
              <button
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b1f3a]"
                disabled={isDeletingDocument}
                onClick={() => setDocumentToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDeletingDocument}
                onClick={deleteDocument}
                type="button"
              >
                <Trash2 size={16} />
                {isDeletingDocument ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
