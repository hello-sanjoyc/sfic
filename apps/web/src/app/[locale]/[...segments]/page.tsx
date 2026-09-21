import { redirect } from "next/navigation";
import { PortalContent } from "@/components/public/pages/portal-content";

const sectionByRoute: Record<string, string> = {
  about: "#about",
  challenge: "#about",
  eligibility: "#participation",
  "how-to-participate": "#participation",
  themes: "#themes",
  "problem-statements": "#problem-statements",
  timeline: "#timeline",
  awards: "#awards",
  guidelines: "#guidelines",
  results: "#finale",
  faq: "#faq",
  contact: "#contact",
  "privacy-policy": "#policies",
  "terms-conditions": "#policies",
  "ip-policy": "#policies",
  accessibility: "#policies",
  disclaimer: "#policies",
};

export default async function PublicRoute({
  params,
}: {
  params: Promise<{ locale: string; segments: string[] }>;
}) {
  const { locale, segments } = await params;
  const [first] = segments;

  if (first === "login" || first === "register") {
    return <PortalContent locale={locale} segments={segments} />;
  }

  redirect(`/${locale}${sectionByRoute[first] ?? ""}`);
}
