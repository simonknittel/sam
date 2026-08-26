import { requireAuthenticationPage } from "@/modules/auth/server";
import { Day } from "@/modules/changelog/components/Day";
import { DayItem } from "@/modules/changelog/components/DayItem";
import { Navigation } from "@/modules/changelog/components/Navigation";
import { getChangelogEntriesByQuarter } from "@/modules/changelog/queries/getChangelogEntriesByQuarter";
import { getUnseenChangelogEntryKeys } from "@/modules/changelog/queries/getUnseenChangelogEntryKeys";
import { notFound } from "next/navigation";

function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const existing = map.get(item.date);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.date, [item]);
    }
  }
  return map;
}

export default async function Page({
  params,
}: PageProps<"/app/changelog/[quarter]">) {
  await requireAuthenticationPage("/app/changelog/[quarter]");

  const { quarter } = await params;

  const quarterEntries = await getChangelogEntriesByQuarter(quarter);
  if (quarterEntries.length === 0) notFound();

  const unseenKeys = await getUnseenChangelogEntryKeys();

  const grouped = groupByDate(quarterEntries);
  const dates = [...grouped.keys()].toSorted(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <Navigation activeQuarterSlug={quarter} />

      {dates.map((date) => {
        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        return (
          <Day
            key={date}
            heading={parsedDate.toLocaleDateString("de-DE", {
              timeZone: "Europe/Berlin",
              month: "long",
              day: "numeric",
            })}
          >
            {grouped.get(date)!.map((entry) => (
              <DayItem
                key={entry.key}
                entry={entry}
                isUnseen={unseenKeys.has(entry.key)}
              />
            ))}
          </Day>
        );
      })}
    </div>
  );
}
