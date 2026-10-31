import { Suspense } from "react";
import { ParticipantResetPasswordPage } from "@/components/public/pages/participant-reset-password";

export default function Page() {
  return (
    <Suspense>
      <ParticipantResetPasswordPage />
    </Suspense>
  );
}
