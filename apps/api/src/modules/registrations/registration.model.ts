export type RegistrationLanguage = "bn" | "en" | "hi";

export type CreateRegistrationInput = {
  dateOfBirth: string;
  email: string;
  fullName: string;
  gender: "Male" | "Female" | "Others";
  language: RegistrationLanguage;
  mobile: string;
  participantCategory: string;
  password: string;
};

export type RegistrationApplication = {
  applicationHash: string;
  applicationNumber: string;
  emailVerified: boolean;
  id: number;
  participantId: number;
  status: string;
};

export type CreateRegistrationResult = {
  application: RegistrationApplication;
  emailDelivery: {
    delivered: boolean;
    reason?: string;
  };
  participant?: {
    email: string;
    memberId: number;
    memberName: string;
    phone: string;
    role: "applicant";
    status: string;
  };
  redirectTo?: string;
  session?: {
    token: string;
  };
};

export type VerifyRegistrationResult = {
  application: RegistrationApplication;
};

export type ResendVerificationResult = CreateRegistrationResult;

export type SubmitProfileInput = {
  dateOfBirth: string;
  gender: "Male" | "Female" | "Others";
  language: RegistrationLanguage;
};

export type SubmitProfileResult = {
  application: RegistrationApplication;
};

export type RegistrationDetailsResult = {
  application: RegistrationApplication;
  participant: {
    dateOfBirth: string;
    email: string;
    fullName: string;
    gender: string;
    id: number;
    mobile: string;
    participantCategoryCode: string;
  };
};

export type TeamMemberInput = {
  email: string;
  fullName: string;
  mobile: string;
};

export type SupportingDocumentInput = {
  checksumSha256?: string;
  mimeType: string;
  originalFileName: string;
  size: number;
  storageKey: string;
};

export type SubmitProposalInput = {
  address: string;
  beneficiaries: string;
  challengeCategoryId: number;
  city: string;
  costFunding: string;
  districtId: number;
  expectedImpact: string;
  highestEducationalQualification: string;
  implementationRoute: string;
  intellectualPropertyPublication?: string;
  instituteName: string;
  instituteType: string;
  language: RegistrationLanguage;
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
  supportingDocuments?: SupportingDocumentInput[];
  teamMembers: TeamMemberInput[];
  technologyMethod: string;
  theme: string;
  videoUrl?: string;
  yearOfPassing: string;
};

export type SubmitProposalResult = {
  application: RegistrationApplication;
  emailDelivery: {
    delivered: boolean;
    reason?: string;
  };
};
