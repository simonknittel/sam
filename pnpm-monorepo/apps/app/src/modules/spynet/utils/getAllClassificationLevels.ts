import { requireAuthentication } from "@/modules/auth/server";
import isAllowedToCreate from "@/modules/citizen/components/notes/lib/isAllowedToCreate";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import type { NoteType } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getCreatableClassificationLevelsDeduped = cache(
  async (noteTypeId: NoteType["id"]) => {
    const [authentication, allClassificationLevels] = await Promise.all([
      requireAuthentication(),
      getAllClassificationLevels(),
    ]);

    const filteredClassificationLevels = (
      await Promise.all(
        allClassificationLevels.map(async (classificationLevel) => {
          return {
            classificationLevel,
            include: await isAllowedToCreate(
              classificationLevel.id,
              authentication,
              noteTypeId,
            ),
          };
        }),
      )
    )
      .filter(({ include }) => include)
      .map(({ classificationLevel }) => classificationLevel);

    return filteredClassificationLevels;
  },
);
