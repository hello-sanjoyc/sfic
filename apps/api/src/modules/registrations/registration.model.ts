export type RegistrationLanguage = "bn" | "en" | "hi";

export type CreateRegistrationInput = {
  email: string;
  fullName: string;
  language: RegistrationLanguage;
  mobile: string;
  participantCategory: string;
};

export type RegistrationApplication = {
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
  verificationUrl?: string;
};

export type VerifyRegistrationResult = {
  application: RegistrationApplication;
};

export type RegistrationDetailsResult = {
  application: RegistrationApplication;
  participant: {
    email: string;
    fullName: string;
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
  city: string;
  costFunding: string;
  districtId: number;
  expectedImpact: string;
  implementationRoute: string;
  instituteName: string;
  instituteType: string;
  language: RegistrationLanguage;
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
};

export type SubmitProposalResult = {
  application: RegistrationApplication;
  emailDelivery: {
    delivered: boolean;
    reason?: string;
  };
};
