import { getApplicationContext, toActor } from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  exportWikiPageContent,
  exportWikiPageContentInputSchema,
  NotFoundError,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";

/** A missing permission gives a 404, like an unknown page */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/wiki/[pageId]/export">,
) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/wiki/[pageId]/export",
      "GET",
    );

    const { pageId } = await context.params;
    const input = exportWikiPageContentInputSchema.parse({ page_id: pageId });

    const result = await exportWikiPageContent(
      getApplicationContext(),
      await toActor(authentication.session),
      input,
    );

    return new NextResponse(JSON.stringify(result.content, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${result.slug}.json`)}`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return apiErrorHandler(error);
  }
}
