import clsx from "clsx";
import { LIVE_STATUS_KINDS, type LiveStatusState } from "../utils/liveStatus";
import { LiveStatusSince } from "./LiveStatusSince";
import { LiveStatusUncertainLabel } from "./LiveStatusUncertainLabel";

interface Props {
  readonly state: LiveStatusState;
  readonly now: Date;
}

export const LiveStatusStateRow = ({ state, now }: Props) => {
  const { title, icon: Icon } = LIVE_STATUS_KINDS[state.kind];
  const text = state.label ? `${title}: ${state.label}` : title;

  return (
    <li
      className={clsx("flex items-center gap-2", {
        "opacity-60": state.isUncertain,
      })}
    >
      <Icon className="shrink-0 text-white/40" aria-hidden />
      <span className="min-w-0 flex-1 truncate" title={text}>
        {text}
      </span>
      {state.isUncertain && <LiveStatusUncertainLabel />}
      <LiveStatusSince since={state.since} now={now} />
    </li>
  );
};
