import { Suspense } from "react";
import NextSeasonClientPage from "./NextSeasonClientPage";
import NotAuthorized from "@/src/components/NotAuthorized";
import { requireRole } from "@/src/lib/auth/requireRole";

function CheckingAccess() {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Checking access…
    </div>
  );
}

async function NextSeasonGate() {
  const result = await requireRole(["admin", "owner"]);

  if (!result.allowed) {
    return <NotAuthorized reason={result.reason} />;
  }

  if (!result.user) {
    return <NotAuthorized reason="missing_profile" />;
  }

  return <NextSeasonClientPage userId={result.user.id} />;
}

export default function NextSeasonPage() {
  return (
    <Suspense fallback={<CheckingAccess />}>
      <NextSeasonGate />
    </Suspense>
  );
}
