import { CalendarEntryType } from "@sam-monorepo/domain";
import type { IconType } from "react-icons";
import { FaBirthdayCake, FaCoins, FaPiggyBank } from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import { MdCelebration, MdEvent, MdTaskAlt } from "react-icons/md";

/** The icons of the other apps, where the type has an app of its own */
const ICONS: Record<CalendarEntryType, IconType> = {
  [CalendarEntryType.Event]: MdEvent,
  [CalendarEntryType.Birthday]: FaBirthdayCake,
  [CalendarEntryType.TaskDeadline]: MdTaskAlt,
  [CalendarEntryType.SilcSalary]: FaCoins,
  [CalendarEntryType.ProfitDistribution]: FaPiggyBank,
  [CalendarEntryType.PenaltyExpiry]: FaScaleBalanced,
  [CalendarEntryType.Seasonal]: MdCelebration,
};

interface Props {
  readonly className?: string;
  readonly type: CalendarEntryType;
}

/** Decorative: the text next to the icon names the entry */
export const CalendarEntryTypeIcon = ({ className, type }: Props) => {
  const Icon = ICONS[type];

  return <Icon className={className} aria-hidden />;
};
