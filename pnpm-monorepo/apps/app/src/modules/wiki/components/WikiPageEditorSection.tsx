import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import type { WikiPageStaticContent } from "../queries/getWikiPageStaticContent";
import { getWikiCollabColor } from "../utils/getWikiCollabColor";
import { WikiCollabEditor } from "./WikiCollabEditor";
import { WikiPageStaticContent as WikiPageStaticContentView } from "./WikiPageStaticContent";

/**
 * Editing requires the collab server — without it (e.g. a preview
 * deployment missing the env vars) pages are read-only. Also used by the
 * page headers to decide whether to offer the edit-mode toggle.
 */
export const getWikiCollabUrl = () =>
  env.COLLAB_JWT_SECRET && env.NEXT_PUBLIC_COLLAB_URL
    ? env.NEXT_PUBLIC_COLLAB_URL
    : null;

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
