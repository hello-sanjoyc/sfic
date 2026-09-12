export const bnContent = {
    api: {
        badRequest: "অনুরোধটি সঠিক নয়।",
        applicationNumberLimitReached:
            "{stateCode} রাজ্যের জন্য আবেদন নম্বরের নির্ধারিত সীমা পূর্ণ হয়েছে।",
        challengeCategoriesFetched:
            "চ্যালেঞ্জের বিভাগগুলি সফলভাবে পাওয়া গেছে।",
        challengesFetched: "চ্যালেঞ্জের তথ্য সফলভাবে পাওয়া গেছে।",
        databaseNotConfigured: "ডেটাবেস কনফিগার করা হয়নি।",
        districtsFetched: "জেলার তথ্য সফলভাবে পাওয়া গেছে।",
        emailMustBeVerified:
            "প্রস্তাব জমা দেওয়ার আগে ইমেল ঠিকানা যাচাই করতে হবে।",
        emailVerified: "ইমেল ঠিকানা সফলভাবে যাচাই হয়েছে।",
        healthOk: "API স্বাভাবিকভাবে কাজ করছে।",
        healthUnavailable: "API বর্তমানে উপলভ্য নয়।",
        invalidDistrictForState: "নির্বাচিত রাজ্যের জন্য জেলা সঠিক নয়।",
        invalidFileUpload: "আপলোড করা সহায়ক নথিগুলি সঠিক নয়।",
        invalidInstituteTypeForParticipantCategory:
            "নির্বাচিত অংশগ্রহণকারী বিভাগের জন্য প্রতিষ্ঠানের ধরন সঠিক নয়।",
        invalidParticipantCategory: "অংশগ্রহণকারী বিভাগ সঠিক নয়।",
        invalidState: "রাজ্য সঠিক নয়।",
        instituteTypesFetched: "প্রতিষ্ঠানের ধরন সফলভাবে পাওয়া গেছে।",
        internalServerError: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        invalidToken: "যাচাইকরণ লিঙ্কটি সঠিক নয় অথবা এর মেয়াদ শেষ হয়েছে।",
        lookupsFetched: "প্রয়োজনীয় সাধারণ তথ্য সফলভাবে পাওয়া গেছে।",
        notFound: "চাওয়া তথ্য পাওয়া যায়নি।",
        noActiveChallenge: "কোনও সক্রিয় চ্যালেঞ্জ কনফিগার করা নেই।",
        participantNotFound: "অংশগ্রহণকারীর তথ্য পাওয়া যায়নি।",
        participantCategoriesFetched:
            "অংশগ্রহণকারী বিভাগগুলি সফলভাবে পাওয়া গেছে।",
        participantCategoryInstituteTypesFetched:
            "অংশগ্রহণকারী বিভাগ ও প্রতিষ্ঠানের ধরনের ম্যাপিং সফলভাবে পাওয়া গেছে।",
        proposalSubmitted: "প্রস্তাব সফলভাবে জমা হয়েছে।",
        registrationCreated:
            "নিবন্ধন সফলভাবে সংরক্ষিত হয়েছে। যাচাইকরণ ইমেল পাঠানো হয়েছে।",
        registrationFetched: "নিবন্ধনের তথ্য সফলভাবে পাওয়া গেছে।",
        registrationIdNumeric: "registration id সংখ্যায় হতে হবে।",
        registrationNotFound: "নিবন্ধনের তথ্য পাওয়া যায়নি।",
        statesFetched: "রাজ্যের তথ্য সফলভাবে পাওয়া গেছে।",
        stateIdNumeric: "stateId সংখ্যায় হতে হবে।",
        unableCreateRegistration: "নিবন্ধন তৈরি করা যায়নি।",
        unableFetchChallengeCategories: "চ্যালেঞ্জের বিভাগগুলি পাওয়া যায়নি।",
        unableFetchCommonLookups: "প্রয়োজনীয় সাধারণ তথ্য পাওয়া যায়নি।",
        unableFetchDistricts: "জেলার তথ্য পাওয়া যায়নি।",
        unableFetchInstituteTypes: "প্রতিষ্ঠানের ধরন পাওয়া যায়নি।",
        unableFetchParticipantCategories:
            "অংশগ্রহণকারী বিভাগ পাওয়া যায়নি।",
        unableFetchParticipantCategoryInstituteTypes:
            "অংশগ্রহণকারী বিভাগ ও প্রতিষ্ঠানের ধরনের ম্যাপিং পাওয়া যায়নি।",
        unableFetchRegistration: "নিবন্ধনের তথ্য পাওয়া যায়নি।",
        unableFetchStates: "রাজ্যের তথ্য পাওয়া যায়নি।",
        unableSubmitProposal: "প্রস্তাব জমা দেওয়া যায়নি।",
        unableVerifyEmail: "ইমেল ঠিকানা যাচাই করা যায়নি।",
        useStateIdForDistricts: "জেলা বাছাই করতে stateId ব্যবহার করুন।",
        validationError: "চিহ্নিত ভুলগুলি ঠিক করুন।",
        verificationTokenRequired: "যাচাইকরণ টোকেন প্রয়োজন।",
    },
    apiValidation: {
        districtIdRequired: "districtId প্রয়োজন।",
        fieldRequired: (field: string) => `${field} প্রয়োজন।`,
        fullNameRequired: "fullName প্রয়োজন।",
        participantCategoryRequired: "participantCategory প্রয়োজন।",
        pinCodeInvalid: "pinCode সঠিক নয়।",
        supportingDocumentMax: (count: number) =>
            `${count}টির বেশি PDF ফাইল আপলোড করবেন না।`,
        supportingDocumentInvalid: "আপলোড করা সহায়ক নথিগুলি সঠিক নয়।",
        supportingDocumentRequired: "অন্তত একটি সহায়ক নথি আপলোড করুন।",
        supportingDocumentSize: (sizeMb: number) =>
            `প্রতিটি সহায়ক নথির আকার ${sizeMb} MB বা তার কম হতে হবে।`,
        supportingDocumentType: "শুধু PDF ফাইল আপলোড করুন।",
        stateIdRequired: "stateId প্রয়োজন।",
        teamMemberEmailInvalid: (index: number) =>
            `teamMembers[${index}].email সঠিক নয়।`,
        teamMemberFullNameRequired: (index: number) =>
            `teamMembers[${index}].fullName প্রয়োজন।`,
        teamMemberMobileInvalid: (index: number) =>
            `teamMembers[${index}].mobile সঠিক নয়।`,
        teamMemberRequired:
            "দলগতভাবে অংশ নিতে অন্তত একজন অতিরিক্ত দলীয় সদস্য প্রয়োজন।",
        validEmailRequired: "একটি বৈধ ইমেল ঠিকানা দিন।",
        validMobileRequired: "একটি বৈধ ১০ সংখ্যার মোবাইল নম্বর দিন।",
    },
    emails: {
        applicationSubmitted: {
            applicationNumberLabel: "আবেদন নম্বর",
            detailsTitle: "জমা দেওয়া তথ্য",
            footer:
                "এই ইমেলটি Sewa First Innovation Challenge থেকে পাঠানো হয়েছে। আপনি যদি এই অনুরোধ না করে থাকেন, তাহলে ইমেলটি উপেক্ষা করতে পারেন।",
            greeting: (participantName: string) => `প্রিয় ${participantName},`,
            intro:
                "Sewa First Innovation Challenge-এর জন্য আপনার আবেদন সফলভাবে জমা হয়েছে।",
            preheader: (applicationNumber: string) =>
                `আপনার আবেদন নম্বর ${applicationNumber}।`,
            subject: (applicationNumber: string) =>
                `আবেদন জমা হয়েছে: ${applicationNumber}`,
            title: "আবেদন জমা হয়েছে",
        },
        teamMemberAdded: {
            applicationNumberLabel: "আবেদন নম্বর",
            footer:
                "এই ইমেলটি Sewa First Innovation Challenge থেকে পাঠানো হয়েছে। তথ্যটি সঠিক না হলে টিম লিডের সঙ্গে যোগাযোগ করুন।",
            greeting: (participantName: string) => `প্রিয় ${participantName},`,
            intro: (teamLeadName: string, applicationNumber: string) =>
                `টিম লিড ${teamLeadName} আপনাকে আবেদন নম্বর ${applicationNumber}-এর দলের সদস্য হিসেবে যুক্ত করেছেন।`,
            portalUrlLabel: "পোর্টাল URL",
            preheader: (applicationNumber: string) =>
                `আপনাকে আবেদন নম্বর ${applicationNumber}-এর দলের সদস্য হিসেবে যুক্ত করা হয়েছে।`,
            subject: (applicationNumber: string) =>
                `দলের সদস্য হিসেবে যুক্ত করা হয়েছে: ${applicationNumber}`,
            title: "দলের সদস্য হিসেবে যুক্ত করা হয়েছে",
        },
        verification: {
            ctaLabel: "ইমেল ঠিকানা যাচাই করুন",
            footer:
                "এই ইমেলটি Sewa First Innovation Challenge থেকে পাঠানো হয়েছে। আপনি যদি এই অনুরোধ না করে থাকেন, তাহলে ইমেলটি উপেক্ষা করতে পারেন।",
            greeting: (participantName: string) => `প্রিয় ${participantName},`,
            intro:
                "Sewa First Innovation Challenge-এর নিবন্ধন শুরু করার জন্য ধন্যবাদ।",
            linkHelp:
                "বোতামটি কাজ না করলে নিচের লিঙ্কটি কপি করে ব্রাউজারে পেস্ট করুন:",
            preheader:
                "Sewa First Innovation Challenge-এর নিবন্ধন চালিয়ে যেতে আপনার ইমেল ঠিকানা যাচাই করুন।",
            subject:
                "Sewa First Innovation Challenge-এর ইমেল ঠিকানা যাচাই করুন",
            title: "Verify your email address",
            verifyInstruction:
                "ধাপ ২-এ যেতে এবং অংশগ্রহণকারীর প্রোফাইল সম্পূর্ণ করতে আপনার ইমেল ঠিকানা যাচাই করুন।",
            verifyTextInstruction:
                "ধাপ ২-এ যেতে আপনার ইমেল ঠিকানা যাচাই করুন:",
        },
    },
    registrations: {
        duplicateRegistration:
            "এই ইমেল আইডি বা মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি আবেদন করা হয়েছে। আগে পাঠানো যাচাইকরণ ইমেল ব্যবহার করে এগিয়ে যান। প্রয়োজন হলে সহায়তা দলের সঙ্গে যোগাযোগ করুন।",
    },
} as const;
