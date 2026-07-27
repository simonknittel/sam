import { type Entity } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import type { GenericEntityLogType } from "@/types";
import { camelCase } from "change-case";
import { type ReactNode } from "react";
import { HistoryModal } from "./HistoryModal";

interface Props {
  type: GenericEntityLogType;
  icon?: ReactNode;
  name: string;
  entity: Entity;
}

export const OverviewSection = async ({
  type,
  icon,
  name,
  entity,
}: Readonly<Props>) => {
  const authentication = await requireAuthentication();
  const showCreate = await authentication.authorize(type, "create");
  const showDelete = await authentication.authorize(type, "delete");
  const showConfirm = await authentication.authorize(type, "confirm");

  return (
    <>
      <dt className="text-neutral-500 mt-4 flex gap-2 items-center">
        {icon} {name}
      </dt>

      <dd className="flex gap-4 items-center">
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {/* @ts-expect-error Don't know how to improve this */}
          {entity[camelCase(type)] || <span className="italic">-</span>}
        </span>

        <HistoryModal
          type={type}
          entity={entity}
          showCreate={showCreate}
          showDelete={showDelete}
          showConfirm={showConfirm}
        />
      </dd>
    </>
  );
};
