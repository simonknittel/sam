import type {
  Citizen,
  ConfirmationStatus,
} from "@sam-monorepo/database/client";
import type {
  MergedCursorEntry,
  MergedCursorSource,
} from "@sam-monorepo/domain";
import type { ReactNode } from "react";

export const ACTIVITY_PAGE_SIZE = 50;

export interface ActivityEntry extends MergedCursorEntry {
  /** Left out where nothing recorded it */
  readonly actor?: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
  /** Left out in contexts that already imply it */
  readonly target?: ReactNode;
  /** The label of the entry's type, as the activity type filter shows it. */
  readonly type?: string;
  readonly message: ReactNode;
  readonly comment?: string | null;
  /**
   * Only set by sources whose entries go through a confirmation workflow;
   * `null` there means "not confirmed yet".
   */
  readonly confirmation?: ConfirmationStatus | null;
  readonly confirmAction?: ReactNode;
}

export type ActivitySource = MergedCursorSource<ActivityEntry>;

export enum ActivityColumn {
  Actor = "actor",
  Target = "target",
  Type = "type",
  Confirmation = "confirmation",
}
