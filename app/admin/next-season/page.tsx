import NextSeasonClientPage from "./NextSeasonClientPage";
import NotAuthorized from "@/src/components/NotAuthorized";
import { requireRole } from "@/src/lib/auth/requireRole";

export default async function NextSeasonPage() {
  const result = await requireRole(["admin", "owner"]);

  if (!result.allowed) {
    return <NotAuthorized reason={result.reason} />;
  }

  if (!result.user) {
    return <NotAuthorized reason="missing_profile" />;
  }

  return <NextSeasonClientPage userId={result.user.id} />;
}
