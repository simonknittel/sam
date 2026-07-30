import { requireAuthenticationPage } from "@/modules/auth/server";
import { getAllFlows } from "@/modules/career/queries/getAllFlows";
import { PermissionsTab } from "@/modules/roles/components/PermissionsTab";
import { getRoleById } from "@/modules/roles/queries/getRoleById";
import { getRoles } from "@/modules/roles/queries/getRoles";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Berechtigungen",
};

export default async function Page({
  params,
}: PageProps<"/app/roles/[id]/permissions">) {
  const authentication = await requireAuthenticationPage(
    "/app/roles/[id]/permissions",
  );
  await authentication.authorizePage("role", "manage");

  const roleId = (await params).id;
  const role = await getRoleById(roleId);
  if (!role) notFound();

  const [allRoles, noteTypes, classificationLevels, flows] = await Promise.all([
    getRoles(true),
    getAllNoteTypes(),
    getAllClassificationLevels(),
    getAllFlows(),
  ]);

  return (
    <PermissionsTab
      role={role}
      allRoles={allRoles}
      noteTypes={noteTypes}
      classificationLevels={classificationLevels}
      flows={flows}
    />
  );
}
