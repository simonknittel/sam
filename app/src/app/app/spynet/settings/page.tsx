import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { log } from "@/modules/logging";
import ClassificationLevelsTile from "@/modules/spynet/components/classification-level/ClassificationLevelsTile";
import NoteTypesTile from "@/modules/spynet/components/note-type/NoteTypesTile";
import { type Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/settings",
  );
  const [showNoteTypes, showClassificationLevels] = await Promise.all([
    authentication.authorize("noteType", "manage"),
    authentication.authorize("classificationLevel", "manage"),
  ]);

  if (!showNoteTypes && !showClassificationLevels) {
    void log.info("Forbidden request to page", {
      userId: authentication.session.user.id,
      reason: "Insufficient permissions",
    });

    redirect("/");
  }

  return (
    <MaxWidthContent className="flex flex-col gap-2">
      {showNoteTypes && <NoteTypesTile />}
      {showClassificationLevels && <ClassificationLevelsTile />}
    </MaxWidthContent>
  );
}
