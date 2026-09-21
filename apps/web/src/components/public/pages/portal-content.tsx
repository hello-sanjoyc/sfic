import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  FileText,
  Lightbulb,
  Newspaper,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  announcements,
  faqs,
  problemStatements,
  themes,
  timeline,
} from "@/mocks/public";
import { getSiteContent } from "@/content";
import { FAQAccordion } from "../common/faq-accordion";
import { PageHero } from "../common/page-hero";
import { SectionHeading } from "../common/section-heading";
import { RegisterPageBody } from "./register-page-body";

type PageDefinition = {
  title: string;
  intro: string;
  sections: [string, ReactNode][];
};
type LocalizedRegisterSection = {
  heading: string;
  body: string;
  steps?: {
    title: string;
    body: string;
    bullets?: string[];
  }[];
};
const pages: Record<string, PageDefinition> = {
  about: {
    title: "About the Challenge",
    intro:
      "A national platform that connects science and technology talent with consequential public problems.",
    sections: [
      [
        "Vision",
        "To make research and innovation more responsive to the everyday needs of people, communities and public systems.",
      ],
      [
        "Mission",
        "To identify promising ideas, support rigorous evaluation and connect solutions with opportunities for real-world adoption.",
      ],
      [
        "Expected outcomes",
        "Stronger collaboration across disciplines, more practical prototypes and a visible pathway from insight to impact.",
      ],
    ],
  },
  challenge: {
    title: "The Challenge",
    intro:
      "A structured innovation journey designed for ambitious, feasible and socially valuable solutions.",
    sections: [
      [
        "Challenge overview",
        "Participants select a published problem statement or approved priority area and develop a clear solution approach.",
      ],
      [
        "Evaluation stages",
        "Screening, technical evaluation and final presentation focus on relevance, innovation, feasibility and potential impact.",
      ],
      [
        "Focus areas",
        "Challenge themes span village services, agriculture, education, healthcare, civic innovation, sustainability, livelihoods, safety, mobility, energy, tourism and culture.",
      ],
    ],
  },
  eligibility: {
    title: "Eligibility",
    intro:
      "The challenge welcomes people and institutions working at the intersection of science, technology and public impact.",
    sections: [
      [
        "Who can apply",
        "Students, researchers, faculty, startups, MSMEs, individual innovators and eligible institutions may participate.",
      ],
      [
        "Team rules",
        "Teams may be interdisciplinary and inter-institutional. A designated lead applicant is required for each submission.",
      ],
      [
        "Supporting documents",
        "Applicants should keep identity, institution and relevant project documentation ready before final submission.",
      ],
    ],
  },
  "how-to-participate": {
    title: "How to Participate",
    intro:
      "Follow a clear sequence from registration to submitting a complete innovation proposal.",
    sections: [
      [
        "1. Create your account",
        "Register with a valid email address and complete the verification process.",
      ],
      [
        "2. Choose a challenge",
        "Review the themes, then select the opportunity best aligned to the real problem you want to solve.",
      ],
      [
        "3. Submit your innovation",
        "Prepare the required documents, validate your details and submit before the published deadline.",
      ],
    ],
  },
  guidelines: {
    title: "Guidelines",
    intro:
      "Important rules and reference material for a fair, transparent and high-quality challenge process.",
    sections: [
      [
        "General guidelines",
        "Entries must be original, complete and submitted through the official application process.",
      ],
      [
        "Intellectual property",
        "Applicants retain ownership of their work, subject to the challenge terms and permissions required for evaluation.",
      ],
      [
        "Code of conduct",
        "All participants, reviewers and partners are expected to engage respectfully and professionally.",
      ],
    ],
  },
  awards: {
    title: "Awards & Opportunities",
    intro:
      "Recognition combines financial awards with practical support for promising innovations.",
    sections: [
      [
        "Financial awards",
        "Winning entries are eligible for ₹5,00,000, ₹3,00,000 and ₹2,00,000 award categories, subject to final terms.",
      ],
      [
        "Support beyond awards",
        "Selected teams may receive mentoring, incubation guidance, research support and opportunities to explore pilots.",
      ],
      [
        "Special recognition",
        "The jury may recognise exceptional work in categories aligned to public value and scientific merit.",
      ],
    ],
  },
  results: {
    title: "Results",
    intro:
      "Explore published outcomes by challenge year, theme, round and award category.",
    sections: [
      [
        "Published results",
        "Official results are released only after the corresponding evaluation stage is complete.",
      ],
      [
        "How to search",
        "Use the available year, theme and award filters to find published innovation outcomes.",
      ],
      [
        "Transparency",
        "Scores are not displayed unless specifically enabled by the official results process.",
      ],
    ],
  },
  register: {
    title: "Start Your Registration",
    intro:
      "Prepare your basic details and take the first step towards submitting your innovation.",
    sections: [
      [
        "Who can register",
        "Eligible students, researchers, faculty, innovators, startups and institutions can begin an application.",
      ],
      [
        "What you will need",
        "Keep contact details, profile information, team details and relevant supporting documents ready.",
      ],
      [
        "Application process",
        <div className="mt-3 max-w-4xl leading-7 text-slate-600">
          <p>
            The registration and proposal submission process will be completed
            through the application portal in the following steps:
          </p>
          <ol className="mt-5 list-decimal space-y-3 pl-6">
            <li>
              <strong className="font-bold text-slate-900">Registration</strong>{" "}
              – Register using your Full Name, Email Address, and Mobile Number,
              then verify the 6 digit code sent to your email.
            </li>
            <li>
              <strong className="font-bold text-slate-900">
                Profile Completion
              </strong>{" "}
              – After successful verification, complete your profile by providing
              additional details such as Address, City, State, Country, and PIN
              Code.
            </li>
            <li>
              <strong className="font-bold text-slate-900">
                Proposal Submission
              </strong>{" "}
              – Submit your innovation proposal by providing:
              <ul className="mt-2 list-disc space-y-1 pl-7">
                <li>Category of the Registrant</li>
                <li>Theme</li>
                <li>Title of the Innovation</li>
                <li>Brief Description</li>
                <li>Supporting Documents</li>
              </ul>
            </li>
            <li>
              <strong className="font-bold text-slate-900">
                Application Number Generation
              </strong>{" "}
              – Upon successful submission of the proposal, a unique{" "}
              <strong className="font-bold text-slate-900">
                Application Number
              </strong>{" "}
              will be generated. The applicant will receive the Application
              Number on the confirmation webpage as well as through email.
            </li>
          </ol>
        </div>,
      ],
    ],
  },
  login: {
    title: "Application Portal Login",
    intro:
      "Choose the appropriate future application portal to continue your challenge journey.",
    sections: [
      [
        "Participant login",
        "For applicants, team leads and innovation submissions.",
      ],
      ["Expert login", "For invited reviewers and evaluators."],
      [
        "Institute and admin login",
        "For authorised institutional and programme administration users.",
      ],
    ],
  },
};
const labels: Record<string, string> = {
  themes: "Themes",
  "problem-statements": "Problem Statements",
  timeline: "Timeline",
  announcements: "Announcements",
  news: "News & Updates",
  "innovation-gallery": "Innovation Gallery",
  faq: "Frequently Asked Questions",
  contact: "Contact",
};

function StandardPage({
  page,
  locale,
}: {
  page: PageDefinition;
  locale: string;
}) {
  const content = getSiteContent(locale);
  const isRegisterPage = page === pages.register;
  const localizedPage =
    isRegisterPage
      ? content.pages.register
      : page === pages.login
        ? content.pages.login
        : page;
  const localizedRegisterCards = (sections: LocalizedRegisterSection[]) =>
    sections.map((section, index) => (
      <article
        className="rounded-xl border border-slate-200 bg-white p-6"
        key={section.heading}
      >
        <div
          className={`h-1 w-10 ${index % 2 ? "bg-[#138808]" : "bg-[#ff9933]"}`}
        />
        <h2 className="mt-5 text-2xl font-bold text-[#0b1f3a]">
          {section.heading}
        </h2>
        <div className="mt-3 max-w-4xl leading-7 text-slate-600">
          <p>{section.body}</p>
          {section.steps && (
            <ol className="mt-5 list-decimal space-y-3 pl-6">
              {section.steps.map((step) => (
                <li key={step.title}>
                  <strong className="font-bold text-slate-900">
                    {step.title}
                  </strong>{" "}
                  – {step.body}
                  {step.bullets && (
                    <ul className="mt-2 list-disc space-y-1 pl-7">
                      {step.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    ));
  const sectionCards = isRegisterPage
    ? localizedRegisterCards(content.pages.register.sections)
    : page.sections.map(([heading, text], index) => (
    <article
      className="rounded-xl border border-slate-200 bg-white p-6"
      key={heading}
    >
      <div
        className={`h-1 w-10 ${index % 2 ? "bg-[#138808]" : "bg-[#ff9933]"}`}
      />
      {typeof text === "string" ? (
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0b1f3a]">{heading}</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">{text}</p>
          </div>
          {page === pages.login && (index === 0 || index === 2) && (
            <Link
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080]"
              href={
                index === 0
                  ? `/${locale}/participants/login`
                  : `/${locale}/admin/login`
              }
            >
              {index === 0 ? "Open Participant Login" : "Open Admin Login"}
              <ArrowRight className="ml-2" size={16} />
            </Link>
          )}
        </div>
      ) : (
        <>
          <h2 className="mt-5 text-2xl font-bold text-[#0b1f3a]">{heading}</h2>
          {text}
        </>
      )}
    </article>
      ));

  return (
    <>
      <PageHero
        title={localizedPage.title}
        description={localizedPage.intro}
        locale={locale}
      />
      {isRegisterPage ? (
        <RegisterPageBody id="page-main-content">{sectionCards}</RegisterPageBody>
      ) : (
        <section
          className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
          id="page-main-content"
          tabIndex={-1}
        >
          <div className="grid gap-6">{sectionCards}</div>
        </section>
      )}
    </>
  );
}
function ThemesPage({ locale }: { locale: string }) {
  return (
    <>
      <PageHero
        title="Innovation Themes"
        description="Discover priority areas for science, technology and social innovation."
        locale={locale}
      />
      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6"
        id="page-main-content"
        tabIndex={-1}
      >
        <label className="mb-8 flex max-w-md items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
          <Search size={18} />
          <input
            className="w-full outline-none"
            placeholder="Search themes"
            aria-label="Search themes"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme, index) => {
            const Icon = theme.icon;
            return (
              <Link
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md"
                href={`/${locale}/themes/${theme.slug}`}
                key={theme.slug}
              >
                <Icon
                  className={index % 2 ? "text-[#138808]" : "text-[#ff9933]"}
                />
                <h2 className="mt-5 font-bold text-[#0b1f3a]">{theme.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {theme.description}
                </p>
                <p className="mt-4 text-xs font-bold text-slate-500">
                  {theme.count} possible areas
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
function ProblemsPage({ locale }: { locale: string }) {
  return (
    <>
      <PageHero
        title="Problem Statements"
        description="Find a defined challenge where your innovation can make a meaningful difference."
        locale={locale}
      />
      <section
        className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[260px_1fr]"
        id="page-main-content"
        tabIndex={-1}
      >
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-[#0b1f3a]">Filter results</h2>
          {["Search", "Theme", "Sub-theme", "Applicant category", "Status"].map(
            (label) => (
              <label className="mt-4 block text-sm font-medium" key={label}>
                {label}
                {label === "Search" ? (
                  <input className="mt-1 w-full rounded border border-slate-300 p-2" />
                ) : (
                  <select className="mt-1 w-full rounded border border-slate-300 bg-white p-2">
                    <option>All</option>
                  </select>
                )}
              </label>
            ),
          )}
        </aside>
        <div className="grid gap-4">
          {problemStatements.map((problem) => (
            <article
              className="rounded-xl border border-slate-200 bg-white p-6"
              key={problem.code}
            >
              <p className="font-mono text-xs font-bold text-[#000080]">
                {problem.code}
              </p>
              <p className="mt-2 text-xs font-bold text-[#138808]">
                {problem.theme}
              </p>
              <h2 className="mt-3 text-xl font-bold text-[#0b1f3a]">
                {problem.title}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {problem.description}
              </p>
              <p className="mt-4 text-sm">
                <strong>Expected outcome:</strong> {problem.outcome}
              </p>
              <Link
                className="mt-5 inline-flex items-center gap-1 font-bold text-[#000080]"
                href={`/${locale}/problem-statements/${problem.code.toLowerCase()}`}
              >
                View details <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
function TimelinePage({ locale }: { locale: string }) {
  return (
    <>
      <PageHero
        title="Challenge Timeline"
        description="Important milestones from announcement to results."
        locale={locale}
      />
      <section
        className="mx-auto max-w-4xl px-4 py-16 sm:px-6"
        id="page-main-content"
        tabIndex={-1}
      >
        {timeline.map(([date, stage, status], index) => (
          <article
            className="relative border-l-2 border-slate-200 pb-10 pl-8 last:pb-0"
            key={stage}
          >
            <span
              className={`absolute -left-[7px] top-1 size-3 rounded-full ${status === "Completed" ? "bg-[#138808]" : status === "Current" ? "bg-[#ff9933]" : "bg-[#0b1f3a]"}`}
            />
            <p className="font-semibold text-slate-500">{date}</p>
            <h2 className="mt-1 text-xl font-bold text-[#0b1f3a]">{stage}</h2>
            <p className="mt-2 text-slate-600">
              Status: <span className="font-semibold">{status}</span>. Full
              information will be published as the challenge progresses.
            </p>
          </article>
        ))}
      </section>
    </>
  );
}
function AnnouncementsPage({
  locale,
  kind,
}: {
  locale: string;
  kind: "announcements" | "news";
}) {
  const isNews = kind === "news";
  return (
    <>
      <PageHero
        title={isNews ? "News & Updates" : "Announcements"}
        description={
          isNews
            ? "Editorial updates from the innovation challenge and its wider ecosystem."
            : "Official notices, deadlines and information for applicants."
        }
        locale={locale}
      />
      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6"
        id="page-main-content"
        tabIndex={-1}
      >
        <div className="mb-8 flex flex-wrap gap-2">
          {["All", "Important", "Deadline", "Results", "General"].map(
            (filter) => (
              <button
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-[#0b1f3a]"
                key={filter}
              >
                {filter}
              </button>
            ),
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {announcements.map((item) => (
            <article
              className="rounded-xl border border-slate-200 bg-white p-5"
              key={item.title}
            >
              <span className="rounded bg-orange-50 px-2 py-1 text-xs font-bold text-orange-800">
                {isNews ? "Update" : item.type}
              </span>
              <p className="mt-4 text-sm text-slate-500">{item.date}</p>
              <h2 className="mt-2 font-bold text-[#0b1f3a]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.summary}
              </p>
              <Link
                className="mt-5 inline-block font-bold text-[#000080]"
                href={`/${locale}/${kind}/${item.title.toLowerCase().replaceAll(" ", "-")}`}
              >
                Read more
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
function FAQPage({ locale }: { locale: string }) {
  return (
    <>
      <PageHero
        title="Frequently Asked Questions"
        description="Find practical answers on registration, eligibility, teams and submissions."
        locale={locale}
      />
      <section
        className="mx-auto max-w-4xl px-4 py-16 sm:px-6"
        id="page-main-content"
        tabIndex={-1}
      >
        <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
          <Search size={18} />
          <input
            className="w-full outline-none"
            placeholder="Search frequently asked questions"
            aria-label="Search FAQs"
          />
        </label>
        <div className="mt-8">
          <FAQAccordion items={faqs} />
        </div>
      </section>
    </>
  );
}
function ContactPage({ locale }: { locale: string }) {
  return (
    <>
      <PageHero
        title="Contact"
        description="Get in touch with the challenge helpdesk for public portal and application guidance."
        locale={locale}
      />
      <section
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        id="page-main-content"
        tabIndex={-1}
      >
        <div>
          <SectionHeading
            eyebrow="HELPDESK"
            title="We are here to help"
            description="For technical support, eligibility queries and institutional guidance, use the details below."
          />
          <div className="mt-8 grid gap-4">
            <p className="rounded-lg border border-slate-200 p-4">
              <strong>Email</strong>
              <br />
              sficeast@gmail.com
            </p>
            <p className="rounded-lg border border-slate-200 p-4">
              <strong>Office</strong>
              <br />
              Vigyan Chetana Bhavan, 26/B, DD Block, Sector I, Salt Lake,
              Kolkata 700064
              <br />
              Landmark: City Centre I, Behind ILS Hospital
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
function ScreenReaderAccessPage({ locale }: { locale: string }) {
  const content = getSiteContent(locale).pages.screenReader;

  return (
    <>
      <PageHero
        title={content.title}
        description={content.intro}
        locale={locale}
      />
      <section
        className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
        id="page-main-content"
        tabIndex={-1}
      >
        <div className="grid gap-5">
          {content.sections.map((section, index) => (
            <article
              className="rounded-xl border border-slate-200 bg-white p-6"
              key={section.heading}
            >
              <span
                className={`block h-1 w-12 ${index % 2 ? "bg-[#138808]" : "bg-[#ff9933]"}`}
              />
              <h2 className="mt-5 text-2xl font-bold text-[#0b1f3a]">
                {section.heading}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">{section.body}</p>
              <ul className="mt-5 grid gap-2 pl-5 text-slate-700">
                {section.items.map((item) => (
                  <li className="list-disc leading-7" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
function DetailPage({
  locale,
  type,
  item,
}: {
  locale: string;
  type: string;
  item: string;
}) {
  const title =
    type === "themes"
      ? (themes.find((theme) => theme.slug === item)?.title ?? "Theme details")
      : (problemStatements.find(
          (problem) => problem.code.toLowerCase() === item,
        )?.title ?? "Problem statement details");
  return (
    <>
      <PageHero
        title={title}
        description={
          type === "themes"
            ? "Explore focus areas, related problem statements, eligibility and useful resources."
            : "Review the context, expected outcome, eligibility and key dates before you apply."
        }
        locale={locale}
      />
      <section
        className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_280px]"
        id="page-main-content"
        tabIndex={-1}
      >
        <article className="prose max-w-none">
          <h2>Overview</h2>
          <p>
            This public information page is prepared for applicants to
            understand the challenge scope and develop a relevant, feasible and
            impactful proposal.
          </p>
          <h2>Focus areas</h2>
          <p>
            Solutions should be evidence-led, technically appropriate and
            capable of progressing towards adoption or further validation.
          </p>
          <h2>Related resources</h2>
          <p>
            Read the programme guidelines and contact the helpdesk for
            clarification before submitting your application.
          </p>
        </article>
        <aside className="h-fit rounded-xl border border-slate-200 bg-[#f4f7fa] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Challenge status
          </p>
          <p className="mt-2 font-bold text-[#138808]">Registration open</p>
          <p className="mt-5 text-sm font-bold text-slate-500">Deadline</p>
          <p>30 September 2026</p>
          <Link
            className="mt-6 block rounded bg-[#ff9933] px-4 py-3 text-center font-bold text-[#071426]"
            href={`/${locale}/register`}
          >
            Register now
          </Link>
          <Link
            className="mt-3 block text-center text-sm font-bold text-[#000080]"
            href={`/${locale}/guidelines`}
          >
            Download guidelines
          </Link>
        </aside>
      </section>
    </>
  );
}
export function PortalContent({
  locale,
  segments,
}: {
  locale: string;
  segments: string[];
}) {
  const [first, second] = segments;
  if (second && ["themes", "problem-statements"].includes(first))
    return <DetailPage locale={locale} type={first} item={second} />;
  if (first === "themes") return <ThemesPage locale={locale} />;
  if (first === "problem-statements") return <ProblemsPage locale={locale} />;
  if (first === "timeline") return <TimelinePage locale={locale} />;
  if (["announcements", "news"].includes(first))
    return (
      <AnnouncementsPage
        locale={locale}
        kind={first as "announcements" | "news"}
      />
    );
  if (first === "faq") return <FAQPage locale={locale} />;
  if (first === "contact") return <ContactPage locale={locale} />;
  if (first === "screen-reader-access")
    return <ScreenReaderAccessPage locale={locale} />;
  const page = pages[first] ?? {
    title: labels[first] ?? "Public Portal",
    intro:
      "Information and resources for the Seva First Innovation Challenge.",
    sections: [
      [
        "Information",
        "Official information for this page will be published as the challenge progresses.",
      ],
      [
        "Stay informed",
        "Please refer to announcements and guidelines for the latest challenge information.",
      ],
    ],
  };
  return <StandardPage locale={locale} page={page} />;
}
