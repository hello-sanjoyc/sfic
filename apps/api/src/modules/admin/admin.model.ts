export type AdminLanguage = "bn" | "en" | "hi";

export type AdminUser = {
  email: string;
  id: number;
  mobile: string;
  name: string;
  role: string;
};

export type RequestAdminLoginCodeInput = {
  email: string;
  language: AdminLanguage;
};

export type RequestAdminLoginCodeResult = {
  emailDelivery: {
    delivered: boolean;
    reason?: string;
  };
  loginRequest: {
    email: string;
    resendAvailableAt: string;
  };
};

export type VerifyAdminLoginInput = {
  code: string;
  email: string;
  language: AdminLanguage;
};

export type VerifyAdminLoginResult = {
  admin: AdminUser;
  session: {
    token: string;
  };
};

export type AdminManagedUser = {
  createdAt: string;
  email: string;
  fullName: string;
  id: number;
  isActive: boolean;
  mobile: string;
  role: string;
  updatedAt: string;
};

export type AdminManagedUsersResult = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  users: AdminManagedUser[];
};

export type UpsertAdminManagedUserInput = {
  email?: unknown;
  fullName?: unknown;
  isActive?: unknown;
  mobile?: unknown;
  role?: unknown;
};

export type AdminSettingsNamedItem = {
  createdAt: string;
  id: number;
  isActive: boolean;
  name: {
    bn: string;
    en: string;
    hi: string;
  };
  sortOrder?: number;
  updatedAt: string;
};

export type AdminSettingsState = AdminSettingsNamedItem;

export type AdminSettingsDistrict = AdminSettingsNamedItem & {
  stateId: number;
};

export type AdminSettingsInstituteType = AdminSettingsNamedItem & {
  sortOrder: number;
};

export type AdminSettingsParticipantCategory = AdminSettingsNamedItem & {
  code: string;
  sortOrder: number;
};

export type AdminSettingsChallengeCategory = AdminSettingsNamedItem & {
  sortOrder: number;
};

export type AdminSettingsUserRole = {
  isActive: boolean;
  role: string;
};

export type AdminSettingsConfigurationType =
  | "boolean"
  | "integer"
  | "string"
  | "timestamp";

export type AdminSettingsConfiguration = {
  createdAt: string;
  description: string | null;
  isActive: boolean;
  key: string;
  type: AdminSettingsConfigurationType;
  updatedAt: string;
  value: string;
};

export type UpsertAdminSettingsItemInput = Record<string, unknown>;

export type AdminDashboardCountCard = {
  count: number;
  detail: string;
  key:
    | "bihar"
    | "jharkhand"
    | "junior"
    | "open"
    | "single"
    | "team"
    | "totalApplications"
    | "westBengal";
  label: string;
};

export type AdminDashboardCountsResult = {
  cards: AdminDashboardCountCard[];
};

export type AdminDashboardOrganisationTypeCountCard = {
  count: number;
  detail: "Organisation Type";
  key:
    | "juniorDiploma"
    | "juniorIti"
    | "juniorSchool"
    | "juniorUndergraduate"
    | "openCommunityGroup"
    | "openGraduate"
    | "openProfessional"
    | "openStartup";
  label: string;
};

export type AdminDashboardOrganisationTypeCountsResult = {
  cards: AdminDashboardOrganisationTypeCountCard[];
};

export type AdminDashboardChallengeCategoryCountCard = {
  biharCount: number;
  count: number;
  detail: "Challenge Category";
  jharkhandCount: number;
  key: string;
  label: string;
  stateCounts: {
    bihar: number;
    jharkhand: number;
    westBengal: number;
  };
  westBengalCount: number;
};

export type AdminDashboardChallengeCategoryCountsResult = {
  cards: AdminDashboardChallengeCategoryCountCard[];
};

export type AdminPageViewAnalyticsResult = {
  averageTimeSeconds: number;
  totalPageViews: number;
  trend: Array<{
    date: string;
    pageViews: number;
    uniqueVisits: number;
  }>;
  uniqueVisits: number;
};

export type AdminApplicationDetails = Record<string, unknown>;

export type AdminApplicationsResult = {
  applications: AdminApplicationDetails[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type UpdateAdminApplicationInput = {
  applicationId: number;
  values: Record<string, unknown>;
};

export type UpdateAdminApplicationResult = {
  application: AdminApplicationDetails;
};

export type DeleteAdminApplicationResult = {
  application: {
    applicationNumber: string;
    id: number;
  };
  documents: AdminApplicationDocumentDownload[];
};

export type AdminApplicationDocumentDownload = {
  fileSizeBytes: number;
  mimeType: string;
  originalFileName: string;
  storageKey: string;
};

export type DeleteAdminApplicationDocumentResult = {
  document: AdminApplicationDocumentDownload & {
    id: number;
  };
};
