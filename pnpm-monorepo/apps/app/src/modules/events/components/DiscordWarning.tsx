import Note from "@/modules/common/components/Note";
import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const DiscordWarning = ({ className }: Props) => {
  return (
    <Note
      type="warning"
      message={
        <p>
          Du musst dich erst in Discord bei diesem Event anmelden, bevor du dich
          hier in der Aufstellung anmelden kannst.
        </p>
      }
      className={clsx("max-w-none!", className)}
    />
  );
};
