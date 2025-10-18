import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { LineupTab } from "@/modules/events/components/LineupTab";
import { getEventById } from "@/modules/events/queries";
import { getEventCitizens } from "@/modules/events/utils/getEventCitizens";
import { isAllowedToManagePositions } from "@/modules/events/utils/isAllowedToManagePositions";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import { isLineupVisible } from "@/modules/events/utils/isLineupVisible";
import { getMyFleet } from "@/modules/fleet/queries";
import { forbidden, notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const event = await getEventById((await props.params).id);
    if (!event) notFound();

    return {
      title: `Aufstellung - ${event.name}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/events/[id]/lineup">) {
  const authentication = await requireAuthenticationPage("/app/events/[id]");
  if (!authentication.session.entity) forbidden();
  await authentication.authorizePage("event", "read");

  const eventId = (await params).id;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const showActions = isEventUpdatable(event);
  const showManagePositions =
    (await isAllowedToManagePositions(event)) && showActions;

  if (!(await isLineupVisible(event))) forbidden();

  const [variants, myShips, allEventCitizens] = await Promise.all([
    prisma.manufacturer.findMany({
      include: {
        image: true,
        series: {
          include: {
            variants: true,
          },
        },
      },
    }),

    getMyFleet(),

    getEventCitizens(event.id),
  ]);

  return (
    <LineupTab
      event={event}
      canManagePositions={showManagePositions}
      variants={variants}
      myShips={myShips}
      allEventCitizens={allEventCitizens}
      showActions={showActions}
    />
  );
}
