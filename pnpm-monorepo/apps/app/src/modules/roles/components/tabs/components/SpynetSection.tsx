import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { FaInfoCircle } from "react-icons/fa";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  readonly className?: string;
}

export const SpynetSection = ({ className }: Props) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Spynet</h4>

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2 grid grid-cols-4 grid-rows-1 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Aktivität</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Ermöglicht das Aufrufen der Aktivität-Seite im Spynet.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("spynetActivity;read")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Citizen</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Ermöglicht das Aufrufen der Citizen-Seite im Spynet.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("spynetCitizen;read")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Notizen</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Ermöglicht das Aufrufen der Notizen-Seite im Spynet.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("spynetNotes;read")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-bold">Sonstige</h5>

            <Tooltip triggerChildren={<FaInfoCircle />}>
              Ermöglicht das Aufrufen der Sonstige-Seite im Spynet.
            </Tooltip>
          </div>

          <YesNoCheckbox {...register("spynetOther;read")} />
        </div>
      </div>
    </div>
  );
};
