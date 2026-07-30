import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const Formatting = ({ className }: Props) => {
  return (
    <Tooltip triggerChildren="Formatierungshilfe" className={clsx(className)}>
      <p>
        <strong>Erwähnungen</strong>
      </p>
      <p>Organisation: @org:&lt;spectrum_id&gt; (Beispiel: @org:S1NISTER)</p>
      <p>Citizen: @citizen:&lt;spectrum_id&gt; (Beispiel: @citizen:2781)</p>
    </Tooltip>
  );
};
