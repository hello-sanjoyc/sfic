export const bnContent = {
    api: {
        badRequest: "অনুরোধটি সঠিক নয়।",
        applicationNumberLimitReached:
            "{stateCode}-এর জন্য আবেদন নম্বরের সীমা পূর্ণ হয়েছে।",
        challengeCategoriesFetched: "চ্যালেঞ্জ বিভাগ সফলভাবে আনা হয়েছে।",
        challengesFetched: "চ্যালেঞ্জের তালিকা সফলভাবে আনা হয়েছে।",
        databaseNotConfigured: "ডেটাবেস কনফিগার করা নেই।",
        districtsFetched: "জেলার তালিকা সফলভাবে আনা হয়েছে।",
        emailMustBeVerified:
            "প্রস্তাব জমা দেওয়ার আগে ইমেল যাচাই করা আবশ্যক।",
        emailVerified: "ইমেল সফলভাবে যাচাই হয়েছে।",
        healthOk: "API সচল আছে।",
        healthUnavailable: "API বর্তমানে উপলভ্য নয়।",
        invalidDistrictForState: "নির্বাচিত রাজ্যের জন্য জেলা সঠিক নয়।",
        invalidFileUpload: "আপলোড করা সহায়ক নথি সঠিক নয়।",
        invalidInstituteTypeForParticipantCategory:
            "অংশগ্রহণকারী বিভাগের জন্য প্রতিষ্ঠানের ধরন সঠিক নয়।",
        invalidParticipantCategory: "অংশগ্রহণকারীর বিভাগ সঠিক নয়।",
        invalidState: "রাজ্য সঠিক নয়।",
        instituteTypesFetched: "প্রতিষ্ঠানের ধরন সফলভাবে আনা হয়েছে।",
        internalServerError: "কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        invalidToken: "যাচাইকরণ লিঙ্কটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।",
        lookupsFetched: "সাধারণ তালিকা সফলভাবে আনা হয়েছে।",
        notFound: "অনুরোধ করা তথ্য পাওয়া যায়নি।",
        noActiveChallenge: "কোনও সক্রিয় চ্যালেঞ্জ কনফিগার করা নেই।",
        participantNotFound: "অংশগ্রহণকারী পাওয়া যায়নি।",
        participantCategoriesFetched:
            "অংশগ্রহণকারীর বিভাগ সফলভাবে আনা হয়েছে।",
        participantCategoryInstituteTypesFetched:
            "অংশগ্রহণকারী বিভাগ ও প্রতিষ্ঠানের ধরন ম্যাপিং সফলভাবে আনা হয়েছে।",
        proposalSubmitted: "প্রস্তাব সফলভাবে জমা হয়েছে।",
        registrationCreated:
            "নিবন্ধন সফলভাবে সংরক্ষিত হয়েছে। যাচাইকরণ ইমেল পাঠানো হয়েছে।",
        registrationFetched: "নিবন্ধন সফলভাবে আনা হয়েছে।",
        registrationIdNumeric: "নিবন্ধন আইডি সংখ্যায় হতে হবে।",
        registrationNotFound: "নিবন্ধন পাওয়া যায়নি।",
        statesFetched: "রাজ্যের তালিকা সফলভাবে আনা হয়েছে।",
        stateIdNumeric: "stateId সংখ্যায় হতে হবে।",
        unableCreateRegistration: "নিবন্ধন তৈরি করা যায়নি।",
        unableFetchChallengeCategories: "চ্যালেঞ্জ বিভাগ আনা যায়নি।",
        unableFetchCommonLookups: "সাধারণ তালিকা আনা যায়নি।",
        unableFetchDistricts: "জেলার তালিকা আনা যায়নি।",
        unableFetchInstituteTypes: "প্রতিষ্ঠানের ধরন আনা যায়নি।",
        unableFetchParticipantCategories:
            "অংশগ্রহণকারীর বিভাগ আনা যায়নি।",
        unableFetchParticipantCategoryInstituteTypes:
            "অংশগ্রহণকারী বিভাগ ও প্রতিষ্ঠানের ধরন ম্যাপিং আনা যায়নি।",
        unableFetchRegistration: "নিবন্ধনের তথ্য আনা যায়নি।",
        unableFetchStates: "রাজ্যের তালিকা আনা যায়নি।",
        unableSubmitProposal: "প্রস্তাব জমা দেওয়া যায়নি।",
        unableVerifyEmail: "ইমেল ঠিকানা যাচাই করা যায়নি।",
        useStateIdForDistricts: "জেলা ফিল্টার করতে stateId ব্যবহার করুন।",
        validationError: "অনুগ্রহ করে চিহ্নিত ভুলগুলি সংশোধন করুন।",
        verificationTokenRequired: "যাচাইকরণ টোকেন প্রয়োজন।",
    },
    apiValidation: {
        districtIdRequired: "districtId প্রয়োজন।",
        fieldRequired: (field: string) => `${field} প্রয়োজন।`,
        fullNameRequired: "fullName প্রয়োজন।",
        participantCategoryRequired: "participantCategory প্রয়োজন।",
        pinCodeInvalid: "pinCode সঠিক নয়।",
        supportingDocumentMax: (count: number) =>
            `সর্বোচ্চ ${count}টি পিডিএফ ফাইল আপলোড করুন।`,
        supportingDocumentInvalid: "আপলোড করা সহায়ক নথি সঠিক নয়।",
        supportingDocumentRequired: "অন্তত একটি সহায়ক নথি আপলোড করুন।",
        supportingDocumentSize: (sizeMb: number) =>
            `প্রতিটি সহায়ক নথির আকার ${sizeMb} MB বা তার কম হতে হবে।`,
        supportingDocumentType: "শুধু পিডিএফ ফাইল আপলোড করুন।",
        stateIdRequired: "stateId প্রয়োজন।",
        teamMemberEmailInvalid: (index: number) =>
            `teamMembers[${index}].email সঠিক নয়।`,
        teamMemberFullNameRequired: (index: number) =>
            `teamMembers[${index}].fullName প্রয়োজন।`,
        teamMemberMobileInvalid: (index: number) =>
            `teamMembers[${index}].mobile সঠিক নয়।`,
        teamMemberRequired:
            "দলগত অংশগ্রহণের জন্য অন্তত একজন দলীয় সদস্য প্রয়োজন।",
        validEmailRequired: "একটি বৈধ ইমেল প্রয়োজন।",
        validMobileRequired: "একটি বৈধ ১০-সংখ্যার মোবাইল নম্বর প্রয়োজন।",
    },
    emails: {
        applicationSubmitted: {
            applicationNumberLabel: "আবেদন নম্বর",
            detailsTitle: "জমা দেওয়া তথ্য",
            footer:
                "এই ইমেলটি সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জ থেকে পাঠানো হয়েছে। আপনি যদি এটি অনুরোধ না করে থাকেন, তাহলে এটি উপেক্ষা করতে পারেন।",
            greeting: (participantName: string) => `প্রিয় ${participantName},`,
            intro:
                "সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জে আপনার আবেদন সফলভাবে জমা হয়েছে।",
            preheader: (applicationNumber: string) =>
                `আপনার আবেদন নম্বর ${applicationNumber}।`,
            subject: (applicationNumber: string) =>
                `আবেদন জমা হয়েছে: ${applicationNumber}`,
            title: "আবেদন জমা হয়েছে",
        },
        teamMemberAdded: {
            applicationNumberLabel: "আবেদন নম্বর",
            footer:
                "এই ইমেলটি সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জ থেকে পাঠানো হয়েছে। তথ্যটি সঠিক না হলে অনুগ্রহ করে টিম লিডের সঙ্গে যোগাযোগ করুন।",
            greeting: (participantName: string) => `প্রিয় ${participantName},`,
            intro: (teamLeadName: string, applicationNumber: string) =>
                `টিম লিড ${teamLeadName} আপনাকে আবেদন নম্বর ${applicationNumber}-এর দলীয় সদস্য হিসেবে যুক্ত করেছেন।`,
            portalUrlLabel: "পোর্টাল URL",
            preheader: (applicationNumber: string) =>
                `আপনাকে ${applicationNumber}-এর দলীয় সদস্য হিসেবে যুক্ত করা হয়েছে।`,
            subject: (applicationNumber: string) =>
                `দলীয় সদস্য হিসেবে যুক্ত করা হয়েছে: ${applicationNumber}`,
            title: "দলীয় সদস্য হিসেবে যুক্ত করা হয়েছে",
        },
        verification: {
            ctaLabel: "ইমেল ঠিকানা যাচাই করুন",
            footer:
                "এই ইমেলটি সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জ থেকে পাঠানো হয়েছে। আপনি যদি এটি অনুরোধ না করে থাকেন, তাহলে এটি উপেক্ষা করতে পারেন।",
            greeting: (participantName: string) => `প্রিয় ${participantName},`,
            intro:
                "সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জে আপনার নিবন্ধন শুরু করার জন্য ধন্যবাদ।",
            linkHelp:
                "বোতামটি কাজ না করলে, এই লিঙ্কটি কপি করে আপনার ব্রাউজারে পেস্ট করুন:",
            preheader:
                "নিবন্ধন চালিয়ে যেতে আপনার ইমেল ঠিকানা যাচাই করুন।",
            subject: "আপনার ইমেল ঠিকানা যাচাই করুন",
            title: "আপনার ইমেল ঠিকানা যাচাই করুন",
            verifyInstruction:
                "ধাপ ২-এ এগিয়ে গিয়ে অংশগ্রহণকারীর প্রোফাইল সম্পূর্ণ করতে অনুগ্রহ করে আপনার ইমেল ঠিকানা যাচাই করুন।",
            verifyTextInstruction:
                "ধাপ ২-এ এগিয়ে যেতে আপনার ইমেল ঠিকানা যাচাই করুন:",
        },
    },
    registrations: {
        duplicateRegistration:
            "এই ইমেল আইডি বা মোবাইল নম্বর দিয়ে ইতিমধ্যেই একটি আবেদন করা হয়েছে। অনুগ্রহ করে ইতিমধ্যে পাঠানো যাচাইকরণ ইমেল থেকে চালিয়ে যান, অথবা সহায়তার প্রয়োজন হলে সাপোর্টে যোগাযোগ করুন।",
    },
} as const;
