import { requireAuthenticationPage } from "@/modules/auth/server";
import { Navigation } from "@/modules/events/components/Navigation";
import { getEventById } from "@/modules/events/queries/getEventById";
import { MarkAsReadOnMount } from "@/modules/read-markers/components/MarkAsReadOnMount";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
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
      <p className="font-mono text-xl font-bold uppercase">
        <span className="text-neutral-500">Event //</span>{" "}
        <span>{event.name}</span>
      </p>

      <Navigation event={event} className="my-4" />

      {children}

      {/* In the layout, thus each page of the event marks it as read */}
      <MarkAsReadOnMount
        subject={ReadMarkerSubject.Event}
        subjectId={event.id}
      />
    </>
  );
}
