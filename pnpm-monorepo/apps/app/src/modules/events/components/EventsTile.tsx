import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import clsx from "clsx";
import { parseAsStringLiteral, type SearchParams } from "nuqs/server";
import { getEvents } from "../queries/getEvents";
import { Event } from "./Event";

const loadSearchParams = createCursorPaginationLoader({
  status: parseAsStringLiteral(["open", "closed", "all"]).withDefault("open"),
  participating: parseAsStringLiteral(["all", "me"]).withDefault("all"),
  type: parseAsStringLiteral(["all", "app", "discord"]).withDefault("all"),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const EventsTile = async ({ className, searchParams }: Props) => {
  const { status, participating, type, cursor, direction } =
    await loadSearchParams(searchParams);

  const { events, nextCursor, prevCursor } = await getEvents(
    status,
    participating,
    type,
    cursor,
    direction,
  );

  if (events.length <= 0)
    return (
      <section className={clsx(className)}>
        <div className="rounded-primary bg-neutral-800/50 p-4 flex flex-col items-center gap-4">
          <p>Keine Events gefunden</p>
        </div>
      </section>
    );

  return (
    <section className={clsx("flex flex-col gap-px", className)}>
      {events.map((event, index) => (
        <Event key={event.id} event={event} index={index} />
      ))}

      <CursorPaginationControls
        nextCursor={nextCursor}
        prevCursor={prevCursor}
        className="mt-4"
      />
    </section>
  );
};
