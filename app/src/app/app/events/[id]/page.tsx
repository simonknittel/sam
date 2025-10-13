import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { OverviewTab } from "@/modules/events/components/OverviewTab";
import { Template } from "@/modules/events/components/Template";
import { getEventById } from "@/modules/events/queries";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const event = await getEventById((await props.params).id);
    if (!event) notFound();

    return {
      title: `${event.name} - Event`,
    };
  },
);

export default async function Page({ params }: PageProps<"/app/events/[id]">) {
  const authentication = await requireAuthenticationPage("/app/events/[id]");
  await authentication.authorizePage("event", "read");

  const event = await getEventById((await params).id);
  if (!event) notFound();

  return (
    <Template event={event}>
      <OverviewTab event={event} />
    </Template>
  );
}
