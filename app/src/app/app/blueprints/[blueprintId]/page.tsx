import { requireAuthenticationPage } from "@/modules/auth/server";
import { BlueprintCitizensTile } from "@/modules/blueprints/components/BlueprintCitizensTile";
import { BlueprintDetailCard } from "@/modules/blueprints/components/BlueprintDetailCard";
import { getBlueprintDetail } from "@/modules/blueprints/queries/getBlueprintDetail";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/app/blueprints/[blueprintId]">): Promise<Metadata> {
  const blueprint = await getBlueprintDetail((await params).blueprintId);
  if (!blueprint) notFound();

  return {
    title: blueprint.itemName,
  };
}

export default async function Page({
  params,
}: PageProps<"/app/blueprints/[blueprintId]">) {
  const authentication = await requireAuthenticationPage(
    "/app/blueprints/[blueprintId]",
  );
  await authentication.authorizePage("blueprint", "read");

  const blueprintId = (await params).blueprintId;
  const blueprint = await getBlueprintDetail(blueprintId);
  if (!blueprint) notFound();

  return (
    <div className="flex flex-col gap-0.5">
      <BlueprintDetailCard blueprint={blueprint} />

      <BlueprintCitizensTile blueprintId={blueprintId} className="mt-2" />
    </div>
  );
}
