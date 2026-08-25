import { requireAuthentication } from "@/modules/auth/server";
import type { GenericEntityLogType } from "@/types";
import { type Entity } from "@sam-monorepo/database/client";
import { type ReactNode } from "react";
import { ProfileAttribute } from "../ProfileAttribute";
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
    <ProfileAttribute icon={icon} name={name}>
      {value ? (
        <span className="truncate" title={value}>
          {value}
        </span>
      ) : (
        <span className="italic">-</span>
      )}

      <HistoryModal
        type={type}
        entity={entity}
        showCreate={showCreate}
        showDelete={showDelete}
        showConfirm={showConfirm}
      />
    </ProfileAttribute>
  );
};
