const api = "/api/v1";

export const endpoints = {
  health: "/health",
  challenges: {
    list: `${api}/challenges`,
    byId: (id: string) => `${api}/challenges/${id}`,
  },
  common: {
    challengeCategories: `${api}/common/challenge-categories`,
    districts: `${api}/common/districts`,
    instituteTypes: `${api}/common/institute-types`,
    lookups: `${api}/common/lookups`,
    participantCategories: `${api}/common/participant-categories`,
    participantCategoryInstituteTypes: `${api}/common/participant-category-institute-types`,
    states: `${api}/common/states`,
  },
  participants: {
    login: `${api}/participants/login`,
    resendLoginCode: `${api}/participants/resend-login-code`,
    verifyLogin: `${api}/participants/verify-login`,
  },
  registrations: {
    create: `${api}/registrations`,
    byId: (id: string) => `${api}/registrations/${id}`,
    resendVerification: (id: string) => `${api}/registrations/${id}/resend-verification`,
    verifyEmail: `${api}/registrations/verify-email`,
    submitProfile: (id: string) => `${api}/registrations/${id}/profile`,
    submitProposal: (id: string) => `${api}/registrations/${id}/proposal`,
  },
} as const;
