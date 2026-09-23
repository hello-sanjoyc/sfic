"use client";

import {
  ArrowRight,
  Building2,
  CalendarDays,
  FilePlus2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { ParticipantShell } from "@/components/participant/common/participant-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type LocalizedText = {
  bn?: string | null;
  en?: string | null;
  hi?: string | null;
};

type ProfileValue = {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
};

type ParticipantProfile = {
  address?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  district?: { name?: LocalizedText | null } | null;
  email?: string | null;
  fullName?: string | null;
  gender?: string | null;
  highestEducationalQualification?: string | null;
  instituteName?: string | null;
  instituteType?: { name?: LocalizedText | null } | null;
  lastAttendedEducationalInstitute?: string | null;
  mobile?: string | null;
  otherInstituteType?: string | null;
  pinCode?: string | null;
  role?: "applicant" | "team_member";
  state?: { name?: LocalizedText | null } | null;
  yearOfPassing?: string | null;
};

type ParticipantProfileResponse = {
  profile: ParticipantProfile;
};

type AppSetting = {
  key: string;
  value: string;
};

type AppSettingsMap = Record<string, string>;

type ParticipantApplicationsResponse = {
  applications: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const settingKeys = {
  multipleApplications: "PARTICIPANT_APPLICATION_MULTIPLE",
  registrationEnabled: "PARTICIPANT_REGISTRATION_ENABLED",
  registrationEndDate: "PARTICIPANT_REGISTRATION_END_DATE",
  registrationStartDate: "PARTICIPANT_REGISTRATION_START_DATE",
} as const;

function settingsMap(settings: AppSetting[]) {
  return Object.fromEntries(
    settings.map((setting) => [setting.key, setting.value]),
  );
}

function booleanSetting(settings: AppSettingsMap, key: string) {
  return settings[key]?.trim().toLowerCase() === "true";
}

function dateSetting(settings: AppSettingsMap, key: string) {
  const value = settings[key];
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newApplicationAvailability(
  settings: AppSettingsMap,
  totalApplications: number,
) {
  if (!booleanSetting(settings, settingKeys.registrationEnabled)) {
    return {
      canCreate: false,
      message: "Participant registration is currently closed.",
    };
  }

  const now = new Date();
  const startDate = dateSetting(settings, settingKeys.registrationStartDate);
  const endDate = dateSetting(settings, settingKeys.registrationEndDate);

  if (startDate && now < startDate) {
    return {
      canCreate: false,
      message: "New applications are not open yet.",
    };
  }

  if (endDate && now > endDate) {
    return {
      canCreate: false,
      message: "The new application window has closed.",
    };
  }

  if (
    !booleanSetting(settings, settingKeys.multipleApplications) &&
    totalApplications > 0
  ) {
    return {
      canCreate: false,
      message: "Multiple applications are not enabled for participants.",
    };
  }

  return {
    canCreate: true,
    message: "Submit a new proposal for any challenge",
  };
}

function localizedName(value?: LocalizedText | null) {
  return value?.en ?? value?.bn ?? value?.hi ?? "Not available";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
  }).format(date);
}

function roleLabel(role?: ParticipantProfile["role"]) {
  return role === "team_member" ? "Team Member" : "Applicant";
}

function DetailField({ icon: Icon, label, value }: Readonly<ProfileValue>) {
  return (
    <div className="min-w-0 border-b border-slate-100 pb-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="shrink-0 text-slate-400" size={18} />}
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-3 min-w-0 whitespace-pre-line break-words text-base font-bold leading-7 text-[#0b1f3a] md:text-lg">
        {value}
      </p>
    </div>
  );
}

function ProfileSection({
  children,
  icon: Icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
}>) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-7">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon size={21} />
        </span>
        <h2 className="text-xl font-black tracking-normal text-[#0b1f3a]">
          {title}
        </h2>
      </div>
      <div className="mt-6 grid gap-x-12 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export default function Page() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [settings, setSettings] = useState<AppSettingsMap>({});
  const [settingsError, setSettingsError] = useState("");
  const [totalApplications, setTotalApplications] = useState(0);
  const availability = newApplicationAvailability(settings, totalApplications);
  const roleBlockMessage =
    profile?.role === "team_member"
      ? "Only the applicant can create a new application."
      : "";
  const canCreateApplication =
    profile?.role === "applicant" &&
    availability.canCreate &&
    !isSettingsLoading &&
    !settingsError;
  const newApplicationMessage = isSettingsLoading
    ? "Checking application settings..."
    : settingsError || roleBlockMessage || availability.message;

  useEffect(() => {
    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";

    if (!token) {
      setErrorMessage("A valid participant session is required.");
      setIsLoading(false);
      setIsSettingsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<ParticipantProfileResponse>(endpoints.participants.profile, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((result) => {
        if (!isMounted) return;
        setProfile(result.profile);
      })
      .catch((error) => {
        if (!isMounted) return;
        setProfile(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Participant profile could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    void Promise.all([
      apiClient.get<AppSetting[]>(endpoints.common.appSettings),
      apiClient.get<ParticipantApplicationsResponse>(
        endpoints.participants.applications,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          query: {
            page: 1,
            pageSize: 1,
          },
        },
      ),
    ])
      .then(([settingsResult, applicationsResult]) => {
        if (!isMounted) return;
        setSettings(settingsMap(settingsResult));
        setTotalApplications(applicationsResult.pagination.total);
        setSettingsError("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setSettings({});
        setTotalApplications(0);
        setSettingsError(
          error instanceof Error
            ? error.message
            : "Application settings could not be fetched.",
        );
      })
      .finally(() => {
        if (isMounted) setIsSettingsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ParticipantShell
      eyebrow="Seva First Innovation Challenge - Eastern Region"
      naturalScroll
      title="My Profile"
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Image
            alt="Participant profile"
            className="h-full min-h-44 w-full object-cover"
            height={300}
            priority
            src="/images/partcipant-profile-banner.webp"
            width={1200}
          />
        </div>

        <div className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {canCreateApplication ? (
            <Link
              className="flex min-h-16 w-full items-center gap-4 rounded-lg bg-blue-600 px-6 py-4 text-white shadow-sm transition hover:bg-blue-700"
              href="/participants/applications/new"
            >
              <FilePlus2 className="shrink-0" size={28} />
              <span className="min-w-0">
                <span className="block text-lg font-black">
                  Create New Application
                </span>
                <span className="mt-1 block text-sm font-semibold text-blue-100">
                  {newApplicationMessage}
                </span>
              </span>
              <ArrowRight className="ml-auto shrink-0" size={24} />
            </Link>
          ) : (
            <div className="flex min-h-16 w-full items-center gap-4 rounded-lg bg-slate-100 px-6 py-4 text-slate-500">
              <FilePlus2 className="shrink-0" size={28} />
              <span className="min-w-0">
                <span className="block text-lg font-black">
                  Create New Application
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {newApplicationMessage}
                </span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#fbfdff] px-4 py-3">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Role
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-sm font-black text-emerald-700">
              <ShieldCheck size={16} />
              {isLoading ? "Checking..." : roleLabel(profile?.role)}
            </span>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg bg-white p-5 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
          Loading profile details...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700 shadow-sm">
          {errorMessage}
        </div>
      )}

      {!isLoading && profile && (
        <div className="grid gap-5">
          <ProfileSection icon={User} title="Personal Information">
            <DetailField
              label="Full Name"
              value={formatValue(profile.fullName)}
            />
            <DetailField
              icon={Mail}
              label="Email"
              value={formatValue(profile.email)}
            />
            <DetailField
              icon={Phone}
              label="Phone"
              value={formatValue(profile.mobile)}
            />
            <DetailField
              icon={CalendarDays}
              label="Date of Birth"
              value={formatDateOnly(profile.dateOfBirth)}
            />
            <DetailField label="Gender" value={formatValue(profile.gender)} />
          </ProfileSection>

          <ProfileSection icon={MapPin} title="Address">
            <DetailField label="State" value={localizedName(profile.state?.name)} />
            <DetailField
              label="District"
              value={localizedName(profile.district?.name)}
            />
            <DetailField label="City" value={formatValue(profile.city)} />
            <DetailField
              icon={MapPin}
              label="Address"
              value={formatValue(profile.address)}
            />
            <DetailField label="Pin Code" value={formatValue(profile.pinCode)} />
          </ProfileSection>

          <ProfileSection icon={GraduationCap} title="Education">
            <DetailField
              label="Highest Qualification"
              value={formatValue(profile.highestEducationalQualification)}
            />
            <DetailField
              label="Institution"
              value={formatValue(profile.lastAttendedEducationalInstitute)}
            />
            <DetailField
              label="Year of Passing"
              value={formatValue(profile.yearOfPassing)}
            />
          </ProfileSection>

          <ProfileSection icon={Building2} title="Organisation">
            <DetailField
              label="Organisation Name"
              value={formatValue(profile.instituteName)}
            />
            <DetailField
              label="Organisation Type"
              value={
                localizedName(profile.instituteType?.name) !== "Not available"
                  ? localizedName(profile.instituteType?.name)
                  : formatValue(profile.otherInstituteType)
              }
            />
          </ProfileSection>
        </div>
      )}
    </ParticipantShell>
  );
}
