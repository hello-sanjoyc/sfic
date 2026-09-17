export const enContent = {
    api: {
        badRequest: "Invalid request.",
        applicationNumberLimitReached:
            "Application number limit reached for {stateCode}.",
        challengeCategoriesFetched:
            "Challenge categories fetched successfully.",
        challengesFetched: "Challenges fetched successfully.",
        databaseNotConfigured: "Database is not configured.",
        districtsFetched: "Districts fetched successfully.",
        emailMustBeVerified:
            "Email must be verified before submitting the proposal.",
        emailVerified: "Email verified successfully.",
        healthOk: "API is healthy.",
        healthUnavailable: "API is unavailable.",
        invalidDistrictForState: "Invalid district for selected state.",
        invalidFileUpload: "Uploaded supporting documents are invalid.",
        invalidInstituteTypeForParticipantCategory:
            "Invalid organisation type for participant category.",
        invalidParticipantCategory: "Invalid participant category.",
        invalidState: "Invalid state.",
        instituteTypesFetched: "Organisation types fetched successfully.",
        internalServerError: "Something went wrong. Please try again.",
        invalidToken: "Verification code is either invalid or has expired.",
        lookupsFetched: "Common lookups fetched successfully.",
        notFound: "Requested resource was not found.",
        noActiveChallenge: "No active challenge is configured.",
        participantNotFound: "Participant was not found.",
        participantCategoriesFetched:
            "Participant categories fetched successfully.",
        participantCategoryInstituteTypesFetched:
            "Participant category organisation type mappings fetched successfully.",
        participantLoginCodeSent:
            "Participant login verification email has been sent.",
        participantLoginUnable: "Unable to complete participant login.",
        participantLoginVerified: "Participant login verified successfully.",
        proposalSubmitted: "Proposal submitted successfully.",
        registrationCreated:
            "Registration saved successfully. Verification email has been sent.",
        registrationFetched: "Registration fetched successfully.",
        registrationIdNumeric: "Registration id must be numeric.",
        registrationNotFound: "Registration was not found.",
        statesFetched: "States fetched successfully.",
        stateIdNumeric: "stateId must be a numeric value.",
        unableCreateRegistration: "Unable to create registration.",
        unableFetchChallengeCategories: "Unable to fetch challenge categories.",
        unableFetchCommonLookups: "Unable to fetch common lookups.",
        unableFetchDistricts: "Unable to fetch districts.",
        unableFetchInstituteTypes: "Unable to fetch organisation types.",
        unableFetchParticipantCategories:
            "Unable to fetch participant categories.",
        unableFetchParticipantCategoryInstituteTypes:
            "Unable to fetch participant category organisation type mappings.",
        unableFetchRegistration: "Unable to fetch registration.",
        unableFetchStates: "Unable to fetch states.",
        unableSubmitProposal: "Unable to submit proposal.",
        unableVerifyEmail: "Unable to verify email address.",
        useStateIdForDistricts: "Use stateId to filter districts.",
        validationError: "Please correct the highlighted errors.",
        verificationCodeRequired: "Verification code is required.",
        verificationEmailSent: "Verification email has been sent.",
        verificationLimitReached:
            "Email verification limit reached. Please wait one hour before applying again.",
        verificationResendTooSoon:
            "Please wait {minutes} minutes before requesting another verification email.",
        verificationTokenRequired: "Verification token is required.",
    },
    apiValidation: {
        districtIdRequired: "districtId is required.",
        fieldRequired: (field: string) => `${field} is required.`,
        fullNameRequired: "fullName is required.",
        participantCategoryRequired: "participantCategory is required.",
        pinCodeInvalid: "PIN Code must be exactly 6 digits.",
        supportingDocumentMax: (count: number) =>
            `Upload a maximum of ${count} PDF files.`,
        supportingDocumentInvalid: "Uploaded supporting documents are invalid.",
        supportingDocumentRequired: "Upload at least one supporting document.",
        supportingDocumentSize: (sizeMb: number) =>
            `Each supporting document must be ${sizeMb} MB or smaller.`,
        supportingDocumentType: "Upload PDF files only.",
        stateIdRequired: "stateId is required.",
        teamMemberEmailInvalid: (index: number) =>
            `teamMembers[${index}].email is invalid.`,
        teamMemberFullNameRequired: (index: number) =>
            `teamMembers[${index}].fullName is required.`,
        teamMemberMobileInvalid: (index: number) =>
            `teamMembers[${index}].mobile is invalid.`,
        teamMemberRequired:
            "At least one team member is required for team participation.",
        validEmailRequired: "A valid email is required.",
        validMobileRequired: "A valid 10-digit mobile number is required.",
    },
    emails: {
        applicationSubmitted: {
            applicationNumberLabel: "Application Number",
            detailsTitle: "Submitted Details",
            footer:
                "This email was sent by Seva First Innovation Challenge. If you did not request this, you can safely ignore it.",
            greeting: (participantName: string) => `Dear ${participantName},`,
            intro:
                "Your Seva First Innovation Challenge application has been submitted successfully.",
            preheader: (applicationNumber: string) =>
                `Your application number is ${applicationNumber}.`,
            subject: (applicationNumber: string) =>
                `Application submitted: ${applicationNumber}`,
            title: "Application submitted",
        },
        teamMemberAdded: {
            applicationNumberLabel: "Application Number",
            footer:
                "This email was sent by Seva First Innovation Challenge. If this information does not look correct, please contact the Team Lead.",
            greeting: (participantName: string) => `Dear ${participantName},`,
            intro: (teamLeadName: string, applicationNumber: string) =>
                `Team Lead ${teamLeadName} has added you as a team member for Application Number ${applicationNumber}.`,
            portalUrlLabel: "Portal URL",
            preheader: (applicationNumber: string) =>
                `You have been added as a team member for ${applicationNumber}.`,
            subject: (applicationNumber: string) =>
                `Added as team member: ${applicationNumber}`,
            title: "Added as team member",
        },
        participantLoginVerification: {
            footer:
                "This email was sent by Seva First Innovation Challenge. If you did not request this login code, you can safely ignore it.",
            greeting: (participantName: string) => `Dear ${participantName},`,
            intro:
                "A login request was made for your Seva First Innovation Challenge participant dashboard.",
            preheader:
                "Use this code to login to your participant dashboard.",
            subject:
                "Your Seva First Innovation Challenge participant login code",
            title: "Participant login verification",
            verificationCodeLabel: "Verification Code",
            verifyInstruction:
                "Please enter this 6-digit code within {minutes} minutes to continue to your dashboard.",
            verifyTextInstruction:
                "Enter this 6-digit verification code within {minutes} minutes:",
        },
        verification: {
            footer:
                "This email was sent by Seva First Innovation Challenge. If you did not request this, you can safely ignore it.",
            greeting: (participantName: string) => `Dear ${participantName},`,
            intro:
                "Thank you for starting your registration for the Seva First Innovation Challenge.",
            preheader:
                "Use this code to verify your email address and continue your Seva First Innovation Challenge registration.",
            subject: "Verify your email address",
            title: "Verify your email address",
            verificationCodeLabel: "Verification Code",
            verifyInstruction:
                "Please enter this 6-digit verification code within {minutes} minutes to continue your registration.",
            verifyTextInstruction:
                "Enter this 6-digit verification code within {minutes} minutes:",
        },
    },
    registrations: {
        duplicateRegistration:
            "This email ID or mobile number has already been used for an application. Please continue with the verification email already sent, or contact support if you need help.",
    },
} as const;
