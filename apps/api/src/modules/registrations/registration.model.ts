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
