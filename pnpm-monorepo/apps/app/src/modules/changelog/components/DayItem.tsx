import { authenticate } from "@/modules/auth/server";
import type { ChangelogEntry } from "../types";
import { DayItemContainer } from "./DayItemContainer";
import { RedactedDayItemContent } from "./RedactedDayItemContent";

interface Props {
  readonly entry: ChangelogEntry;
  readonly isUnseen?: boolean;
}

export const DayItem = async ({ entry, isUnseen = false }: Props) => {
  const isTracked = entry.isTracked === true;

  if (entry.requiresAuth) {
    const authentication = await authenticate();
    const authorized =
      authentication &&
      (await authentication.authorize(
        entry.requiresAuth.resource,
        entry.requiresAuth.action,
      ));

    if (!authorized)
      return (
        <DayItemContainer
          entryKey={entry.key}
          isTracked={isTracked}
          isUnseenOnServer={isUnseen}
          isRedacted
          title="Lorem ipsum"
        >
          <RedactedDayItemContent />
        </DayItemContainer>
      );
  }

  return (
    <DayItemContainer
      entryKey={entry.key}
      isTracked={isTracked}
      isUnseenOnServer={isUnseen}
      title={entry.title}
      tags={entry.tags}
    >
      {entry.body()}
    </DayItemContainer>
  );
};
