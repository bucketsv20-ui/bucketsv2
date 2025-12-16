import { Suspense } from "react";
import CurrentSeasonClientPage from "./CurrentSeasonClientPage";
import NotAuthorized from "@/src/components/NotAuthorized";
import { requireRole } from "@/src/lib/auth/requireRole";


function CheckingAccess() {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Checking access…
    </div>
  );
}

async function Authed() {
  const result = await requireRole(["admin", "owner"]);

  if (!result.allowed) {
    return <NotAuthorized reason={result.reason} />;
  }

  if (!result.user) {
    return <NotAuthorized reason="missing_profile" />;
  }

  return <CurrentSeasonClientPage />;
}

export default function CurrentSeasonPage() {
  return (
    <Suspense fallback={<CheckingAccess />}>
      <Authed />
    </Suspense>
  );
}
