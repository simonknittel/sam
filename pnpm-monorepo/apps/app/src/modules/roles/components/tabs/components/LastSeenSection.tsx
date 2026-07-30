import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { usePermissionsContext } from "../../PermissionsContext";

interface Props {
  className?: string;
}

const LastSeenSection = ({ className }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <div className={clsx(className)}>
      <h4 className="font-bold">Zuletzt gesehen</h4>

      <div className="border border-neutral-700 p-4 rounded-secondary mt-2 grid grid-cols-3">
        <div>
          <h5 className="font-bold mb-2">Lesen</h5>
          <YesNoCheckbox {...register("lastSeen;read")} />
        </div>
      </div>
    </div>
  );
};

export default LastSeenSection;
