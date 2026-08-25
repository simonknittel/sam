import { requireAuthentication } from "@/modules/auth/server";
import type { GenericEntityLogType } from "@/types";
import { type Entity } from "@sam-monorepo/database/client";
import { type ReactNode } from "react";
import { HistoryModal } from "./HistoryModal";

interface Props {
  readonly type: GenericEntityLogType;
  readonly icon?: ReactNode;
  readonly name: string;
  /** The content of the latest confirmed log entry of this type */
  readonly value: string | null;
  readonly entity: Pick<Entity, "id">;
}

export const OverviewSection = async ({
  type,
  icon,
  name,
  value,
  entity,
}: Props) => {
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
          {value || <span className="italic">-</span>}
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
