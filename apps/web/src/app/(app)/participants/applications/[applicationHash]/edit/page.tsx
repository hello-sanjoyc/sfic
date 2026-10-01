"use client";

import { useParams } from "next/navigation";
import { ParticipantApplicationFormPage } from "@/components/participant/applications/participant-application-form-page";

export default function Page() {
    const params = useParams<{ applicationHash: string }>();

    return (
        <ParticipantApplicationFormPage
            applicationHash={params.applicationHash}
            mode="edit"
        />
    );
}
