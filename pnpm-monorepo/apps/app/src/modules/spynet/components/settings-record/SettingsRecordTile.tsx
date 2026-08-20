import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { Actions } from "@/modules/common/components/Actions";
import { Tile } from "@/modules/common/components/Tile";
import type { ReactNode } from "react";
import { CreateSettingsRecord } from "./CreateSettingsRecord";
import { DeleteSettingsRecord } from "./DeleteSettingsRecord";
import type { SettingsRecord } from "./SettingsRecord";
import { UpdateSettingsRecord } from "./UpdateSettingsRecord";

type SettingsRecordAction = (formData: FormData) => Promise<ActionResponse>;

interface Props {
  readonly className?: string;
  readonly heading: string;
  readonly description: ReactNode;
  readonly emptyLabel: string;
  /** The record type's own CRUD actions — see NoteTypesTile for an example */
  readonly actions: {
    readonly create: SettingsRecordAction;
    readonly update: SettingsRecordAction;
    readonly delete: SettingsRecordAction;
  };
  readonly records: SettingsRecord[];
}

export const SettingsRecordTile = ({
  className,
  heading,
  description,
  emptyLabel,
  actions,
  records,
}: Props) => {
  const sortedRecords = records.toSorted((first, second) =>
    first.name.localeCompare(second.name),
  );

  return (
    <Tile
      heading={heading}
      cta={<CreateSettingsRecord action={actions.create} />}
      className={className}
    >
      <p className="mb-4 text-sm">{description}</p>

      {sortedRecords.map((record) => (
        <div
          key={record.id}
          className="flex justify-between gap-2 py-2 items-center"
        >
          <div className="flex flex-col">
            <p className="font-bold">{record.name}</p>
            <p className="text-neutral-500 text-sm">{record.id}</p>
          </div>

          <div className="flex gap-4 items-center">
            <Actions>
              <UpdateSettingsRecord action={actions.update} record={record} />
              <DeleteSettingsRecord action={actions.delete} record={record} />
            </Actions>
          </div>
        </div>
      ))}

      {sortedRecords.length <= 0 && (
        <p className="text-neutral-500 italic">{emptyLabel}</p>
      )}
    </Tile>
  );
};
