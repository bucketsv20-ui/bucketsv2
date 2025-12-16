import AdminClientPage from "./AdminClientPage";
import NotAuthorized from "@/src/components/NotAuthorized";
import { requireRole } from "@/src/lib/auth/requireRole";

export default async function AdminPage() {
  const result = await requireRole(["admin", "owner"]);

  if (!result.allowed) {
    return <NotAuthorized reason={result.reason} />;
  }

  return <AdminClientPage />;
}
