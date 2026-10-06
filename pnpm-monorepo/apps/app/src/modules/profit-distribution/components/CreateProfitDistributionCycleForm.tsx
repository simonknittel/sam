import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { Note } from "@/modules/common/components/Note";
import { RichText } from "@/modules/common/components/RichText";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useNow } from "next-intl";
import { useState } from "react";
import { FaChevronDown, FaSave } from "react-icons/fa";
import { createProfitDistributionCycle } from "../actions/createProfitDistributionCycle";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateProfitDistributionCycleForm = ({
  className,
  onSuccess,
}: Props) => {
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(createProfitDistributionCycle, { onSuccess });
  const [end, setEnd] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  /** The form opens in a modal, thus the date of the opening is sufficient */
  const openedAt = useNow();
  const min = getLocalDateKey(openedAt, ORGANIZATION_TIMEZONE);

  return (
    <form action={formAction} className={clsx(className)}>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setShowInstructions((s) => !s)}
      >
        <FaChevronDown
          className={clsx({
            "rotate-180 transition-transform": showInstructions,
          })}
        />
        Ablauf
      </Button2>

      {showInstructions && (
        <RichText className="mt-2 rounded-secondary bg-tertiary p-2 text-sm">
          <p>
            <strong>SINcome-Zeitraum:</strong> Besteht aus zwei Phasen:
            Sammelphase und Auszahlungsphase.
          </p>
          <p>
            <strong>Sammelphase:</strong> In dieser Phase werden von Membern
            durch Events, Tasks, Gehälter usw. SILC verdient. Zudem verdient die
            Organisation aUEC.
          </p>
          <p>
            <strong>Auszahlungsphase:</strong> In dieser Phase wird der
            verdiente aUEC-Überschuss anhand der SILC aufgeteilt und ausgezahlt.
          </p>

          <ol>
            <li>
              Die Sammelphase beginnt automatisch mit dem Ende der Sammelphase
              vom letzten SINcome-Zeitraum. Member können sich freiwillig
              markieren um sämtliche SILC für diesen SINcome-Zeitraum
              abzutreten.
            </li>

            <li>
              Die Sammelphase wird entweder automatisiert durch das unten
              angegebene Ende oder händisch beendet. Es wird ein Abbild der
              verdienten SILC erstellt und alle Konten werden auf 0 gesetzt. Die
              nächste Sammelphase beginnt.
            </li>

            <li>
              Der aUEC-Überschuss der gerade beendeten Sammelphase wird händisch
              eingetragen. Anschließend wird die Auszahlungsphase händisch
              gestartet. Es kann optional ein Ende angegeben werden.
            </li>

            <li>
              Member müssen selbstständig der Auszahlung zustimmen. Die
              Auszahlungen werden händisch von Economics durchgeführt.
            </li>

            <li>
              Die Auszahlungsphase wird entweder automatisiert durch das
              angegebene Ende oder händisch beendet.
            </li>
          </ol>
        </RichText>
      )}

      <TextInput
        label="Titel"
        name="title"
        hint="max. 128 Zeichen, Beispiele: &ldquo;Q1 2026&rdquo; oder &ldquo;3x SILC-Bonuswochen&rdquo;"
        maxLength={128}
        className="mt-4"
        required
        autoFocus
        defaultValue={getDefaultValueWithFallback("title", "")}
      />

      <DateInput
        name="collectionEndsAt"
        label="Ende der Sammelphase"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        labelClassName="mt-4"
        min={min}
        required
      />

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      {state && "error" in state && (
        <Note
          type="error"
          message={state.error}
          className={clsx("mt-4", {
            "animate-pulse": isPending,
          })}
        />
      )}
    </form>
  );
};
