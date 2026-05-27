import { requireAuthenticationPage } from "@/modules/auth/server";
import { Day } from "@/modules/changelog/components/Day";
import { DayItem } from "@/modules/changelog/components/DayItem";
import { Navigation } from "@/modules/changelog/components/Navigation";
import { getChangelogEntriesByYear } from "@/modules/changelog/queries/getChangelogEntriesByYear";
import { updateUnseenChangelogEntries } from "@/modules/changelog/queries/updateUnseenChangelogEntries";
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
}: PageProps<"/app/changelog/[year]">) {
  await requireAuthenticationPage("/app/changelog/[year]");

  const { year } = await params;

  const yearEntries = await getChangelogEntriesByYear(year);
  if (yearEntries.length === 0) notFound();

  const unseenKeys = await updateUnseenChangelogEntries();

  const isUnseen = (key: string) => unseenKeys.has(key);

  const grouped = groupByDate(yearEntries);
  const dates = [...grouped.keys()].toSorted(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <Navigation activeYear={year} />

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
                isNew={entry.isTracked ? isUnseen(entry.key) : undefined}
              />
            ))}
          </Day>
        );
      })}
    </div>
  );
}
