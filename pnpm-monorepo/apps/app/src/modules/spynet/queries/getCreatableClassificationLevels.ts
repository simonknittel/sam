import { getRequestActor } from "@/modules/application";
import { filterCreatableClassificationLevels } from "@sam-monorepo/application";
import { getAllClassificationLevels } from "./getAllClassificationLevels";

export const getCreatableClassificationLevels = async (noteTypeId: string) =>
  filterCreatableClassificationLevels(
    await getRequestActor(),
    await getAllClassificationLevels(),
    noteTypeId,
  );
