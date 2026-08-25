"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import { Tile } from "@/modules/common/components/Tile";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import {
  startTransition,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEventHandler,
} from "react";
import { FaSave } from "react-icons/fa";
import { updateMyProfile } from "../actions/updateMyProfile";
import {
  BIRTHDAY_DAY_MAX,
  BIRTHDAY_MONTH_MAX,
  BIRTHDAY_MONTH_MIN,
  getMaximumDayOfMonth,
  getMonthName,
} from "../utils/birthday";

/** Both selects submit this when the citizen did not choose a value. */
const NOT_SET = "";

/** Group of the time zone names which have no area, that is UTC */
const OTHER_AREA = "Andere";

interface TimezoneOption {
  readonly name: string;
  readonly label: string;
}

const groupTimezonesByArea = (timezones: readonly string[]) => {
  const groups = new Map<string, TimezoneOption[]>();

  for (const name of timezones) {
    const separatorIndex = name.indexOf("/");
    const area =
      separatorIndex < 0 ? OTHER_AREA : name.slice(0, separatorIndex);
    const label = (
      separatorIndex < 0 ? name : name.slice(separatorIndex + 1)
    ).replaceAll("_", " ");

    const options = groups.get(area);
    if (options) options.push({ name, label });
    else groups.set(area, [{ name, label }]);
  }

  return [...groups].map(([area, options]) => ({ area, options }));
};

const MONTHS = Array.from(
  { length: BIRTHDAY_MONTH_MAX - BIRTHDAY_MONTH_MIN + 1 },
  (unused, index) => BIRTHDAY_MONTH_MIN + index,
);

interface TimezoneOptionGroupProps {
  readonly area: string;
  readonly options: readonly TimezoneOption[];
}

const TimezoneOptionGroup = ({ area, options }: TimezoneOptionGroupProps) => (
  <optgroup label={area}>
    {options.map((option) => (
      <option key={option.name} value={option.name}>
        {option.label}
      </option>
    ))}
  </optgroup>
);

interface Props {
  /** The allowlist the server validates against, see `SUPPORTED_TIMEZONES` */
  readonly timezones: readonly string[];
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
}

export const ProfileForm = ({
  timezones,
  timezone,
  birthdayDay,
  birthdayMonth,
}: Props) => {
  const { state, formAction, isPending } = useAction(updateMyProfile, {
    errorToast: false,
  });

  const [currentTimezone, setCurrentTimezone] = useState(timezone ?? NOT_SET);
  const [currentMonth, setCurrentMonth] = useState(
    birthdayMonth === null ? NOT_SET : String(birthdayMonth),
  );
  const [currentDay, setCurrentDay] = useState(
    birthdayDay === null ? NOT_SET : String(birthdayDay),
  );

  const timezoneInputId = useId();
  const dayInputId = useId();
  const monthInputId = useId();

  const timezoneGroups = useMemo(
    () => groupTimezonesByArea(timezones),
    [timezones],
  );

  const maximumDay =
    currentMonth === NOT_SET
      ? BIRTHDAY_DAY_MAX
      : getMaximumDayOfMonth(Number(currentMonth));

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMonth = event.target.value;
    setCurrentMonth(nextMonth);

    if (nextMonth === NOT_SET) {
      setCurrentDay(NOT_SET);
      return;
    }

    const nextMaximumDay = getMaximumDayOfMonth(Number(nextMonth));
    if (currentDay !== NOT_SET && Number(currentDay) > nextMaximumDay)
      setCurrentDay(String(nextMaximumDay));
  };

  /**
   * Submitted by hand rather than through `<form action>`: React resets a
   * form once its action resolves, which snaps every select back to the
   * option the server rendered as selected. The component's state does not
   * change with it, so React never writes the DOM back and the selects end
   * up showing the values the profile had before the save.
   */
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <Tile
      heading="Profil"
      subheading="Diese Angaben sehen alle Citizens, die dein Profil öffnen können."
    >
      <form
        onSubmit={handleSubmit}
        data-onboarding-target={OnboardingTargetId.ProfileForm}
      >
        <label htmlFor={timezoneInputId} className="block mb-2 text-white/90">
          Zeitzone
        </label>
        <Select
          id={timezoneInputId}
          name="timezone"
          value={currentTimezone}
          onChange={(event) => setCurrentTimezone(event.target.value)}
        >
          <option value={NOT_SET}>Nicht angegeben</option>

          {timezoneGroups.map((group) => (
            <TimezoneOptionGroup
              key={group.area}
              area={group.area}
              options={group.options}
            />
          ))}
        </Select>

        <p className="mt-6 mb-2 text-white/90">Geburtstag</p>

        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor={dayInputId} className="block mb-2 text-white/40">
              Tag
            </label>
            <Select
              id={dayInputId}
              name="birthdayDay"
              value={currentDay}
              onChange={(event) => setCurrentDay(event.target.value)}
            >
              <option value={NOT_SET}>Nicht angegeben</option>

              {Array.from({ length: maximumDay }, (unused, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex-1">
            <label htmlFor={monthInputId} className="block mb-2 text-white/40">
              Monat
            </label>
            <Select
              id={monthInputId}
              name="birthdayMonth"
              value={currentMonth}
              onChange={handleMonthChange}
            >
              <option value={NOT_SET}>Nicht angegeben</option>

              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <p className="mt-2 text-xs text-white/40">
          Das Jahr wird nicht gespeichert.
        </p>

        <ActionErrorNote className="mt-4" state={state} />

        <div className="flex justify-end mt-4">
          <Button2 type="submit" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </form>
    </Tile>
  );
};
