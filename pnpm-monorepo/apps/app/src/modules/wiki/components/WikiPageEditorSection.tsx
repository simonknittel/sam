import { authenticate } from "@/modules/auth/server";
import type { WikiPageStaticContent } from "../queries/getWikiPageStaticContent";
import { getWikiCollabColor } from "../utils/getWikiCollabColor";
import { getWikiCollabUrl } from "../utils/getWikiCollabUrl";
import { WikiCollabEditor } from "./WikiCollabEditor";
import { WikiPageStaticContent as WikiPageStaticContentView } from "./WikiPageStaticContent";

interface Props {
  readonly pageId: string;
  readonly canEdit: boolean;
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  readonly staticContent: WikiPageStaticContent;
}

/**
 * A page's content area, shared by the global wiki page and the event wiki
 * page: the collab editor when the collab server is configured, the static
 * rendering otherwise (and as the editor's fallback while connecting).
 */
export const WikiPageEditorSection = async ({
  pageId,
  canEdit,
  canUploadImages,
  canUploadAttachments,
  staticContent,
}: Props) => {
  const collabUrl = getWikiCollabUrl();
  const staticFallback = (
    <WikiPageStaticContentView pageId={pageId} {...staticContent} />
  );
  if (!collabUrl) return staticFallback;

  const authentication = await authenticate();
  const session = authentication ? authentication.session : null;

  return (
    <WikiCollabEditor
      key={pageId}
      pageId={pageId}
      collabUrl={collabUrl}
      canEdit={canEdit}
      canUploadImages={canUploadImages}
      canUploadAttachments={canUploadAttachments}
      userName={session?.entity?.handle ?? "Unbekannt"}
      userColor={getWikiCollabColor(
        session?.entity?.id ?? session?.user.id ?? pageId,
      )}
      iframeAllowlist={staticContent.iframeAllowlist}
      linkablePages={staticContent.linkablePages}
      mentionedCitizens={staticContent.mentionedCitizens}
      linkedVariants={staticContent.linkedVariants}
      pageIndexes={staticContent.pageIndexes}
      roleCitizens={staticContent.roleCitizens}
      imageDimensions={staticContent.imageDimensions}
      staticFallback={staticFallback}
    />
  );
};
