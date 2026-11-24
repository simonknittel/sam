import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toTemplateContainer } from "@/modules/events/utils/eventContainer";
import {
  BriefingTagPage,
  getBriefingTagPageMetadata,
} from "@/modules/wiki/components/BriefingTagPage";
import type { Metadata } from "next";

export const generateMetadata = async (
  props: PageProps<"/app/events/templates/[templateId]/briefing/tags/[tagId]">,
): Promise<Metadata> => {
  const { templateId, tagId } = await props.params;

  return getBriefingTagPageMetadata(toTemplateContainer(templateId), tagId);
};

export default async function Page(
  props: PageProps<"/app/events/templates/[templateId]/briefing/tags/[tagId]">,
) {
  await requireAuthenticationPage(
    "/app/events/templates/[templateId]/briefing/tags/[tagId]",
  );

  const { templateId, tagId } = await props.params;

  return (
    <SuspenseWithErrorBoundaryTile>
      <BriefingTagPage
        container={toTemplateContainer(templateId)}
        tagId={tagId}
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
