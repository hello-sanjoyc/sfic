"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

type ScreenReaderHelpProps = {
    locale: string;
};

const content = {
    en: {
        title: "Screen Reader Access Guide",
        back: "Back",
        sections: [
            {
                heading: "Overview",
                content: [
                    "This guide provides instructions for using this website with a screen reader. Screen readers are assistive technologies that read aloud the text and other content on web pages, helping users with visual impairments navigate and interact with websites.",
                    "This website is designed to be fully accessible with popular screen readers including NVDA (free), JAWS (commercial), and VoiceOver (built-in to macOS and iOS).",
                ],
            },
            {
                heading: "Getting Started",
                hasLinks: true,
                content: [
                    "If you don't already have a screen reader installed, we recommend:",
                    "nvda",
                    "jaws",
                    "voiceover",
                    "Most modern browsers have good screen reader support. We recommend using the latest version of your preferred browser.",
                ],
            },
            {
                heading: "Navigation Structure",
                content: [
                    "This website uses a logical heading structure to organize content. Use the following keyboard shortcuts to navigate:",
                    "• H: Jump to next heading",
                    "• 1-6: Jump to heading level (e.g., press 1 to jump to main headings)",
                    "• L: Jump to next list",
                    "• B: Jump to next button",
                    "• F: Jump to next form field",
                    "• G: Jump to next graphic",
                    "Note: These are standard NVDA shortcuts. Your screen reader may use different shortcuts.",
                ],
            },
            {
                heading: "Skip Links",
                content: [
                    "At the top of every page, there is a 'Skip to main content' link. Pressing Tab on your keyboard when you first enter the page will activate this link, allowing you to jump directly to the main content and skip the navigation menu.",
                ],
            },
            {
                heading: "Language Settings",
                content: [
                    "This website is available in three languages: English, Hindi, and Bengali. You can change the language using the language switcher in the top utility bar. The language selector will be announced by your screen reader as you navigate.",
                ],
            },
            {
                heading: "Accessibility Features",
                content: [
                    "From the Accessibility menu (marked with an accessibility icon in the top right), you can enable several features:",
                    "• High Contrast: Increases contrast between text and background",
                    "• Dark Mode: Inverts colors for comfortable viewing in low-light conditions",
                    "• Highlight Links: Highlights all links with a yellow background and underline",
                    "• Increase/Decrease Text: Adjusts the overall text size on the page (90% to 115%)",
                    "• Line Height: Increases space between lines of text",
                    "• Text Spacing: Increases space between words and letters",
                    "• Big Cursor: Makes the mouse cursor larger and more visible",
                    "• Hide Images: Hides images to reduce visual clutter",
                ],
            },
            {
                heading: "Forms",
                content: [
                    "All forms on this website include properly labeled input fields. Each form field is associated with its label, so your screen reader will announce both the label and the input type (text, checkbox, radio button, etc.).",
                    "Required fields are marked with an asterisk (*) and will be announced by your screen reader as 'required' or 'asterisk'.",
                ],
            },
            {
                heading: "Keyboard Navigation",
                content: [
                    "You can navigate through all interactive elements (links, buttons, form fields) using the Tab key. Press Shift+Tab to move to the previous element.",
                    "Press Enter to activate buttons and links, or to submit forms.",
                    "Use arrow keys to select options in dropdown menus or radio button groups.",
                ],
            },
            {
                heading: "Video and Media Content",
                content: [
                    "Videos on this website include captions (if available) and transcripts. Video players are fully keyboard accessible. Use the spacebar to play/pause videos when focused on the player.",
                ],
            },
            {
                heading: "Reporting Accessibility Issues",
                content: [
                    "We are committed to making this website as accessible as possible. If you encounter any accessibility issues or have suggestions for improvement, please contact us at support@innovation-challenge.gov.in with details about the issue and your screen reader.",
                ],
            },
            {
                heading: "Technical Details",
                content: [
                    "This website follows the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. The website uses semantic HTML, ARIA labels where necessary, and has been tested for compatibility with major screen readers.",
                    "If you experience any technical issues with your screen reader, it may be helpful to clear your browser cache or try a different browser.",
                ],
            },
        ],
    },
    hi: {
        title: "स्क्रीन रीडर एक्सेस गाइड",
        back: "वापस जाएं",
        sections: [
            {
                heading: "अवलोकन",
                content: [
                    "यह गाइड स्क्रीन रीडर के साथ इस वेबसाइट का उपयोग करने के निर्देश प्रदान करती है। स्क्रीन रीडर सहायक तकनीकें हैं जो वेब पृष्ठों पर टेक्स्ट और अन्य सामग्री को जोर से पढ़ती हैं, जिससे दृष्टि बाधा वाले उपयोगकर्ताओं को वेबसाइटों को नेविगेट और उनके साथ इंटरैक्ट करने में मदद मिलती है।",
                    "यह वेबसाइट NVDA (मुक्त), JAWS (वाणिज्यिक), और VoiceOver (macOS और iOS में बिल्ट-इन) सहित लोकप्रिय स्क्रीन रीडर के साथ पूरी तरह से सुलभ है।",
                ],
            },
            {
                heading: "शुरुआत करें",
                hasLinks: true,
                content: [
                    "यदि आपके पास पहले से स्क्रीन रीडर स्थापित नहीं है, तो हम सुझाते हैं:",
                    "nvda_hi",
                    "jaws_hi",
                    "voiceover_hi",
                    "अधिकांश आधुनिक ब्राउज़र में अच्छी स्क्रीन रीडर समर्थन है। हम आपके पसंदीदा ब्राउज़र का नवीनतम संस्करण उपयोग करने की अनुशंसा करते हैं।",
                ],
            },
            {
                heading: "नेविगेशन संरचना",
                content: [
                    "यह वेबसाइट सामग्री को व्यवस्थित करने के लिए एक तार्किक शीर्षक संरचना का उपयोग करती है। नेविगेट करने के लिए निम्नलिखित कीबोर्ड शॉर्टकट का उपयोग करें:",
                    "• H: अगले शीर्षक पर जाएं",
                    "• 1-6: शीर्षक स्तर पर जाएं (उदाहरण के लिए, मुख्य शीर्षकों पर जाने के लिए 1 दबाएं)",
                    "• L: अगली सूची पर जाएं",
                    "• B: अगले बटन पर जाएं",
                    "• F: अगले फॉर्म फील्ड पर जाएं",
                    "• G: अगली ग्राफिक पर जाएं",
                    "नोट: ये मानक NVDA शॉर्टकट हैं। आपका स्क्रीन रीडर अलग शॉर्टकट का उपयोग कर सकता है।",
                ],
            },
            {
                heading: "लिंक छोड़ें",
                content: [
                    "प्रत्येक पृष्ठ के शीर्ष पर, 'मुख्य सामग्री पर जाएं' लिंक है। जब आप पहली बार पृष्ठ में प्रवेश करते हैं तो अपने कीबोर्ड पर Tab दबाने से यह लिंक सक्रिय हो जाएगा, जिससे आप मुख्य सामग्री पर सीधे जा सकते हैं और नेविगेशन मेनू को छोड़ सकते हैं।",
                ],
            },
            {
                heading: "भाषा सेटिंग्स",
                content: [
                    "यह वेबसाइट तीन भाषाओं में उपलब्ध है: अंग्रेजी, हिंदी, और बंगाली। आप शीर्ष उपयोगिता बार में भाषा स्विचर का उपयोग करके भाषा बदल सकते हैं। भाषा चयनकर्ता की घोषणा आपके स्क्रीन रीडर द्वारा की जाएगी जब आप नेविगेट करेंगे।",
                ],
            },
            {
                heading: "एक्सेसिबिलिटी विशेषताएं",
                content: [
                    "एक्सेसिबिलिटी मेनू से (शीर्ष दाईं ओर एक्सेसिबिलिटी आइकन के साथ चिह्नित), आप कई विशेषताएं सक्षम कर सकते हैं:",
                    "• उच्च कंट्रास्ट: पाठ और पृष्ठभूमि के बीच कंट्रास्ट बढ़ाता है",
                    "• डार्क मोड: कम रोशनी की स्थिति में आरामदायक दृश्य के लिए रंगों को उलट देता है",
                    "• हाइलाइट लिंक्स: सभी लिंक्स को पीली पृष्ठभूमि और अंडरलाइन के साथ हाइलाइट करता है",
                    "• टेक्स्ट बढ़ाएं/घटाएं: पृष्ठ पर समग्र पाठ आकार को समायोजित करता है (90% से 115%)",
                    "• लाइन ऊंचाई: पाठ की लाइनों के बीच स्थान बढ़ाता है",
                    "• पाठ रिक्ति: शब्दों और अक्षरों के बीच स्थान बढ़ाता है",
                    "• बड़ा कर्सर: माउस कर्सर को बड़ा और अधिक दृश्यमान बनाता है",
                    "• छवियां छुपाएं: दृश्य अव्यवस्था को कम करने के लिए छवियों को छुपाता है",
                ],
            },
            {
                heading: "फॉर्म्स",
                content: [
                    "इस वेबसाइट पर सभी फॉर्म में ठीक से लेबल किए गए इनपुट फील्ड शामिल हैं। प्रत्येक फॉर्म फील्ड अपने लेबल के साथ जुड़ा हुआ है, इसलिए आपका स्क्रीन रीडर लेबल और इनपुट प्रकार (पाठ, चेकबॉक्स, रेडियो बटन, आदि) दोनों की घोषणा करेगा।",
                    "आवश्यक फील्ड एक तारांकन (*) से चिह्नित हैं और आपके स्क्रीन रीडर द्वारा 'आवश्यक' या 'तारांकन' के रूप में घोषित किए जाएंगे।",
                ],
            },
            {
                heading: "कीबोर्ड नेविगेशन",
                content: [
                    "आप Tab कुंजी का उपयोग करके सभी इंटरैक्टिव तत्वों (लिंक्स, बटन, फॉर्म फील्ड) के माध्यम से नेविगेट कर सकते हैं। पिछले तत्व पर जाने के लिए Shift+Tab दबाएं।",
                    "बटन और लिंक को सक्रिय करने, या फॉर्म सबमिट करने के लिए Enter दबाएं।",
                    "ड्रॉपडाउन मेनू या रेडियो बटन समूह में विकल्प चुनने के लिए arrow कुंजियों का उपयोग करें।",
                ],
            },
            {
                heading: "वीडियो और मीडिया सामग्री",
                content: [
                    "इस वेबसाइट पर वीडियो में कैप्शन (यदि उपलब्ध हो) और ट्रांसक्रिप्ट शामिल हैं। वीडियो प्लेयर पूरी तरह से कीबोर्ड सुलभ हैं। प्लेयर पर फोकस करते समय वीडियो को चलाने/रोकने के लिए स्पेसबार का उपयोग करें।",
                ],
            },
            {
                heading: "एक्सेसिबिलिटी समस्याओं की रिपोर्ट करें",
                content: [
                    "हम इस वेबसाइट को यथासंभव सुलभ बनाने के लिए प्रतिबद्ध हैं। यदि आप कोई एक्सेसिबिलिटी समस्या का सामना करते हैं या सुधार के लिए सुझाव हैं, तो कृपया समस्या और आपके स्क्रीन रीडर के विवरण के साथ support@innovation-challenge.gov.in से संपर्क करें।",
                ],
            },
            {
                heading: "तकनीकी विवरण",
                content: [
                    "यह वेबसाइट वेब सामग्री एक्सेसिबिलिटी दिशानिर्देश (WCAG) 2.1 स्तर AA मानकों का पालन करती है। वेबसाइट सिमांटिक HTML, आवश्यक जहां ARIA लेबल का उपयोग करती है, और प्रमुख स्क्रीन रीडर के साथ संगतता के लिए परीक्षण की गई है।",
                    "यदि आप अपने स्क्रीन रीडर के साथ कोई तकनीकी समस्या का अनुभव करते हैं, तो आपके ब्राउज़र कैश को साफ करना या एक अलग ब्राउज़र आजमाना सहायक हो सकता है।",
                ],
            },
        ],
    },
    bn: {
        title: "স্ক্রিন রিডার অ্যাক্সেস গাইড",
        back: "ফিরে যান",
        sections: [
            {
                heading: "সংক্ষিপ্ত বিবরণ",
                content: [
                    "এই গাইডটি একটি স্ক্রিন রিডার সহ এই ওয়েবসাইটটি ব্যবহার করার জন্য নির্দেশাবলী সরবরাহ করে। স্ক্রিন রিডাররা সহায়ক প্রযুক্তি যা ওয়েব পৃষ্ঠাগুলিতে পাঠ্য এবং অন্যান্য সামগ্রী জোরে পড়ে, যা দৃষ্টি প্রতিবন্ধী ব্যবহারকারীদের ওয়েবসাইটগুলি নেভিগেট এবং ইন্টারঅ্যাক্ট করতে সহায়তা করে।",
                    "এই ওয়েবসাইটটি NVDA (বিনামূল্যে), JAWS (বাণিজ্যিক), এবং VoiceOver (macOS এবং iOS এ বিল্ট-ইন) সহ জনপ্রিয় স্ক্রিন রিডারগুলির সাথে সম্পূর্ণরূপে অ্যাক্সেসযোগ্য।",
                ],
            },
            {
                heading: "শুরু করুন",
                hasLinks: true,
                content: [
                    "যদি আপনার কাছে ইতিমধ্যে একটি স্ক্রিন রিডার ইনস্টল না থাকে তবে আমরা সুপারিশ করি:",
                    "nvda_bn",
                    "jaws_bn",
                    "voiceover_bn",
                    "বেশিরভাগ আধুনিক ব্রাউজারে ভাল স্ক্রিন রিডার সমর্থন রয়েছে। আমরা আপনার পছন্দের ব্রাউজারের সর্বশেষ সংস্করণ ব্যবহার করার সুপারিশ করি।",
                ],
            },
            {
                heading: "নেভিগেশন কাঠামো",
                content: [
                    "এই ওয়েবসাইটটি সামগ্রী সংগঠিত করতে একটি যৌক্তিক শিরোনাম কাঠামো ব্যবহার করে। নেভিগেট করতে নিম্নলিখিত কীবোর্ড শর্টকাটগুলি ব্যবহার করুন:",
                    "• H: পরবর্তী শিরোনামে যান",
                    "• 1-6: শিরোনাম স্তরে যান (উদাহরণস্বরূপ, প্রধান শিরোনামগুলিতে যেতে 1 টিপুন)",
                    "• L: পরবর্তী তালিকায় যান",
                    "• B: পরবর্তী বোতামে যান",
                    "• F: পরবর্তী ফর্ম ক্ষেত্রে যান",
                    "• G: পরবর্তী গ্রাফিকে যান",
                    "দ্রষ্টব্য: এগুলি মানক NVDA শর্টকাট। আপনার স্ক্রিন রিডার বিভিন্ন শর্টকাট ব্যবহার করতে পারে।",
                ],
            },
            {
                heading: "লিংক এড়িয়ে যান",
                content: [
                    "প্রতিটি পৃষ্ঠার শীর্ষে একটি 'মূল বিষয়বস্তুতে যান' লিংক রয়েছে। আপনি যখন প্রথমবার পৃষ্ঠায় প্রবেশ করেন তখন আপনার কীবোর্ডে ট্যাব টিপলে এই লিংকটি সক্রিয় হয়ে যাবে, যা আপনাকে মূল বিষয়বস্তুতে সরাসরি যেতে এবং নেভিগেশন মেনু এড়াতে দেয়।",
                ],
            },
            {
                heading: "ভাষা সেটিংস",
                content: [
                    "এই ওয়েবসাইটটি তিনটি ভাষায় উপলব্ধ: ইংরেজি, হিন্দি, এবং বাংলা। আপনি শীর্ষ ইউটিলিটি বারে ভাষা সুইচার ব্যবহার করে ভাষা পরিবর্তন করতে পারেন। ভাষা নির্বাচক আপনার স্ক্রিন রিডার দ্বারা ঘোষিত হবে যখন আপনি নেভিগেট করবেন।",
                ],
            },
            {
                heading: "অ্যাক্সেসযোগ্যতা বৈশিষ্ট্য",
                content: [
                    "অ্যাক্সেসযোগ্যতা মেনু থেকে (শীর্ষ ডানদিকে একটি অ্যাক্সেসযোগ্যতা আইকন দিয়ে চিহ্নিত), আপনি বেশ কয়েকটি বৈশিষ্ট্য সক্ষম করতে পারেন:",
                    "• উচ্চ বৈপরীত্য: পাঠ্য এবং পটভূমির মধ্যে বৈপরীত্য বৃদ্ধি করে",
                    "• অন্ধকার মোড: কম আলোর পরিস্থিতিতে আরামদায়ক দেখার জন্য রঙগুলিকে বিপরীত করে",
                    "• হাইলাইট লিংক: সমস্ত লিংকগুলি একটি হলুদ পটভূমি এবং আন্ডারলাইন দিয়ে হাইলাইট করে",
                    "• পাঠ্য বৃদ্ধি/হ্রাস: পৃষ্ঠায় সামগ্রিক পাঠ্য আকার সামঞ্জস্য করে (90% থেকে 115%)",
                    "• লাইন উচ্চতা: পাঠ্যের লাইনগুলির মধ্যে স্থান বৃদ্ধি করে",
                    "• পাঠ্য ব্যবধান: শব্দ এবং অক্ষরগুলির মধ্যে স্থান বৃদ্ধি করে",
                    "• বড় কার্সার: মাউস কার্সারকে বড় এবং আরও দৃশ্যমান করে তোলে",
                    "• ছবিগুলি লুকান: ভিজ্যুয়াল জগাখিচুড়ি কমাতে ছবিগুলি লুকিয়ে রাখে",
                ],
            },
            {
                heading: "ফর্ম",
                content: [
                    "এই ওয়েবসাইটের সমস্ত ফর্ম সঠিকভাবে লেবেল করা ইনপুট ক্ষেত্র অন্তর্ভুক্ত করে। প্রতিটি ফর্ম ক্ষেত্র তার লেবেলের সাথে যুক্ত, তাই আপনার স্ক্রিন রিডার লেবেল এবং ইনপুট প্রকার উভয়ই ঘোষণা করবে (পাঠ্য, চেকবক্স, রেডিও বোতাম, ইত্যাদি)।",
                    "প্রয়োজনীয় ক্ষেত্রগুলি একটি তারকাসংক্রান্ত (*) দিয়ে চিহ্নিত করা হয় এবং আপনার স্ক্রিন রিডার দ্বারা 'প্রয়োজনীয়' বা 'তারকাসংক্রান্ত' হিসাবে ঘোষিত হবে।",
                ],
            },
            {
                heading: "কীবোর্ড নেভিগেশন",
                content: [
                    "আপনি ট্যাব কী ব্যবহার করে সমস্ত ইন্টারঅ্যাক্টিভ উপাদান (লিংক, বোতাম, ফর্ম ক্ষেত্র) এর মাধ্যমে নেভিগেট করতে পারেন। পূর্ববর্তী উপাদানে যেতে Shift+Tab টিপুন।",
                    "বোতাম এবং লিংকগুলি সক্রিয় করতে বা ফর্ম জমা দিতে Enter টিপুন।",
                    "ড্রপডাউন মেনু বা রেডিও বোতাম গ্রুপে বিকল্পগুলি নির্বাচন করতে অ্যারো কীগুলি ব্যবহার করুন।",
                ],
            },
            {
                heading: "ভিডিও এবং মিডিয়া সামগ্রী",
                content: [
                    "এই ওয়েবসাইটের ভিডিওতে ক্যাপশন (যদি উপলব্ধ হয়) এবং ট্রান্সক্রিপ্ট রয়েছে। ভিডিও প্লেয়ার সম্পূর্ণভাবে কীবোর্ড অ্যাক্সেসযোগ্য। প্লেয়ারে ফোকাস করার সময় ভিডিও চালু/বন্ধ করতে স্পেসবার ব্যবহার করুন।",
                ],
            },
            {
                heading: "অ্যাক্সেসযোগ্যতা সমস্যা রিপোর্ট করুন",
                content: [
                    "আমরা এই ওয়েবসাইটটিকে যতটা সম্ভব অ্যাক্সেসযোগ্য করতে প্রতিশ্রুতিবদ্ধ। যদি আপনি কোনো অ্যাক্সেসযোগ্যতার সমস্যার সম্মুখীন হন বা উন্নতির জন্য পরামর্শ থাকে তবে অনুগ্রহ করে সমস্যা এবং আপনার স্ক্রীন রিডারের বিবরণ সহ support@innovation-challenge.gov.in এ যোগাযোগ করুন।",
                ],
            },
            {
                heading: "প্রযুক্তিগত বিবরণ",
                content: [
                    "এই ওয়েবসাইটটি ওয়েব সামগ্রী অ্যাক্সেসযোগ্যতা নির্দেশিকা (WCAG) 2.1 স্তর AA মান অনুসরণ করে। ওয়েবসাইটটি সিমান্টিক HTML, প্রয়োজনীয় স্থানে ARIA লেবেল ব্যবহার করে এবং প্রধান স্ক্রিন রিডারগুলির সাথে সামঞ্জস্যের জন্য পরীক্ষা করা হয়েছে।",
                    "যদি আপনি আপনার স্ক্রিন রিডারের সাথে কোনো প্রযুক্তিগত সমস্যার সম্মুখীন হন তবে আপনার ব্রাউজার ক্যাশ সাফ করা বা একটি ভিন্ন ব্রাউজার চেষ্টা করা সহায়ক হতে পারে।",
                ],
            },
        ],
    },
};

const links = {
    nvda: {
        before: "• NVDA - A free, open-source screen reader available at ",
        url: "www.nvaccess.org",
        href: "https://www.nvaccess.org",
    },
    jaws: {
        before: "• JAWS - A commercial screen reader available at ",
        url: "www.freedomscientific.com",
        href: "https://www.freedomscientific.com",
    },
    voiceover: {
        before: "• VoiceOver - Built into macOS, iOS, and iPadOS. Enable it in System Preferences > Accessibility > VoiceOver",
        url: null,
        href: null,
    },
    nvda_hi: {
        before: "• NVDA - एक मुक्त, खुला स्रोत स्क्रीन रीडर ",
        url: "www.nvaccess.org",
        href: "https://www.nvaccess.org",
        after: " पर उपलब्ध है",
    },
    jaws_hi: {
        before: "• JAWS - एक वाणिज्यिक स्क्रीन रीडर ",
        url: "www.freedomscientific.com",
        href: "https://www.freedomscientific.com",
        after: " पर उपलब्ध है",
    },
    voiceover_hi: {
        before: "• VoiceOver - macOS, iOS, और iPadOS में बिल्ट-इन। इसे सिस्टम प्रेफरेंसेज > एक्सेसिबिलिटी > VoiceOver में सक्षम करें",
        url: null,
        href: null,
    },
    nvda_bn: {
        before: "• NVDA - একটি বিনামূল্যে, ওপেন সোর্স স্ক্রিন রিডার ",
        url: "www.nvaccess.org",
        href: "https://www.nvaccess.org",
        after: " এ উপলব্ধ",
    },
    jaws_bn: {
        before: "• JAWS - একটি বাণিজ্যিক স্ক্রিন রিডার ",
        url: "www.freedomscientific.com",
        href: "https://www.freedomscientific.com",
        after: " এ উপলব্ধ",
    },
    voiceover_bn: {
        before: "• VoiceOver - macOS, iOS, এবং iPadOS এ বিল্ট-ইন। এটি সিস্টেম পছন্দসমূহ > অ্যাক্সেসযোগ্যতা > VoiceOver এ সক্ষম করুন",
        url: null,
        href: null,
    },
};

function renderContent(item: string, links: Record<string, any>) {
    if (links[item]) {
        const link = links[item];
        if (link.url) {
            return (
                <p key={item} className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {link.before}
                    <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--india-saffron)] hover:text-[var(--chakra-blue)] underline inline-flex items-center gap-1 transition focus-visible:outline-offset-2"
                    >
                        {link.url}
                        <ExternalLink size={14} aria-hidden="true" />
                    </a>
                    {link.after || ""}
                </p>
            );
        } else {
            return (
                <p key={item} className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {link.before}
                </p>
            );
        }
    }
    return (
        <p key={item} className="text-base text-[var(--text-secondary)] leading-relaxed">
            {item}
        </p>
    );
}

export function ScreenReaderHelp({ locale }: ScreenReaderHelpProps) {
    const router = useRouter();
    const lang = (content as Record<string, any>)[locale] || content.en;

    return (
        <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
            {/* Back Button */}
            <div className="border-b border-[var(--border)] sticky top-0 z-10 bg-white">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition focus-visible:outline-offset-2"
                        aria-label={lang.back}
                    >
                        <ArrowLeft size={20} />
                        <span>{lang.back}</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main
                id="main-content"
                className="mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-16"
            >
                {/* Page Header */}
                <header className="mb-12">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="tri-accent" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] tracking-tight mb-6">
                        {lang.title}
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                        {locale === "en"
                            ? "This comprehensive guide will help you navigate and use this website effectively with your screen reader."
                            : locale === "hi"
                              ? "यह व्यापक गाइड आपको आपके स्क्रीन रीडर के साथ इस वेबसाइट को प्रभावी ढंग से नेविगेट और उपयोग करने में मदद करेगी।"
                              : "এই ব্যাপক গাইডটি আপনার স্ক্রীন রিডারের সাথে এই ওয়েবসাইটটি কার্যকরভাবে নেভিগেট এবং ব্যবহার করতে আপনাকে সহায়তা করবে।"}
                    </p>
                </header>

                {/* Sections */}
                <div className="space-y-12">
                    {lang.sections.map((section: any, index: number) => (
                        <section key={index} className="scroll-mt-24">
                            <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-4">
                                {section.heading}
                            </h2>
                            <div className="space-y-3">
                                {section.content.map(
                                    (paragraph: string, pIndex: number) =>
                                        section.hasLinks
                                            ? renderContent(paragraph, links)
                                            : (
                                                <p
                                                    key={pIndex}
                                                    className="text-base text-[var(--text-secondary)] leading-relaxed"
                                                >
                                                    {paragraph}
                                                </p>
                                            ),
                                )}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Contact Section */}
                <section className="mt-16 pt-12 border-t border-[var(--border)]">
                    <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-4">
                        {locale === "en"
                            ? "Need Help?"
                            : locale === "hi"
                              ? "सहायता चाहिए?"
                              : "সাহায্য প্রয়োজন?"}
                    </h2>
                    <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-4">
                        {locale === "en"
                            ? "If you have any questions or need additional assistance, please don't hesitate to reach out to us at support@innovation-challenge.gov.in"
                            : locale === "hi"
                              ? "यदि आपके कोई प्रश्न हैं या अतिरिक्त सहायता की आवश्यकता है, तो कृपया हमसे support@innovation-challenge.gov.in पर संपर्क करने में संकोच न करें"
                              : "যদি আপনার কোনো প্রশ্ন থাকে বা অতিরিक্ত সহায়তার প্রয়োজন হয় তবে অনুগ্রহ করে support@innovation-challenge.gov.in এ আমাদের সাথে যোগাযোগ করতে দ্বিধা করবেন না"}
                    </p>
                </section>
            </main>
        </div>
    );
}
