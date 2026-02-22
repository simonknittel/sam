import { requireAuthenticationPage } from "@/modules/auth/server";
import { Navigation } from "@/modules/events/components/Navigation";
import { getEventById } from "@/modules/events/queries";
import { notFound } from "next/navigation";

export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/events/[id]">) {
  const authentication = await requireAuthenticationPage("/app/events/[id]");
  await authentication.authorizePage("event", "read");

  const eventId = (await params).id;
  const event = await getEventById(eventId);
  if (!event) notFound();

  return (
    <>
      <p className="font-bold text-xl font-mono uppercase">
        <span className="text-neutral-500">Event //</span>{" "}
        <span>{event.name}</span>
      </p>

      <Navigation event={event} className="my-4" />

      {children}
    </>
  );
}
