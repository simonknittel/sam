import { requireAuthenticationPage } from "@/modules/auth/server";
import { getAllFlows } from "@/modules/career/queries";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { PermissionsTab } from "@/modules/roles/components/PermissionsTab";
import { getRoleById, getRoles } from "@/modules/roles/queries";
import {
  getAllClassificationLevels,
  getAllNoteTypes,
} from "@/modules/spynet/queries";
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

  const [
    allRoles,
    noteTypes,
    classificationLevels,
    flows,
    enableOperations,
    EnableProfitDistribution,
  ] = await Promise.all([
    getRoles(true),
    getAllNoteTypes(),
    getAllClassificationLevels(),
    getAllFlows(),
    getUnleashFlag(UNLEASH_FLAG.EnableOperations),
    getUnleashFlag(UNLEASH_FLAG.EnableProfitDistribution),
  ]);

  return (
    <PermissionsTab
      role={role}
      allRoles={allRoles}
      noteTypes={noteTypes}
      classificationLevels={classificationLevels}
      enableOperations={Boolean(enableOperations)}
      flows={flows}
      enableProfitDistribution={Boolean(EnableProfitDistribution)}
    />
  );
}
