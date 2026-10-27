import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { DeleteRoleTag } from "@/modules/roles/components/tags/DeleteRoleTag";
import { RoleTagIconTile } from "@/modules/roles/components/tags/RoleTagIconTile";
import { UpdateRoleTagForm } from "@/modules/roles/components/tags/UpdateRoleTagForm";
import { getRoles } from "@/modules/roles/queries/getRoles";
import { getManagedRoleTag } from "@/modules/roles/queries/getRoleTags";
import { notFound } from "next/navigation";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/iam/tags/[tagId]">) => {
    const authentication = await requireAuthenticationPage(
      "/app/iam/tags/[tagId]",
    );
    await authentication.authorizePage("role", "manage");

    const tag = await getManagedRoleTag((await props.params).tagId);
    if (!tag) notFound();

    return { title: tag.name };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/iam/tags/[tagId]">) {
  const authentication = await requireAuthenticationPage(
    "/app/iam/tags/[tagId]",
  );
  await authentication.authorizePage("role", "manage");

  const [tag, roles] = await Promise.all([
    getManagedRoleTag((await params).tagId),
    getRoles(),
  ]);
  if (!tag) notFound();

  return (
    <MaxWidthContent>
      <div className="flex gap-2 text-xl font-bold">
        <Link
          href="/app/iam/tags"
          className="rounded-secondary text-neutral-500 outline-offset-2 outline-interaction-700 hover:text-neutral-300 focus-visible:text-neutral-300 focus-visible:outline-2 active:text-neutral-400"
        >
          Tags
        </Link>

        <span className="text-neutral-500">/</span>

        <p className="truncate" title={tag.name}>
          {tag.name}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <UpdateRoleTagForm
          tag={{
            id: tag.id,
            name: tag.name,
            description: tag.description,
            roleIds: tag.roleIds,
          }}
          roles={roles.map((role) => ({
            id: role.id,
            name: role.name,
            icon: role.icon,
          }))}
        />

        <RoleTagIconTile tag={tag} />

        <DeleteRoleTag tag={tag} />
      </div>
    </MaxWidthContent>
  );
}
