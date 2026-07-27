import type { Flow } from "@/generated/prisma/client";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { Fragment } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  readonly className?: string;
  readonly flows: Flow[];
}

export const CareerSection = ({ className, flows }: Props) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Karriere</h4>

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2 grid grid-cols-2 grid-rows-2 gap-4">
        {flows.map((flow) => (
          <Fragment key={flow.id}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h5 className="font-bold">{flow.name} lesen</h5>

                <Tooltip triggerChildren={<FaInfoCircle />}>
                  Nutzer mit dieser Berechtigung können die {flow.name}
                  -Karriereseite aufrufen. Sie können nur die Rollen und
                  Zertifikate sehen, die für sie sichtbar sind.
                </Tooltip>
              </div>

              <YesNoCheckbox {...register(`career;read;flowId=${flow.id}`)} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <h5 className="font-bold">{flow.name} bearbeiten</h5>

                <Tooltip triggerChildren={<FaInfoCircle />}>
                  Nutzer mit dieser Berechtigung können die Darstellung der{" "}
                  {flow.name}-Karriereseite bearbeiten. Hierzu werden sie alle
                  Rollen und Zertifikate sehen können.
                </Tooltip>
              </div>

              <YesNoCheckbox {...register(`career;update;flowId=${flow.id}`)} />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};
