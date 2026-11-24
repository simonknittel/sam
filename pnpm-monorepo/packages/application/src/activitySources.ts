import type { MergedCursorSourceInput } from "@sam-monorepo/domain";

export interface ActivitySourceInput extends MergedCursorSourceInput {
  readonly sourceKey: string;
  /** Null or nothing: all citizens */
  readonly actorIds?: readonly string[] | null;
  readonly createdAt?: { readonly gte?: Date; readonly lt?: Date };
}

/** `actorColumn` is the column of the citizen who caused the entry */
export const toActivityFilterWhere = <ActorColumn extends string>(
  { actorIds, createdAt }: Pick<ActivitySourceInput, "actorIds" | "createdAt">,
  actorColumn: ActorColumn,
) => ({
  ...(actorIds
    ? /** A computed key of a type parameter widens to `string` without it */
      ({ [actorColumn]: { in: [...actorIds] } } as Record<
        ActorColumn,
        { in: string[] }
      >)
    : {}),
  ...(createdAt && Object.keys(createdAt).length > 0 ? { createdAt } : {}),
});
