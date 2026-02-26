import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import {
  createLoader,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getEvents } from "../queries";
import { Event } from "./Event";

const loadSearchParams = createLoader({
  status: parseAsString.withDefault("open"),
  participating: parseAsStringLiteral(["all", "me"]).withDefault("all"),
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const EventsTile = async ({ className, searchParams }: Props) => {
  const { status, participating, cursor, direction } =
    await loadSearchParams(searchParams);

  const { events, nextCursor, prevCursor } = await getEvents(
    status,
    participating,
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
    <section className={clsx("flex flex-col gap-[1px]", className)}>
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
