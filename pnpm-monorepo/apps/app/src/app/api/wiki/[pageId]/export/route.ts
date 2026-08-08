import { prisma } from "@/db";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { getWikiPageScopedContext } from "@/modules/wiki/queries/getWikiPageScopedContext";
import { WikiScope } from "@/modules/wiki/utils/wikiPageHref";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = Promise<{
  pageId: string;
}>;

const paramsSchema = z.object({ pageId: z.cuid2() });

/**
 * Serves a page's raw Tiptap JSON as a download — the counterpart of the
 * JSON import. Wiki admins for the global wiki, event managers for event
 * pages. Read-only, no audit event, and deliberately not frozen: exporting
 * an archived briefing stays possible.
 */
export async function GET(_request: Request, props: { params: Params }) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/wiki/[pageId]/export",
      "GET",
    );

    const paramsData = paramsSchema.parse(await props.params);

    /**
     * 404 instead of 403 for missing permissions, matching the wiki's
     * existence-leak semantics.
     */
    const scoped = await getWikiPageScopedContext(paramsData.pageId);
    const page = scoped?.context.pagesById.get(paramsData.pageId);
    if (!scoped || !page || page.deletedAt)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const allowed =
      scoped.scope === WikiScope.Event
        ? scoped.context.permissions.get(page.id)?.canAdmin === true
        : await authentication.authorize("wiki", "manage");
    if (!allowed)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const pageContent = await prisma.wikiPage.findUnique({
      where: { id: page.id },
      select: { content: true },
    });

    const content = pageContent?.content ?? { type: "doc", content: [] };

    return new NextResponse(JSON.stringify(content, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${page.slug}.json`)}`,
      },
    });
  } catch (error) {
    return apiErrorHandler(error);
  }
}
