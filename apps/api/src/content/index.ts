import { bnContent } from "./bn.js";
import { enContent } from "./en.js";
import { hnContent } from "./hn.js";

export type ApiContent = {
    api: {
        badRequest: string;
        applicationNumberLimitReached: string;
        challengeCategoriesFetched: string;
        challengesFetched: string;
        databaseNotConfigured: string;
        districtsFetched: string;
        emailMustBeVerified: string;
        emailVerified: string;
        healthOk: string;
        healthUnavailable: string;
        invalidDistrictForState: string;
        invalidFileUpload: string;
        invalidInstituteTypeForParticipantCategory: string;
        invalidParticipantCategory: string;
        invalidState: string;
        instituteTypesFetched: string;
        internalServerError: string;
        invalidToken: string;
        lookupsFetched: string;
        notFound: string;
        noActiveChallenge: string;
        participantNotFound: string;
        participantCategoriesFetched: string;
        participantCategoryInstituteTypesFetched: string;
        proposalSubmitted: string;
        registrationCreated: string;
        registrationFetched: string;
        registrationIdNumeric: string;
        registrationNotFound: string;
        statesFetched: string;
        stateIdNumeric: string;
        unableCreateRegistration: string;
        unableFetchChallengeCategories: string;
        unableFetchCommonLookups: string;
        unableFetchDistricts: string;
        unableFetchInstituteTypes: string;
        unableFetchParticipantCategories: string;
        unableFetchParticipantCategoryInstituteTypes: string;
        unableFetchRegistration: string;
        unableFetchStates: string;
        unableSubmitProposal: string;
        unableVerifyEmail: string;
        useStateIdForDistricts: string;
        validationError: string;
        verificationTokenRequired: string;
    };
    apiValidation: {
        districtIdRequired: string;
        fieldRequired: (field: string) => string;
        fullNameRequired: string;
        participantCategoryRequired: string;
        pinCodeInvalid: string;
        supportingDocumentMax: (count: number) => string;
        supportingDocumentInvalid: string;
        supportingDocumentRequired: string;
        supportingDocumentSize: (sizeMb: number) => string;
        supportingDocumentType: string;
        stateIdRequired: string;
        teamMemberEmailInvalid: (index: number) => string;
        teamMemberFullNameRequired: (index: number) => string;
        teamMemberMobileInvalid: (index: number) => string;
        teamMemberRequired: string;
        validEmailRequired: string;
        validMobileRequired: string;
    };
    emails: {
        applicationSubmitted: {
            applicationNumberLabel: string;
            detailsTitle: string;
            footer: string;
            greeting: (participantName: string) => string;
            intro: string;
            preheader: (applicationNumber: string) => string;
            subject: (applicationNumber: string) => string;
            title: string;
        };
        teamMemberAdded: {
            applicationNumberLabel: string;
            footer: string;
            greeting: (participantName: string) => string;
            intro: (teamLeadName: string, applicationNumber: string) => string;
            portalUrlLabel: string;
            preheader: (applicationNumber: string) => string;
            subject: (applicationNumber: string) => string;
            title: string;
        };
        verification: {
            ctaLabel: string;
            footer: string;
            greeting: (participantName: string) => string;
            intro: string;
            linkHelp: string;
            preheader: string;
            subject: string;
            title: string;
            verifyInstruction: string;
            verifyTextInstruction: string;
        };
    };
    registrations: {
        duplicateRegistration: string;
    };
};

const contentByLanguage = {
    bn: bnContent,
    en: enContent,
    hi: hnContent,
    hn: hnContent,
} satisfies Record<string, ApiContent>;

export type ApiLanguage = keyof typeof contentByLanguage;

export function getApiContent(language = "en"): ApiContent {
    return (
        contentByLanguage[language as ApiLanguage] ??
        contentByLanguage.en
    );
}
