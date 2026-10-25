import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";

interface Props {
  readonly enabled: boolean | null;
}

/** The status of the last Discord login of the user */
export const DiscordTwoFactorStatus = ({ enabled }: Props) => {
  if (enabled === null)
    return (
      <span
        className="text-neutral-500 italic"
        title="Seit SAM den Status speichert, hat keine Anmeldung über Discord einen Status übermittelt"
      >
        Unbekannt
      </span>
    );

  return enabled ? (
    <span className="flex items-center gap-1">
      <FaCircleCheck className="text-green-500" /> Aktiv
    </span>
  ) : (
    <span className="flex items-center gap-1">
      <FaCircleXmark className="text-red-500" /> Inaktiv
    </span>
  );
};
