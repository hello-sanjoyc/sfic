"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { ParticipantShell } from "@/components/participant/common/participant-shell";

type ParticipantRole = "applicant" | "team_member";

function decodeParticipantRole(token: string): ParticipantRole | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const parsed = JSON.parse(atob(padded)) as {
      exp?: number;
      role?: ParticipantRole;
    };

    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed.role === "applicant" || parsed.role === "team_member"
      ? parsed.role
      : null;
  } catch {
    return null;
  }
}

export default function Page() {
  const params = useParams<{ applicationHash: string }>();
  const [participantRole, setParticipantRole] = useState<ParticipantRole | null>(
    null,
  );
  const [isRoleChecked, setIsRoleChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";
    setParticipantRole(decodeParticipantRole(token));
    setIsRoleChecked(true);
  }, []);

  const isTeamMember = participantRole === "team_member";

  return (
    <ParticipantShell
      eyebrow="Seva First Innovation Challenge - Eastern Region"
      title="Edit Application"
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
          href={`/participants/applications/${params.applicationHash}`}
        >
          <ArrowLeft size={18} />
          Back to Application Details
        </Link>
        {isRoleChecked && isTeamMember && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Team members can view and download the application, but only the
            applicant can edit it.
          </div>
        )}
      </div>
    </ParticipantShell>
  );
}
