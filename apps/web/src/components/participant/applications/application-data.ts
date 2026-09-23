export type ApplicationStatus =
  | "Draft"
  | "Not Shortlisted"
  | "Shortlisted"
  | "Submitted"
  | "Under Review";

export type ParticipantApplication = {
  applicant: {
    district: string;
    email: string;
    instituteType: string;
    mobile: string;
    name: string;
    participantCategory: string;
    state: string;
  };
  applicationNumber: string;
  challengeCategory: string;
  createdOn: string;
  documents: Array<{
    fileName: string;
    fileSize: string;
    type: string;
  }>;
  expectedImpact: string;
  participation: "Individual" | "Team";
  problemStatement: string;
  proposedSolution: string;
  status: ApplicationStatus;
  submittedOn: string;
  summary: string;
  teamMembers: Array<{
    email: string;
    mobile: string;
    name: string;
    role: string;
  }>;
  title: string;
};

export const participantApplications: ParticipantApplication[] = [
  {
    applicant: {
      district: "Kolkata",
      email: "sanjoy@example.com",
      instituteType: "Startup",
      mobile: "+91 98765 43210",
      name: "Sanjoy Chowdhury",
      participantCategory: "Open",
      state: "West Bengal",
    },
    applicationNumber: "SFIC-2026-0012",
    challengeCategory: "Village & Panchayat Innovation",
    createdOn: "2026-09-20",
    documents: [
      { fileName: "village-water-dashboard.pdf", fileSize: "1.8 MB", type: "Proposal" },
      { fileName: "prototype-screens.zip", fileSize: "4.2 MB", type: "Prototype" },
    ],
    expectedImpact:
      "Improve village-level service tracking and reduce manual reporting delays for local bodies.",
    participation: "Team",
    problemStatement:
      "Panchayat teams need a simple way to monitor local civic issues, water points, and service requests.",
    proposedSolution:
      "A multilingual mobile-first dashboard for reporting, assigning, and tracking village service requests.",
    status: "Submitted",
    submittedOn: "2026-09-20",
    summary: "A mobile dashboard to help panchayats track local service requests.",
    teamMembers: [
      { email: "sanjoy@example.com", mobile: "+91 98765 43210", name: "Sanjoy Chowdhury", role: "Team Lead" },
      { email: "ananya@example.com", mobile: "+91 98765 43211", name: "Ananya Sen", role: "Designer" },
    ],
    title: "Gram Seva Service Tracker",
  },
  {
    applicant: {
      district: "Patna",
      email: "sanjoy@example.com",
      instituteType: "Professional",
      mobile: "+91 98765 43210",
      name: "Sanjoy Chowdhury",
      participantCategory: "Open",
      state: "Bihar",
    },
    applicationNumber: "SFIC-2026-0011",
    challengeCategory: "Agriculture & Allied Sectors",
    createdOn: "2026-09-19",
    documents: [{ fileName: "crop-advisory-note.pdf", fileSize: "920 KB", type: "Proposal" }],
    expectedImpact:
      "Help small farmers make faster crop decisions based on local weather and soil conditions.",
    participation: "Individual",
    problemStatement:
      "Small farmers often lack timely and localized crop advisory support during changing weather cycles.",
    proposedSolution:
      "A lightweight advisory workflow that combines crop calendars, soil notes, and weather alerts.",
    status: "Under Review",
    submittedOn: "2026-09-19",
    summary: "Localized crop advisory support for small farmers.",
    teamMembers: [],
    title: "Smart Crop Advisory",
  },
  {
    applicant: {
      district: "Ranchi",
      email: "sanjoy@example.com",
      instituteType: "Undergraduate",
      mobile: "+91 98765 43210",
      name: "Sanjoy Chowdhury",
      participantCategory: "Junior",
      state: "Jharkhand",
    },
    applicationNumber: "SFIC-2026-0010",
    challengeCategory: "Education & Skill Development",
    createdOn: "2026-09-18",
    documents: [{ fileName: "skill-lab-plan.pdf", fileSize: "1.2 MB", type: "Concept Note" }],
    expectedImpact:
      "Increase practical learning access for students in remote and semi-urban areas.",
    participation: "Team",
    problemStatement:
      "Students need accessible hands-on learning opportunities for digital and technical skills.",
    proposedSolution:
      "A portable skill lab kit with guided modules, assessment sheets, and mentor support.",
    status: "Shortlisted",
    submittedOn: "2026-09-18",
    summary: "Portable skill lab kits for practical learning.",
    teamMembers: [
      { email: "sanjoy@example.com", mobile: "+91 98765 43210", name: "Sanjoy Chowdhury", role: "Team Lead" },
      { email: "ravi@example.com", mobile: "+91 98765 43212", name: "Ravi Kumar", role: "Technical Member" },
    ],
    title: "Skill Lab in a Box",
  },
  {
    applicant: {
      district: "Howrah",
      email: "sanjoy@example.com",
      instituteType: "Graduate",
      mobile: "+91 98765 43210",
      name: "Sanjoy Chowdhury",
      participantCategory: "Open",
      state: "West Bengal",
    },
    applicationNumber: "SFIC-2026-0009",
    challengeCategory: "Healthcare",
    createdOn: "2026-09-17",
    documents: [],
    expectedImpact: "Improve preventive screening follow-ups in underserved communities.",
    participation: "Individual",
    problemStatement:
      "Community health workers need clearer follow-up lists for preventive screening camps.",
    proposedSolution:
      "A simple follow-up planner for screening camps, reminders, and visit outcomes.",
    status: "Draft",
    submittedOn: "-",
    summary: "Follow-up planner for preventive healthcare camps.",
    teamMembers: [],
    title: "Care Follow-up Planner",
  },
  {
    applicant: {
      district: "Kolkata",
      email: "sanjoy@example.com",
      instituteType: "Startup",
      mobile: "+91 98765 43210",
      name: "Sanjoy Chowdhury",
      participantCategory: "Open",
      state: "West Bengal",
    },
    applicationNumber: "SFIC-2026-0008",
    challengeCategory: "Urban & Civic Innovation",
    createdOn: "2026-09-16",
    documents: [{ fileName: "civic-reporting-flow.pdf", fileSize: "760 KB", type: "Workflow" }],
    expectedImpact:
      "Improve civic issue visibility and response coordination for urban wards.",
    participation: "Team",
    problemStatement:
      "Urban residents need a clearer channel for reporting and following civic issues.",
    proposedSolution:
      "A ward-level reporting interface with status updates and escalation markers.",
    status: "Submitted",
    submittedOn: "2026-09-16",
    summary: "Ward-level civic issue reporting and tracking.",
    teamMembers: [
      { email: "sanjoy@example.com", mobile: "+91 98765 43210", name: "Sanjoy Chowdhury", role: "Team Lead" },
    ],
    title: "Ward Connect",
  },
  {
    applicant: {
      district: "Durgapur",
      email: "sanjoy@example.com",
      instituteType: "Community Group",
      mobile: "+91 98765 43210",
      name: "Sanjoy Chowdhury",
      participantCategory: "Open",
      state: "West Bengal",
    },
    applicationNumber: "SFIC-2026-0007",
    challengeCategory: "Environment & Sustainability",
    createdOn: "2026-09-15",
    documents: [{ fileName: "recycle-route-map.pdf", fileSize: "640 KB", type: "Plan" }],
    expectedImpact: "Increase source segregation and recycling pickup efficiency.",
    participation: "Individual",
    problemStatement:
      "Local recycling groups need better pickup planning and community participation.",
    proposedSolution:
      "A neighborhood route planner for waste collection, volunteer assignment, and pickup logs.",
    status: "Under Review",
    submittedOn: "2026-09-15",
    summary: "Neighborhood recycling route planner.",
    teamMembers: [],
    title: "Green Route Planner",
  },
];

export const statusStyles: Record<ApplicationStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "Not Shortlisted": "bg-red-50 text-red-600",
  Shortlisted: "bg-violet-50 text-violet-700",
  Submitted: "bg-emerald-50 text-emerald-700",
  "Under Review": "bg-amber-50 text-amber-700",
};

export function formatParticipantApplicationDate(value: string) {
  if (value === "-") return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getParticipantApplication(applicationNumber: string) {
  return participantApplications.find(
    (application) => application.applicationNumber === applicationNumber,
  );
}
