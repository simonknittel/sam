import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import {
  BriefingTagPage,
  getBriefingTagPageMetadata,
} from "@/modules/wiki/components/BriefingTagPage";
import type { Metadata } from "next";

export const generateMetadata = async (
  props: PageProps<"/app/events/[id]/briefing/tags/[tagId]">,
): Promise<Metadata> => {
  const { id, tagId } = await props.params;

  return getBriefingTagPageMetadata(toEventContainer(id), tagId);
};

export default async function Page(
  props: PageProps<"/app/events/[id]/briefing/tags/[tagId]">,
) {
  await requireAuthenticationPage("/app/events/[id]/briefing/tags/[tagId]");

  const { id, tagId } = await props.params;

  return (
    <SuspenseWithErrorBoundaryTile>
      <BriefingTagPage container={toEventContainer(id)} tagId={tagId} />
    </SuspenseWithErrorBoundaryTile>
  );
}
