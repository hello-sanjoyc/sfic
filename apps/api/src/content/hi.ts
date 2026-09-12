export const hiContent = {
    api: {
        badRequest: "अनुरोध मान्य नहीं है।",
        applicationNumberLimitReached:
            "{stateCode} राज्य के लिए आवेदन संख्या की निर्धारित सीमा पूरी हो चुकी है।",
        challengeCategoriesFetched:
            "चैलेंज श्रेणियां सफलतापूर्वक प्राप्त हो गई हैं।",
        challengesFetched: "चैलेंज की जानकारी सफलतापूर्वक प्राप्त हो गई है।",
        databaseNotConfigured: "डेटाबेस कॉन्फ़िगर नहीं किया गया है।",
        districtsFetched: "जिलों की जानकारी सफलतापूर्वक प्राप्त हो गई है।",
        emailMustBeVerified:
            "प्रस्ताव जमा करने से पहले ईमेल पते का सत्यापन आवश्यक है।",
        emailVerified: "ईमेल पता सफलतापूर्वक सत्यापित हो गया है।",
        healthOk: "API सामान्य रूप से काम कर रहा है।",
        healthUnavailable: "API इस समय उपलब्ध नहीं है।",
        invalidDistrictForState: "चुने गए राज्य के लिए जिला मान्य नहीं है।",
        invalidFileUpload: "अपलोड किए गए सहायक दस्तावेज मान्य नहीं हैं।",
        invalidInstituteTypeForParticipantCategory:
            "चुनी गई प्रतिभागी श्रेणी के लिए संस्थान का प्रकार मान्य नहीं है।",
        invalidParticipantCategory: "प्रतिभागी श्रेणी मान्य नहीं है।",
        invalidState: "राज्य मान्य नहीं है।",
        instituteTypesFetched: "संस्थान के प्रकार सफलतापूर्वक प्राप्त हो गए हैं।",
        internalServerError: "कुछ गड़बड़ हुई है। कृपया फिर से प्रयास करें।",
        invalidToken: "सत्यापन लिंक मान्य नहीं है या उसकी अवधि समाप्त हो चुकी है।",
        lookupsFetched: "आवश्यक सामान्य जानकारी सफलतापूर्वक प्राप्त हो गई है।",
        notFound: "मांगी गई जानकारी नहीं मिली।",
        noActiveChallenge: "कोई सक्रिय चैलेंज कॉन्फ़िगर नहीं है।",
        participantNotFound: "प्रतिभागी की जानकारी नहीं मिली।",
        participantCategoriesFetched:
            "प्रतिभागी श्रेणियां सफलतापूर्वक प्राप्त हो गई हैं।",
        participantCategoryInstituteTypesFetched:
            "प्रतिभागी श्रेणी और संस्थान प्रकार की मैपिंग सफलतापूर्वक प्राप्त हो गई है।",
        proposalSubmitted: "प्रस्ताव सफलतापूर्वक जमा हो गया है।",
        registrationCreated:
            "पंजीकरण सफलतापूर्वक सहेज लिया गया है। सत्यापन ईमेल भेज दिया गया है।",
        registrationFetched: "पंजीकरण की जानकारी सफलतापूर्वक प्राप्त हो गई है।",
        registrationIdNumeric: "registration id केवल अंकों में होना चाहिए।",
        registrationNotFound: "पंजीकरण की जानकारी नहीं मिली।",
        statesFetched: "राज्यों की जानकारी सफलतापूर्वक प्राप्त हो गई है।",
        stateIdNumeric: "stateId केवल अंकों में होना चाहिए।",
        unableCreateRegistration: "पंजीकरण बनाया नहीं जा सका।",
        unableFetchChallengeCategories: "चैलेंज श्रेणियां प्राप्त नहीं की जा सकीं।",
        unableFetchCommonLookups: "आवश्यक सामान्य जानकारी प्राप्त नहीं की जा सकी।",
        unableFetchDistricts: "जिलों की जानकारी प्राप्त नहीं की जा सकी।",
        unableFetchInstituteTypes: "संस्थान के प्रकार प्राप्त नहीं किए जा सके।",
        unableFetchParticipantCategories:
            "प्रतिभागी श्रेणियां प्राप्त नहीं की जा सकीं।",
        unableFetchParticipantCategoryInstituteTypes:
            "प्रतिभागी श्रेणी और संस्थान प्रकार की मैपिंग प्राप्त नहीं की जा सकी।",
        unableFetchRegistration: "पंजीकरण की जानकारी प्राप्त नहीं की जा सकी।",
        unableFetchStates: "राज्यों की जानकारी प्राप्त नहीं की जा सकी।",
        unableSubmitProposal: "प्रस्ताव जमा नहीं किया जा सका।",
        unableVerifyEmail: "ईमेल पते का सत्यापन नहीं किया जा सका।",
        useStateIdForDistricts: "जिलों को फ़िल्टर करने के लिए stateId का उपयोग करें।",
        validationError: "चिह्नित त्रुटियों को ठीक करें।",
        verificationTokenRequired: "सत्यापन टोकन आवश्यक है।",
    },
    apiValidation: {
        districtIdRequired: "districtId आवश्यक है।",
        fieldRequired: (field: string) => `${field} आवश्यक है।`,
        fullNameRequired: "fullName आवश्यक है।",
        participantCategoryRequired: "participantCategory आवश्यक है।",
        pinCodeInvalid: "pinCode मान्य नहीं है।",
        supportingDocumentMax: (count: number) =>
            `अधिकतम ${count} PDF फाइलें अपलोड करें।`,
        supportingDocumentInvalid: "अपलोड किए गए सहायक दस्तावेज मान्य नहीं हैं।",
        supportingDocumentRequired: "कम से कम एक सहायक दस्तावेज अपलोड करें।",
        supportingDocumentSize: (sizeMb: number) =>
            `प्रत्येक सहायक दस्तावेज ${sizeMb} MB या उससे छोटा होना चाहिए।`,
        supportingDocumentType: "केवल PDF फाइलें अपलोड करें।",
        stateIdRequired: "stateId आवश्यक है।",
        teamMemberEmailInvalid: (index: number) =>
            `teamMembers[${index}].email मान्य नहीं है।`,
        teamMemberFullNameRequired: (index: number) =>
            `teamMembers[${index}].fullName आवश्यक है।`,
        teamMemberMobileInvalid: (index: number) =>
            `teamMembers[${index}].mobile मान्य नहीं है।`,
        teamMemberRequired:
            "टीम के रूप में भाग लेने के लिए कम से कम एक अतिरिक्त सदस्य आवश्यक है।",
        validEmailRequired: "एक मान्य ईमेल पता दर्ज करें।",
        validMobileRequired: "एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।",
    },
    emails: {
        applicationSubmitted: {
            applicationNumberLabel: "आवेदन संख्या",
            detailsTitle: "जमा की गई जानकारी",
            footer:
                "यह ईमेल Sewa First Innovation Challenge की ओर से भेजा गया है। यदि आपने यह अनुरोध नहीं किया है, तो आप इस ईमेल को नज़रअंदाज़ कर सकते हैं।",
            greeting: (participantName: string) => `प्रिय ${participantName},`,
            intro:
                "Sewa First Innovation Challenge के लिए आपका आवेदन सफलतापूर्वक जमा हो गया है।",
            preheader: (applicationNumber: string) =>
                `आपकी आवेदन संख्या ${applicationNumber} है।`,
            subject: (applicationNumber: string) =>
                `आवेदन जमा हुआ: ${applicationNumber}`,
            title: "आवेदन जमा हो गया है",
        },
        teamMemberAdded: {
            applicationNumberLabel: "आवेदन संख्या",
            footer:
                "यह ईमेल Sewa First Innovation Challenge की ओर से भेजा गया है। यदि यह जानकारी सही नहीं लगती, तो कृपया टीम लीड से संपर्क करें।",
            greeting: (participantName: string) => `प्रिय ${participantName},`,
            intro: (teamLeadName: string, applicationNumber: string) =>
                `टीम लीड ${teamLeadName} ने आपको आवेदन संख्या ${applicationNumber} के लिए टीम सदस्य के रूप में जोड़ा है।`,
            portalUrlLabel: "पोर्टल URL",
            preheader: (applicationNumber: string) =>
                `आपको आवेदन संख्या ${applicationNumber} के लिए टीम सदस्य के रूप में जोड़ा गया है।`,
            subject: (applicationNumber: string) =>
                `टीम सदस्य के रूप में जोड़ा गया: ${applicationNumber}`,
            title: "टीम सदस्य के रूप में जोड़ा गया",
        },
        verification: {
            ctaLabel: "ईमेल पता सत्यापित करें",
            footer:
                "यह ईमेल Sewa First Innovation Challenge की ओर से भेजा गया है। यदि आपने यह अनुरोध नहीं किया है, तो आप इस ईमेल को नज़रअंदाज़ कर सकते हैं।",
            greeting: (participantName: string) => `प्रिय ${participantName},`,
            intro:
                "Sewa First Innovation Challenge के लिए पंजीकरण शुरू करने के लिए धन्यवाद।",
            linkHelp:
                "यदि बटन काम नहीं करता है, तो नीचे दिया गया लिंक कॉपी करके अपने ब्राउज़र में पेस्ट करें:",
            preheader:
                "Sewa First Innovation Challenge का पंजीकरण जारी रखने के लिए अपना ईमेल पता सत्यापित करें।",
            subject:
                "Sewa First Innovation Challenge के लिए अपना ईमेल पता सत्यापित करें",
            title: "Verify your email address",
            verifyInstruction:
                "चरण 2 पर जाने और प्रतिभागी प्रोफाइल पूरा करने के लिए अपना ईमेल पता सत्यापित करें।",
            verifyTextInstruction:
                "चरण 2 पर जाने के लिए अपना ईमेल पता सत्यापित करें:",
        },
    },
    registrations: {
        duplicateRegistration:
            "इस ईमेल आईडी या मोबाइल नंबर से पहले ही एक आवेदन किया जा चुका है। पहले भेजे गए सत्यापन ईमेल के माध्यम से आगे बढ़ें। सहायता की आवश्यकता हो तो सपोर्ट टीम से संपर्क करें।",
    },
} as const;
