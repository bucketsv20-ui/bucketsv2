import { Suspense } from "react";
import AdminClientPage from "./AdminClientPage";
import NotAuthorized from "@/src/components/NotAuthorized";
import { requireRole } from "@/src/lib/auth/requireRole";

function CheckingAccess() {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Checking access…
    </div>
  );
}

async function AdminGate() {
  const result = await requireRole(["admin", "owner"]);

  if (!result.allowed) {
    return <NotAuthorized reason={result.reason} />;
  }

  return <AdminClientPage />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<CheckingAccess />}>
      <AdminGate />
    </Suspense>
  );
}
