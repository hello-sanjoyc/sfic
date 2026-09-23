export type ParticipantLanguage = "bn" | "en" | "hi";

export type ParticipantLoginApplication = {
  applicationId: number;
  applicationNumber: string;
  memberId: number;
  memberName: string;
  phone: string;
  role: "applicant" | "team_member";
  status: string;
};

export type RequestParticipantLoginCodeInput = {
  email: string;
  language: ParticipantLanguage;
};

export type RequestParticipantLoginCodeResult = {
  emailDelivery: {
    delivered: boolean;
    reason?: string;
  };
  loginRequest: {
    email: string;
    resendAvailableAt: string;
  };
};

export type VerifyParticipantLoginInput = {
  code: string;
  email: string;
  language: ParticipantLanguage;
};

export type VerifyParticipantLoginResult = {
  participant: ParticipantLoginApplication & {
    email: string;
  };
  session: {
    token: string;
  };
};

export type ParticipantApplicationSummary = {
  applicationHash: string;
  applicationNumber: string;
  challengeCategory: {
    id: number | null;
    name: {
      bn: string | null;
      en: string | null;
      hi: string | null;
    };
  } | null;
  createdAt: string;
  participationMode: string;
  status: string;
  submittedAt: string | null;
  title: string;
  updatedAt: string;
};

export type ParticipantApplicationDetails = ParticipantApplicationSummary & {
  challenge: {
    code: string | null;
    title: {
      bn: string | null;
      en: string | null;
      hi: string | null;
    };
  } | null;
  district: {
    name: {
      bn: string | null;
      en: string | null;
      hi: string | null;
    };
  } | null;
  documents: Array<{
    id: number;
    documentType: string | null;
    fileSizeBytes: number | null;
    originalFileName: string | null;
    publicUrl: string | null;
    storageKey: string | null;
  }>;
  formLanguage: string | null;
  instituteType: {
    name: {
      bn: string | null;
      en: string | null;
      hi: string | null;
    };
  } | null;
  participant: {
    dateOfBirth: string | null;
    email: string | null;
    emailVerified: boolean | null;
    fullName: string | null;
    gender: string | null;
    mobile: string | null;
  };
  participantCategory: {
    code: string | null;
    name: {
      bn: string | null;
      en: string | null;
      hi: string | null;
    };
  } | null;
  profile: Record<string, string | number | null>;
  proposal: {
    beneficiaries: string | null;
    costFunding: string | null;
    expectedImpact: string | null;
    implementationRoute: string | null;
    intellectualPropertyPublication: string | null;
    mentorAcknowledgeTo: string | null;
    problemLocation: string | null;
    projectTimeline: string | null;
    prototypePilot: string | null;
    proposedSolution: string | null;
    scalability: string | null;
    technologyMethod: string | null;
    videoUrl: string | null;
  };
  state: {
    name: {
      bn: string | null;
      en: string | null;
      hi: string | null;
    };
  } | null;
  teamMembers: Array<{
    email: string | null;
    fullName: string | null;
    isApplicant: boolean | null;
    mobile: string | null;
  }>;
};

export type ParticipantApplicationsResult = {
  applications: ParticipantApplicationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ParticipantApplicationDetailsResult = {
  application: ParticipantApplicationDetails;
};

export type ParticipantApplicationDocumentDownload = {
  fileSizeBytes: number;
  mimeType: string;
  originalFileName: string;
  storageKey: string;
};

export type ParticipantProfileResult = {
  profile: {
    address: string | null;
    city: string | null;
    dateOfBirth: string | null;
    district: {
      name: {
        bn: string | null;
        en: string | null;
        hi: string | null;
      };
    } | null;
    email: string | null;
    fullName: string | null;
    gender: string | null;
    highestEducationalQualification: string | null;
    instituteName: string | null;
    instituteType: {
      name: {
        bn: string | null;
        en: string | null;
        hi: string | null;
      };
    } | null;
    lastAttendedEducationalInstitute: string | null;
    mobile: string | null;
    otherInstituteType: string | null;
    pinCode: string | null;
    role: "applicant" | "team_member";
    state: {
      name: {
        bn: string | null;
        en: string | null;
        hi: string | null;
      };
    } | null;
    yearOfPassing: string | null;
  };
};

export type GetParticipantApplicationsInput = {
  email: string;
  page: number;
  pageSize: number;
  sortBy: "applicationNumber" | "challengeCategory" | "createdAt" | "participationMode" | "status";
  sortDirection: "asc" | "desc";
  status?: string;
};

export type GetParticipantApplicationInput = {
  applicationHash: string;
  email: string;
};

export type ParticipantTeamMemberInput = {
  email: string;
  fullName: string;
  mobile: string;
};

export type ParticipantSupportingDocumentInput = {
  checksumSha256?: string;
  mimeType: string;
  originalFileName: string;
  size: number;
  storageKey: string;
};

export type SubmitParticipantApplicationInput = {
  address: string;
  beneficiaries: string;
  challengeCategoryId: number;
  city: string;
  costFunding: string;
  districtId: number;
  email: string;
  expectedImpact: string;
  highestEducationalQualification: string;
  implementationRoute: string;
  intellectualPropertyPublication?: string;
  instituteName: string;
  instituteType: string;
  language: ParticipantLanguage;
  lastAttendedEducationalInstitute: string;
  mentorAcknowledgeTo?: string;
  otherInstituteType?: string;
  participationMode: "Individual" | "Team";
  pinCode: string;
  problemLocation: string;
  projectTimeline: string;
  proposedSolution: string;
  prototypePilot: string;
  scalability: string;
  stateId: number;
  supportingDocuments?: ParticipantSupportingDocumentInput[];
  teamMembers: ParticipantTeamMemberInput[];
  technologyMethod: string;
  theme?: string;
  videoUrl?: string;
  yearOfPassing: string;
};

export type SubmitParticipantApplicationResult = {
  application: {
    applicationHash: string;
    applicationNumber: string;
    id: number;
    participantId: number;
    status: string;
  };
  emailDelivery: {
    delivered: boolean;
    reason?: string;
  };
};
