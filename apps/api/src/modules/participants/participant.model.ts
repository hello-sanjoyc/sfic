export type ParticipantLanguage = "bn" | "en" | "hi";

export type ParticipantLoginApplication = {
  applicationId: number;
  applicationNumber: string;
  memberId: number;
  memberName: string;
  role: "Team Lead" | "Team Member";
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
