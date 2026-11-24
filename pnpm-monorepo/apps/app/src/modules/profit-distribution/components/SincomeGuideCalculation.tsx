import clsx from "clsx";

enum Operator {
  Divide = "÷",
  Multiply = "×",
}

const OPERATOR_WORDS: Record<Operator, string> = {
  [Operator.Divide]: "geteilt durch",
  [Operator.Multiply]: "mal",
};

interface SignProps {
  readonly sign: string;
  readonly words: string;
}

const Sign = ({ sign, words }: SignProps) => {
  return (
    <span className="text-center font-mono text-2xl text-white/40">
      <span aria-hidden>{sign}</span>
      <span className="sr-only">{words}</span>
    </span>
  );
};

/**
 * The surplus and the share agree with the screenshot of the payout in the
 * guide
 */
const EXAMPLE_AUEC_PROFIT = 42_000_000;
const EXAMPLE_SILC_OF_ALL_PARTICIPANTS = 600;
const EXAMPLE_SILC_OF_USER = 120;

const AUEC_PER_SILC = EXAMPLE_AUEC_PROFIT / EXAMPLE_SILC_OF_ALL_PARTICIPANTS;
const SHARE_OF_USER = EXAMPLE_SILC_OF_USER * AUEC_PER_SILC;

const format = (value: number) => value.toLocaleString("de");

interface TermProps {
  readonly value: string;
  readonly label: string;
  readonly isResult?: boolean;
}

const Term = ({ value, label, isResult = false }: TermProps) => {
  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col rounded-secondary border px-4 py-3 text-center",
        {
          "border-white/5 bg-white/5": !isResult,
          "border-brand-red-500/40 bg-brand-red-500/10": isResult,
        },
      )}
    >
      <span className="font-mono text-xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-white/60">{label}</span>
    </div>
  );
};

interface RowProps {
  readonly left: TermProps;
  readonly operator: Operator;
  readonly right: TermProps;
  readonly result: TermProps;
}

const Row = ({ left, operator, right, result }: RowProps) => {
  return (
    <li className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      <Term {...left} />
      <Sign sign={operator} words={OPERATOR_WORDS[operator]} />
      <Term {...right} />
      <Sign sign="=" words="ergibt" />
      <Term {...result} isResult />
    </li>
  );
};

export const SincomeGuideCalculation = () => {
  return (
    <ol className="flex flex-col gap-8 md:gap-4">
      <Row
        left={{
          value: `${format(EXAMPLE_AUEC_PROFIT)} aUEC`,
          label: "Überschuss des Zeitraums",
        }}
        operator={Operator.Divide}
        right={{
          value: `${format(EXAMPLE_SILC_OF_ALL_PARTICIPANTS)} SILC`,
          label: "SILC aller Teilnehmer",
        }}
        result={{
          value: `${format(AUEC_PER_SILC)} aUEC`,
          label: "pro SILC",
        }}
      />

      <Row
        left={{
          value: `${format(EXAMPLE_SILC_OF_USER)} SILC`,
          label: "deine SILC",
        }}
        operator={Operator.Multiply}
        right={{
          value: `${format(AUEC_PER_SILC)} aUEC`,
          label: "pro SILC",
        }}
        result={{
          value: `${format(SHARE_OF_USER)} aUEC`,
          label: "dein Anteil",
        }}
      />
    </ol>
  );
};
