import type { LucideIcon } from "lucide-react";
import {
    Atom,
    BadgeIndianRupee,
    Baby,
    Bot,
    Briefcase,
    Building2,
    CalendarClock,
    Droplets,
    FlaskConical,
    GraduationCap,
    Landmark,
    Leaf,
    MapPin,
    Microscope,
    ShieldCheck,
    SunMedium,
    Stethoscope,
    Telescope,
    Van,
    Wheat,
    Wind,
    Parasol,
} from "lucide-react";

export type HeroSlide = {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    desktopImage: string;
    mobileImage?: string;
    imageAlt: string;
    primaryCTA: { label: string; href: string };
    secondaryCTA: { label: string; href: string };
};
export const heroSlides: HeroSlide[] = [
    {
        id: "ai",
        eyebrow: "Sewa First Innovation Challenge",
        title: "Innovate Locally. Impact Nationally.",
        description:
            "Ideas from Eastern India can solve some of India's most pressing everyday problems. Identify a real problem around you and develop a practical solution that can work on the ground.",
        desktopImage: "/images/hero-slider-01.webp",
        imageAlt: "Innovation challenge hero visual",
        primaryCTA: { label: "Register Now", href: "/en/register" },
        secondaryCTA: { label: "Explore Themes", href: "/en/themes" },
    },
    {
        id: "drone",
        eyebrow: "Eastern Region Challenge",
        title: "Build practical solutions for real communities.",
        description:
            "Open to participants from Arunachal Pradesh, Assam, Bihar, Jharkhand, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura and West Bengal.",
        desktopImage: "/images/hero-slider-02.webp",
        imageAlt: "Innovation technology hero visual",
        primaryCTA: { label: "Explore Themes", href: "/en/themes" },
        secondaryCTA: {
            label: "How to Participate",
            href: "/en/how-to-participate",
        },
    },
    {
        id: "solar",
        eyebrow: "17 September - 17 October 2026",
        title: "From local problems to pilots and adoption.",
        description:
            "Identify a local problem, build a practical solution, show how it can work, explain the impact and take it further.",
        desktopImage: "/images/hero-slider-03.webp",
        imageAlt: "Sustainable innovation hero visual",
        primaryCTA: { label: "Register Now", href: "/en/register" },
        secondaryCTA: {
            label: "View Timeline",
            href: "/en/timeline",
        },
    },
];
export type Theme = {
    slug: string;
    title: string;
    description: string;
    count: number;
    icon: LucideIcon;
};
export const themes: Theme[] = [
    {
        slug: "village-panchayat-innovation",
        title: "Village & Panchayat Innovation",
        description:
            "Solutions for better public services and everyday life in villages and local communities.",
        count: 6,
        icon: Landmark,
    },
    {
        slug: "agriculture-allied-sectors",
        title: "Agriculture & Allied Sectors",
        description:
            "Ideas that can improve farm productivity, reduce losses and strengthen rural livelihoods.",
        count: 8,
        icon: Wheat,
    },
    {
        slug: "education-skill-development",
        title: "Education & Skill Development",
        description:
            "Solutions that make learning more accessible, useful and effective.",
        count: 6,
        icon: GraduationCap,
    },
    {
        slug: "healthcare",
        title: "Healthcare",
        description:
            "Practical ways to improve access to healthcare and strengthen preventive and emergency care.",
        count: 6,
        icon: Stethoscope,
    },
    {
        slug: "urban-civic-innovation",
        title: "Urban & Civic Innovation",
        description: "Solutions for everyday problems in towns and cities.",
        count: 8,
        icon: Building2,
    },
    {
        slug: "environment-sustainability",
        title: "Environment & Sustainability",
        description:
            "Ideas that protect natural resources and reduce environmental damage.",
        count: 6,
        icon: Leaf,
    },
    {
        slug: "employment-livelihood-msmes",
        title: "Employment, Livelihood & MSMEs",
        description:
            "Solutions that help people find work, build businesses and reach markets.",
        count: 7,
        icon: Briefcase,
    },
    {
        slug: "women-child-development",
        title: "Women & Child Development",
        description:
            "Innovations that improve safety, health, wellbeing and access to opportunity.",
        count: 6,
        icon: Baby,
    },
    {
        slug: "disaster-management-community-safety",
        title: "Disaster Management & Community Safety",
        description:
            "Solutions that help communities prepare for, respond to and recover from disasters.",
        count: 6,
        icon: Wind,
    },
    {
        slug: "transport-mobility",
        title: "Transport & Mobility",
        description:
            "Ideas that make travel safer, easier and more accessible.",
        count: 6,
        icon: Van,
    },
    {
        slug: "energy",
        title: "Energy",
        description:
            "Affordable and sustainable solutions for homes, communities and public infrastructure.",
        count: 5,
        icon: SunMedium,
    },
    {
        slug: "tourism-cultural-innovation",
        title: "Tourism & Cultural Innovation",
        description:
            "Ideas that improve tourism while creating opportunities for local communities.",
        count: 6,
        icon: Parasol,
    },
];
export const problemStatements = [
    {
        code: "STIC-01",
        theme: "Artificial Intelligence",
        title: "Early warning tools for local climate risks",
        description:
            "Develop interpretable systems that turn local observation and weather data into actionable risk alerts.",
        outcome: "A field-testable, multilingual decision-support prototype.",
    },
    {
        code: "STIC-08",
        theme: "Healthcare",
        title: "Affordable point-of-care screening",
        description:
            "Create accessible screening pathways for primary healthcare settings with limited resources.",
        outcome: "A validated prototype and implementation pathway.",
    },
    {
        code: "STIC-15",
        theme: "Water Technologies",
        title: "Community-scale water quality monitoring",
        description:
            "Design a simple, reliable monitoring solution for decentralised water sources.",
        outcome: "Open data capture with clear quality indicators.",
    },
];
export const timeline = [
    ["17 Sep 2026", "Challenge launch", "Upcoming"],
    ["17 Sep 2026", "Registration opens", "Upcoming"],
    ["Sep - Oct 2026", "Proposal submission", "Upcoming"],
    ["Oct 2026", "Screening and evaluation", "Upcoming"],
    ["Oct 2026", "Regional challenge round", "Upcoming"],
    ["10 - 17 Oct 2026", "Finale and recognition", "Upcoming"],
];
export const announcements = [
    {
        type: "Important",
        date: "08 January 2026",
        title: "Registration for the Innovation Challenge is now open",
        summary:
            "Applicants may create their profile and review current problem statements.",
    },
    {
        type: "Deadline",
        date: "05 January 2026",
        title: "Information session for institutions",
        summary:
            "A virtual orientation for nodal officers will be held this month.",
    },
    {
        type: "Notice",
        date: "20 December 2025",
        title: "Challenge guidelines published",
        summary:
            "Please review eligibility, evaluation and intellectual property guidance.",
    },
];
export const faqs = [
    [
        "What is the Sewa First Innovation Challenge?",
        "It is a platform for young people to identify real problems around them and develop practical solutions that can be implemented and, where possible, scaled.",
    ],
    [
        "Who can participate?",
        "School and college students, ITI and polytechnic students, graduates, young professionals, researchers, early-stage startups, independent innovators and community groups may participate, subject to the final Challenge guidelines.",
    ],
    [
        "Which states are covered by the Eastern Region?",
        "West Bengal, Bihar, Jharkhand, Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Tripura and Sikkim.",
    ],
    [
        "Do I need to have a startup?",
        "No. You can participate as a student, professional, independent innovator, startup or community group.",
    ],
    [
        "Do I need a working prototype?",
        "Not in every case. Junior participants may submit a strong idea with a clear implementation plan. Open-category participants are expected to present a stronger implementation case, and a prototype or pilot is preferred.",
    ],
    [
        "Does my solution have to use AI?",
        "No. Use the technology or method that fits the problem. A simple, affordable solution that works is better than using AI where it is not needed.",
    ],
    [
        "What kind of problem should I choose?",
        "Choose a specific problem you have observed in a real place or community. The clearer and more grounded the problem is, the stronger your submission will be.",
    ],
    [
        "Can I submit an idea outside the listed themes?",
        "Yes. The themes are meant to guide you. Other ideas may also be considered if they address a genuine problem and have a practical route to implementation.",
    ],
    [
        "Can I submit in an Indian language?",
        "The Challenge is intended to encourage participation in Indian languages, subject to the final portal and evaluation arrangements.",
    ],
    [
        "What will the jury look for?",
        "The jury may consider the relevance of the problem, originality of the solution, practicality, technical feasibility, cost, expected impact, sustainability, scalability and the quality of any prototype or pilot.",
    ],
    [
        "Will selected participants receive mentoring?",
        "Selected innovators may receive mentoring, technical guidance, incubation or pilot support, subject to the final Challenge guidelines.",
    ],
    [
        "Are there prizes?",
        "The Challenge proposes financial recognition along with mentorship, prototype or pilot support, incubation and adoption opportunities. The final prize structure will be announced separately.",
    ],
    [
        "What happens if my idea is selected?",
        "Depending on the stage and programme guidelines, selected innovations may receive recognition, mentoring, incubation, prototype or pilot support and opportunities to work with potential implementation partners.",
    ],
    [
        "Can I participate as a team?",
        "Yes. Applications may be submitted individually or as a team, subject to the final Challenge guidelines.",
    ],
];

export type KeyFact = {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: "saffron" | "green" | "blue";
};
export const keyFacts: KeyFact[] = [
    {
        label: "Challenge period",
        value: "17 Sep - 17 Oct 2026",
        icon: BadgeIndianRupee,
        tone: "saffron",
    },
    {
        label: "Eastern region",
        value: "11 states",
        icon: CalendarClock,
        tone: "blue",
    },
    {
        label: "Regional hub",
        value: "Kolkata",
        icon: MapPin,
        tone: "green",
    },
    {
        label: "Categories",
        value: "Junior and Open",
        icon: ShieldCheck,
        tone: "blue",
    },
];
export type StageStatus = "Completed" | "Current" | "Upcoming";
export type Stage = {
    slug: string;
    index: string;
    title: string;
    window: string;
    format: string;
    status: StageStatus;
    description: string;
    outcome: string;
};
export const stages: Stage[] = [
    {
        slug: "identify-problem",
        index: "01",
        title: "Identify the Problem",
        window: "Start with your community",
        format: "School · village · town · district · workplace",
        status: "Current",
        description:
            "Start with a problem you have actually seen in your school, village, town, district, workplace or community.",
        outcome: "A clear, grounded problem statement",
    },
    {
        slug: "develop-solution",
        index: "02",
        title: "Develop the Solution",
        window: "Before submission",
        format: "Build · improve · change",
        status: "Upcoming",
        description:
            "Explain what you want to build, improve or change, and why your approach can work.",
        outcome: "A practical solution approach",
    },
    {
        slug: "submit-proposal",
        index: "03",
        title: "Submit Your Proposal",
        window: "September - October 2026",
        format: "Online Innovation & Implementation Plan",
        status: "Upcoming",
        description:
            "Complete the online Innovation & Implementation Plan and upload supporting material, if available.",
        outcome: "Complete proposal submitted",
    },
    {
        slug: "screening-shortlisting",
        index: "04",
        title: "Screening & Shortlisting",
        window: "October 2026",
        format: "Eligibility · completeness · technical merit",
        status: "Upcoming",
        description:
            "Entries will be checked for eligibility, completeness and technical merit.",
        outcome: "Shortlisted entries move to regional evaluation",
    },
    {
        slug: "regional-evaluation",
        index: "05",
        title: "Regional Evaluation",
        window: "October 2026",
        format: "Expert jury presentation",
        status: "Upcoming",
        description:
            "Shortlisted participants will present their solution, model, prototype or implementation plan before an expert jury.",
        outcome: "Promising innovators identified",
    },
    {
        slug: "mentoring-support",
        index: "06",
        title: "Mentoring & Prototype Support",
        window: "After shortlisting",
        format: "Guidance · refinement · next-stage preparation",
        status: "Upcoming",
        description:
            "Selected innovators may receive guidance to strengthen the solution and prepare it for the next stage.",
        outcome: "Stronger prototype, pilot or implementation plan",
    },
    {
        slug: "final-evaluation",
        index: "07",
        title: "Final Evaluation",
        window: "10 - 17 Oct 2026",
        format: "Final challenge evaluation",
        status: "Upcoming",
        description:
            "The strongest entries will move forward through the Challenge evaluation process.",
        outcome: "Leading innovations selected for recognition",
    },
    {
        slug: "pilot-adoption",
        index: "08",
        title: "Pilot & Adoption",
        window: "After the Challenge",
        format: "Institutions · departments · industry partners",
        status: "Upcoming",
        description:
            "Promising solutions may be connected with institutions, government departments, industry or implementation partners for further development and possible pilot use.",
        outcome: "Pathway to prototype, pilot, incubation or adoption",
    },
];
export const awards = [
    {
        title: "Recognition",
        value: "Final structure TBA",
        note: "For leading innovations",
    },
    {
        title: "Mentorship",
        value: "Expert guidance",
        note: "Subject to final Challenge guidelines",
    },
    {
        title: "Pilot support",
        value: "Adoption pathways",
        note: "With potential implementation partners",
    },
];
export type Benefit = { title: string; description: string; icon: LucideIcon };
export const benefits: Benefit[] = [
    {
        title: "Expert mentorship",
        description:
            "Selected innovators may receive mentoring and technical guidance to strengthen the solution.",
        icon: GraduationCap,
    },
    {
        title: "Incubation support",
        description:
            "Promising ideas may be connected with incubation and prototype-development opportunities.",
        icon: FlaskConical,
    },
    {
        title: "Pilot opportunities",
        description:
            "Practical solutions may be connected with institutions, departments, industry or implementation partners.",
        icon: Landmark,
    },
    {
        title: "Research support",
        description:
            "Guidance can help participants improve evidence, feasibility and implementation plans.",
        icon: Microscope,
    },
    {
        title: "Ecosystem access",
        description:
            "Kolkata serves as the regional hub for bringing Eastern and North-Eastern ideas together.",
        icon: Briefcase,
    },
    {
        title: "National recognition",
        description:
            "Strong local solutions can earn visibility through the Sewa First Innovation Challenge platform.",
        icon: Building2,
    },
];
export type Criterion = { title: string; question: string; note: string };
export const evaluationCriteria: Criterion[] = [
    {
        title: "Problem relevance",
        question:
            "Is the problem specific, real and clearly connected to a place or community?",
        note: "The jury looks for grounded problem understanding and relevance to beneficiaries.",
    },
    {
        title: "Originality & practicality",
        question:
            "Is the solution fresh enough and practical enough to be implemented?",
        note: "A simple, affordable solution that works can be stronger than unnecessary complexity.",
    },
    {
        title: "Implementation feasibility",
        question:
            "Does the proposal explain how it can be built, who must act and what it may cost?",
        note: "Implementation plan, cost, timeline and dependencies all matter.",
    },
    {
        title: "Expected impact",
        question:
            "What social, economic or environmental difference can the solution make?",
        note: "Clear beneficiaries and realistic impact estimates strengthen the submission.",
    },
    {
        title: "Scalability & evidence",
        question:
            "Could the solution work elsewhere, and is there prototype or pilot evidence?",
        note: "A model, prototype, pilot, photographs, results or supporting documents add weight.",
    },
];
export type PanelGroup = {
    title: string;
    description: string;
    icon: LucideIcon;
};
export const panelGroups: PanelGroup[] = [
    {
        title: "Domain scientists",
        description:
            "Researchers from national laboratories and research institutions in each theme.",
        icon: Atom,
    },
    {
        title: "Academic experts",
        description:
            "Faculty from universities and institutes of national importance.",
        icon: GraduationCap,
    },
    {
        title: "Industry & ecosystem",
        description:
            "Practitioners from industry, incubators and the startup ecosystem.",
        icon: Briefcase,
    },
    {
        title: "Public-system practitioners",
        description:
            "Officers and programme leads who run the services the solutions target.",
        icon: Landmark,
    },
];
