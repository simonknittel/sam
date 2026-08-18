import type {
  MergedCursorEntry,
  MergedCursorSource,
} from "@/modules/common/CursorPagination/mergedCursor";
import type { ConfirmationStatus, Entity } from "@sam-monorepo/database/client";
import type { ReactNode } from "react";

/** How many entries every activity surface shows per page. */
export const ACTIVITY_PAGE_SIZE = 50;

/**
 * One row of an activity table, whatever it was recorded as. Sources map
 * their rows into this shape; the table only knows this shape.
 */
export interface ActivityEntry extends MergedCursorEntry {
  /** Who caused the entry. Left out where nothing recorded it. */
  readonly actor?: Pick<Entity, "id" | "handle"> | null;
  /** Who or what the entry is about, in contexts that don't already imply it. */
  readonly target?: ReactNode;
  readonly message: ReactNode;
  /** Free text belonging to the entry, e.g. a participation comment. */
  readonly comment?: string | null;
  /**
   * Only set by sources whose entries go through a confirmation workflow;
   * `null` there means "not confirmed yet".
   */
  readonly confirmation?: ConfirmationStatus | null;
  /** The control offered on an unconfirmed entry, for those who may confirm. */
  readonly confirmAction?: ReactNode;
}

export type ActivitySource = MergedCursorSource<ActivityEntry>;

/** The columns a context can add to the always present date and activity. */
export enum ActivityColumn {
  Actor = "actor",
  Target = "target",
  Confirmation = "confirmation",
}
