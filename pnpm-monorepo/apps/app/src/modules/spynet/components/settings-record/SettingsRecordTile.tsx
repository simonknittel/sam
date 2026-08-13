import { Actions } from "@/modules/common/components/Actions";
import { Tile } from "@/modules/common/components/Tile";
import type { ReactNode } from "react";
import { CreateSettingsRecord } from "./CreateSettingsRecord";
import { DeleteSettingsRecord } from "./DeleteSettingsRecord";
import type { SettingsRecord } from "./SettingsRecord";
import { UpdateSettingsRecord } from "./UpdateSettingsRecord";

interface Props {
  readonly className?: string;
  readonly heading: string;
  readonly description: ReactNode;
  readonly emptyLabel: string;
  readonly apiPath: string;
  readonly records: SettingsRecord[];
}

export const SettingsRecordTile = ({
  className,
  heading,
  description,
  emptyLabel,
  apiPath,
  records,
}: Props) => {
  const sortedRecords = records.toSorted((first, second) =>
    first.name.localeCompare(second.name),
  );

  return (
    <Tile
      heading={heading}
      cta={<CreateSettingsRecord apiPath={apiPath} />}
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
              <UpdateSettingsRecord apiPath={apiPath} record={record} />
              <DeleteSettingsRecord apiPath={apiPath} record={record} />
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
