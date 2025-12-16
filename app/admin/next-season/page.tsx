import NextSeasonClientPage from "./NextSeasonClientPage";
import NotAuthorized from "@/src/components/NotAuthorized";
import { requireRole } from "@/src/lib/auth/requireRole";

export default async function NextSeasonPage() {
  const result = await requireRole(["admin", "owner"]);

  if (!result.allowed || !result.user) {
    return <NotAuthorized reason={result.reason} />;
  }

  return <NextSeasonClientPage userId={result.user.id} />;
}
