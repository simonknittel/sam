import type { EventContainer } from "@/modules/events/utils/eventContainer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventWikiContext } from "../queries/getEventWikiContext";
import { getWikiTagPages } from "../queries/getWikiTagPages";
import { WikiTagPageContent } from "./WikiTagPageContent";

/** Null for a hidden briefing, see `findWikiTagPages()` */
const getBriefingTagPages = async (
  container: EventContainer,
  tagId: string,
) => {
  const context = await getEventWikiContext(container);
  if (!context) return null;

  return getWikiTagPages(context, tagId);
};

/**
 * The metadata runs without the 404 gate of the layout. The gate of the
 * briefing keeps the name of the tag out of the title of the document for
 * the viewers that the layout refuses.
 */
export const getBriefingTagPageMetadata = async (
  container: EventContainer,
  tagId: string,
): Promise<Metadata> => {
  const tagPages = await getBriefingTagPages(container, tagId);
  if (!tagPages) return {};

  return { title: `Tag: ${tagPages.name}` };
};

interface Props {
  readonly container: EventContainer;
  readonly tagId: string;
}

export const BriefingTagPage = async ({ container, tagId }: Props) => {
  const tagPages = await getBriefingTagPages(container, tagId);
  if (!tagPages) notFound();

  return <WikiTagPageContent tagName={tagPages.name} pages={tagPages.pages} />;
};
