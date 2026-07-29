import { authenticate } from "@/modules/auth/server";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { CreateWikiPageButton } from "@/modules/wiki/components/CreateWikiPageButton";
import { CreateWikiPageProvider } from "@/modules/wiki/components/CreateWikiPageProvider";
import { getOpenWikiReportCount } from "@/modules/wiki/queries/getOpenWikiReportCount";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getEditableWikiPageTargets } from "@/modules/wiki/utils/getEditableWikiPageTargets";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Wiki",
    default: "Wiki",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/wiki">) {
  const [context, authentication] = await Promise.all([
    getWikiContext(),
    authenticate(),
  ]);

  const [allowTopLevel, hasWikiManage] = await Promise.all([
    authentication
      ? authentication.authorize("wiki", "create")
      : Promise.resolve(false),
    authentication
      ? authentication.authorize("wiki", "manage")
      : Promise.resolve(false),
  ]);
  const targets = context ? getEditableWikiPageTargets(context) : [];
  const showCta = allowTopLevel || targets.length > 0;
  const openWikiReportCount = hasWikiManage
    ? await getOpenWikiReportCount()
    : 0;

  return (
    <CreateWikiPageProvider targets={targets} allowTopLevel={allowTopLevel}>
      <DefaultLayout
        title="Wiki"
        slug="wiki"
        pages={[
          { title: "Startseite", url: "/app/wiki" },
          { title: "Papierkorb", url: "/app/wiki/trash" },
          ...(hasWikiManage
            ? [
                {
                  title:
                    openWikiReportCount > 0
                      ? `Meldungen (${openWikiReportCount})`
                      : "Meldungen",
                  url: "/app/wiki/reports",
                },
                { title: "Einstellungen", url: "/app/wiki/settings" },
              ]
            : []),
        ]}
        cta={showCta ? <CreateWikiPageButton /> : undefined}
      >
        <MaxWidthContent>{children}</MaxWidthContent>
      </DefaultLayout>
    </CreateWikiPageProvider>
  );
}
