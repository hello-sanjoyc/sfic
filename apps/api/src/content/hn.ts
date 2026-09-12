export const hnContent = {
    api: {
        badRequest: "अनुरोध सही नहीं है।",
        applicationNumberLimitReached:
            "{stateCode} के लिए आवेदन संख्या सीमा पूरी हो गई है।",
        challengeCategoriesFetched:
            "चैलेंज श्रेणियां सफलतापूर्वक प्राप्त हुईं।",
        challengesFetched: "चैलेंज सूची सफलतापूर्वक प्राप्त हुई।",
        databaseNotConfigured: "डेटाबेस कॉन्फिगर नहीं है।",
        districtsFetched: "जिलों की सूची सफलतापूर्वक प्राप्त हुई।",
        emailMustBeVerified:
            "प्रस्ताव जमा करने से पहले ईमेल सत्यापित होना चाहिए।",
        emailVerified: "ईमेल सफलतापूर्वक सत्यापित हो गया।",
        healthOk: "API स्वस्थ है।",
        healthUnavailable: "API उपलब्ध नहीं है।",
        invalidDistrictForState: "चयनित राज्य के लिए जिला अमान्य है।",
        invalidFileUpload: "अपलोड किए गए सहायक दस्तावेज अमान्य हैं।",
        invalidInstituteTypeForParticipantCategory:
            "प्रतिभागी श्रेणी के लिए संस्थान प्रकार अमान्य है।",
        invalidParticipantCategory: "प्रतिभागी श्रेणी अमान्य है।",
        invalidState: "राज्य अमान्य है।",
        instituteTypesFetched:
            "संस्थान प्रकार सफलतापूर्वक प्राप्त हुए।",
        internalServerError: "कुछ गलत हुआ। कृपया फिर से प्रयास करें।",
        invalidToken: "सत्यापन लिंक अमान्य है या उसकी समय-सीमा समाप्त हो गई है।",
        lookupsFetched: "सामान्य सूचियां सफलतापूर्वक प्राप्त हुईं।",
        notFound: "अनुरोधित जानकारी नहीं मिली।",
        noActiveChallenge: "कोई सक्रिय चैलेंज कॉन्फिगर नहीं है।",
        participantNotFound: "प्रतिभागी नहीं मिला।",
        participantCategoriesFetched:
            "प्रतिभागी श्रेणियां सफलतापूर्वक प्राप्त हुईं।",
        participantCategoryInstituteTypesFetched:
            "प्रतिभागी श्रेणी और संस्थान प्रकार मैपिंग सफलतापूर्वक प्राप्त हुई।",
        proposalSubmitted: "प्रस्ताव सफलतापूर्वक जमा हो गया।",
        registrationCreated:
            "पंजीकरण सफलतापूर्वक सहेजा गया। सत्यापन ईमेल भेज दिया गया है।",
        registrationFetched: "पंजीकरण सफलतापूर्वक प्राप्त हुआ।",
        registrationIdNumeric: "पंजीकरण आईडी संख्यात्मक होनी चाहिए।",
        registrationNotFound: "पंजीकरण नहीं मिला।",
        statesFetched: "राज्यों की सूची सफलतापूर्वक प्राप्त हुई।",
        stateIdNumeric: "stateId संख्यात्मक होना चाहिए।",
        unableCreateRegistration: "पंजीकरण बनाया नहीं जा सका।",
        unableFetchChallengeCategories:
            "चैलेंज श्रेणियां प्राप्त नहीं हो सकीं।",
        unableFetchCommonLookups: "सामान्य सूचियां प्राप्त नहीं हो सकीं।",
        unableFetchDistricts: "जिलों की सूची प्राप्त नहीं हो सकी।",
        unableFetchInstituteTypes: "संस्थान प्रकार प्राप्त नहीं हो सके।",
        unableFetchParticipantCategories:
            "प्रतिभागी श्रेणियां प्राप्त नहीं हो सकीं।",
        unableFetchParticipantCategoryInstituteTypes:
            "प्रतिभागी श्रेणी और संस्थान प्रकार मैपिंग प्राप्त नहीं हो सकी।",
        unableFetchRegistration: "पंजीकरण प्राप्त नहीं किया जा सका।",
        unableFetchStates: "राज्यों की सूची प्राप्त नहीं हो सकी।",
        unableSubmitProposal: "प्रस्ताव जमा नहीं किया जा सका।",
        unableVerifyEmail: "ईमेल पता सत्यापित नहीं किया जा सका।",
        useStateIdForDistricts: "जिलों को फ़िल्टर करने के लिए stateId का उपयोग करें।",
        validationError: "कृपया चिह्नित त्रुटियों को ठीक करें।",
        verificationTokenRequired: "सत्यापन टोकन आवश्यक है।",
    },
    apiValidation: {
        districtIdRequired: "districtId आवश्यक है।",
        fieldRequired: (field: string) => `${field} आवश्यक है।`,
        fullNameRequired: "fullName आवश्यक है।",
        participantCategoryRequired: "participantCategory आवश्यक है।",
        pinCodeInvalid: "pinCode अमान्य है।",
        supportingDocumentMax: (count: number) =>
            `अधिकतम ${count} PDF फाइलें अपलोड करें।`,
        supportingDocumentInvalid: "अपलोड किए गए सहायक दस्तावेज अमान्य हैं।",
        supportingDocumentRequired: "कम से कम एक सहायक दस्तावेज अपलोड करें।",
        supportingDocumentSize: (sizeMb: number) =>
            `हर सहायक दस्तावेज का आकार ${sizeMb} MB या उससे कम होना चाहिए।`,
        supportingDocumentType: "केवल PDF फाइलें अपलोड करें।",
        stateIdRequired: "stateId आवश्यक है।",
        teamMemberEmailInvalid: (index: number) =>
            `teamMembers[${index}].email अमान्य है।`,
        teamMemberFullNameRequired: (index: number) =>
            `teamMembers[${index}].fullName आवश्यक है।`,
        teamMemberMobileInvalid: (index: number) =>
            `teamMembers[${index}].mobile अमान्य है।`,
        teamMemberRequired:
            "टीम भागीदारी के लिए कम से कम एक टीम सदस्य आवश्यक है।",
        validEmailRequired: "एक वैध ईमेल आवश्यक है।",
        validMobileRequired: "एक वैध 10-अंकीय मोबाइल नंबर आवश्यक है।",
    },
    emails: {
        applicationSubmitted: {
            applicationNumberLabel: "आवेदन संख्या",
            detailsTitle: "जमा किए गए विवरण",
            footer:
                "यह ईमेल सेवा फर्स्ट इनोवेशन चैलेंज द्वारा भेजा गया है। यदि आपने यह अनुरोध नहीं किया है, तो आप इसे सुरक्षित रूप से अनदेखा कर सकते हैं।",
            greeting: (participantName: string) => `प्रिय ${participantName},`,
            intro:
                "सेवा फर्स्ट इनोवेशन चैलेंज के लिए आपका आवेदन सफलतापूर्वक जमा हो गया है।",
            preheader: (applicationNumber: string) =>
                `आपकी आवेदन संख्या ${applicationNumber} है।`,
            subject: (applicationNumber: string) =>
                `आवेदन जमा हुआ: ${applicationNumber}`,
            title: "आवेदन जमा हुआ",
        },
        teamMemberAdded: {
            applicationNumberLabel: "आवेदन संख्या",
            footer:
                "यह ईमेल सेवा फर्स्ट इनोवेशन चैलेंज द्वारा भेजा गया है। यदि यह जानकारी सही नहीं लगती है, तो कृपया टीम लीड से संपर्क करें।",
            greeting: (participantName: string) => `प्रिय ${participantName},`,
            intro: (teamLeadName: string, applicationNumber: string) =>
                `टीम लीड ${teamLeadName} ने आपको आवेदन संख्या ${applicationNumber} के लिए टीम सदस्य के रूप में जोड़ा है।`,
            portalUrlLabel: "पोर्टल URL",
            preheader: (applicationNumber: string) =>
                `आपको ${applicationNumber} के लिए टीम सदस्य के रूप में जोड़ा गया है।`,
            subject: (applicationNumber: string) =>
                `टीम सदस्य के रूप में जोड़ा गया: ${applicationNumber}`,
            title: "टीम सदस्य के रूप में जोड़ा गया",
        },
        verification: {
            ctaLabel: "ईमेल पता सत्यापित करें",
            footer:
                "यह ईमेल सेवा फर्स्ट इनोवेशन चैलेंज द्वारा भेजा गया है। यदि आपने यह अनुरोध नहीं किया है, तो आप इसे सुरक्षित रूप से अनदेखा कर सकते हैं।",
            greeting: (participantName: string) => `प्रिय ${participantName},`,
            intro:
                "सेवा फर्स्ट इनोवेशन चैलेंज के लिए अपना पंजीकरण शुरू करने के लिए धन्यवाद।",
            linkHelp:
                "यदि बटन काम नहीं करता है, तो इस लिंक को कॉपी करके अपने ब्राउज़र में पेस्ट करें:",
            preheader:
                "अपना पंजीकरण जारी रखने के लिए अपना ईमेल पता सत्यापित करें।",
            subject: "अपना ईमेल पता सत्यापित करें",
            title: "अपना ईमेल पता सत्यापित करें",
            verifyInstruction:
                "चरण 2 पर आगे बढ़ने और अपना प्रतिभागी प्रोफाइल पूरा करने के लिए कृपया अपना ईमेल पता सत्यापित करें।",
            verifyTextInstruction:
                "चरण 2 पर आगे बढ़ने के लिए अपना ईमेल पता सत्यापित करें:",
        },
    },
    registrations: {
        duplicateRegistration:
            "इस ईमेल आईडी या मोबाइल नंबर से पहले ही एक आवेदन किया जा चुका है। कृपया पहले भेजे गए सत्यापन ईमेल से आगे बढ़ें, या सहायता की आवश्यकता होने पर सपोर्ट से संपर्क करें।",
    },
} as const;
