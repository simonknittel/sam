import { requireAuthenticationPage } from "@/modules/auth/server";
import { EventTemplateNavigation } from "@/modules/event-templates/components/EventTemplateNavigation";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { notFound } from "next/navigation";

export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/events/templates/[templateId]">) {
  await requireAuthenticationPage("/app/events/templates/[templateId]");

  const { templateId } = await params;
  /** Invisible and nonexistent templates are indistinguishable */
  const context = await getEventTemplateById(templateId);
  if (!context) notFound();

  return (
    <>
      <p className="font-bold text-xl font-mono uppercase">
        <span className="text-neutral-500">Event-Vorlage //</span>{" "}
        <span>{context.template.name}</span>
      </p>

      <EventTemplateNavigation
        templateId={templateId}
        canManageShares={context.permissions.canManageShares}
        className="my-4"
      />

      {children}
    </>
  );
}
