import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { buildVisibleWikiTree } from "@/modules/wiki/utils/buildVisibleWikiTree";
import { forbidden } from "next/navigation";
import { FaSitemap } from "react-icons/fa";

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/wiki");
  await authentication.authorizePage("wiki", "read");

  return (
    <SidebarLayout
      sidebar={<WikiSidebar />}
      mobileToggleLabel="Seiten"
      mobileToggleIcon={<FaSitemap />}
      sidebarWidthClassName="md:w-80"
    >
      <SuspenseWithErrorBoundaryTile>
        <Landing />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}

const Landing = async () => {
  const context = await getWikiContext();
  if (!context) forbidden();

  const tree = buildVisibleWikiTree(context.pages, context.permissions);

  return (
    <section className="bg-secondary rounded-primary p-4 lg:p-8">
      <h1 className="font-bold text-xl">Wiki</h1>

      {tree.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {tree.map((node) => (
            <li key={node.id}>
              <Link
                href={`/app/wiki/${node.id}/${node.slug}`}
                className="text-interaction-500 hover:text-interaction-300"
              >
                {node.title}
              </Link>
              {node.children.length > 0 && (
                <span className="ml-2 text-sm text-neutral-500">
                  {node.children.length} Unterseite(n)
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-neutral-400">
          Es gibt noch keine für dich sichtbaren Seiten.
        </p>
      )}
    </section>
  );
};
