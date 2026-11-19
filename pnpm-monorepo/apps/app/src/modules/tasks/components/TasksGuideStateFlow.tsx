import clsx from "clsx";
import { FaArrowRight } from "react-icons/fa6";

enum StateTone {
  Open = "open",
  Success = "success",
  Ended = "ended",
}

interface StateProps {
  readonly title: string;
  readonly description: string;
  readonly tone: StateTone;
}

const State = ({ title, description, tone }: StateProps) => {
  return (
    <li
      className={clsx("rounded-secondary border-l-4 bg-white/5 px-4 py-3", {
        "border-blue-500": tone === StateTone.Open,
        "border-green-500": tone === StateTone.Success,
        "border-white/30": tone === StateTone.Ended,
      })}
    >
      <p className="font-bold">{title}</p>
      <p className="text-sm text-white/60">{description}</p>
    </li>
  );
};

/** The states of a task: an open task ends in one of three end states */
export const TasksGuideStateFlow = () => {
  return (
    <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_2fr]">
      <ul>
        <State
          title="Offen"
          description="Citizens können den Task annehmen und erledigen. Nur ein offener Task kann sich noch ändern."
          tone={StateTone.Open}
        />
      </ul>

      <FaArrowRight
        aria-hidden
        className="mx-auto rotate-90 text-2xl text-white/40 md:rotate-0"
      />

      <ul className="flex flex-col gap-2">
        <State
          title="Erfüllt"
          description="Der Ersteller hat bestätigt, wer den Task erfüllt hat."
          tone={StateTone.Success}
        />
        <State
          title="Abgebrochen"
          description="Der Ersteller hat den Task beendet, ohne Belohnung."
          tone={StateTone.Ended}
        />
        <State
          title="Abgelaufen"
          description="Das Ablaufdatum ist vorbei."
          tone={StateTone.Ended}
        />
      </ul>
    </div>
  );
};
