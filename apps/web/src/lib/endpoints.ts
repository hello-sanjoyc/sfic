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
  admin: {
    application: (id: string | number) => `${api}/admin/applications/${id}`,
    applicationDownload: (id: string | number) =>
      `${api}/admin/applications/${id}/download`,
    applicationDocumentDownload: (
      applicationId: string | number,
      documentId: string | number,
    ) => `${api}/admin/applications/${applicationId}/documents/${documentId}/download`,
    applicationDocument: (
      applicationId: string | number,
      documentId: string | number,
    ) => `${api}/admin/applications/${applicationId}/documents/${documentId}`,
    applications: `${api}/admin/applications`,
    dashboardChallengeCategoryCounts: `${api}/admin/dashboard-challenge-category-counts`,
    dashboardCounts: `${api}/admin/dashboard-counts`,
    dashboardOrganisationTypeCounts: `${api}/admin/dashboard-organisation-type-counts`,
    login: `${api}/admin/login`,
    resendLoginCode: `${api}/admin/resend-login-code`,
    settings: {
      challengeCategories: `${api}/admin/settings/challenge-categories`,
      challengeCategory: (id: string | number) =>
        `${api}/admin/settings/challenge-categories/${id}`,
      districts: `${api}/admin/settings/districts`,
      district: (id: string | number) => `${api}/admin/settings/districts/${id}`,
      instituteTypes: `${api}/admin/settings/institute-types`,
      instituteType: (id: string | number) =>
        `${api}/admin/settings/institute-types/${id}`,
      participantCategories: `${api}/admin/settings/participant-categories`,
      participantCategory: (id: string | number) =>
        `${api}/admin/settings/participant-categories/${id}`,
      states: `${api}/admin/settings/states`,
      state: (id: string | number) => `${api}/admin/settings/states/${id}`,
      userRoles: `${api}/admin/settings/user-roles`,
      userRole: (role: string) =>
        `${api}/admin/settings/user-roles/${encodeURIComponent(role)}`,
    },
    user: (id: string | number) => `${api}/admin/users/${id}`,
    users: `${api}/admin/users`,
    verifyLogin: `${api}/admin/verify-login`,
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
