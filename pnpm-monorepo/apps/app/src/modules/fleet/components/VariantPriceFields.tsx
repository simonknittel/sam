import { NumberInput } from "@/modules/common/components/form/NumberInput";

interface Props {
  readonly storePriceUsdCents?: number | null;
  readonly inGamePriceAuec?: number | null;
  readonly loading?: boolean;
}

const STORE_PRICE_LABEL = "Aktueller Wert (USD)";
const IN_GAME_PRICE_LABEL = "Aktueller Wert (aUEC)";

const PriceFieldSkeleton = ({ label }: { readonly label: string }) => (
  <>
    <p className="mt-6 mb-2 text-white/90">{label}</p>
    <div className="h-10 animate-pulse rounded-secondary bg-neutral-900" />
  </>
);

/**
 * `parseVariantFieldsFormData()` converts the fields; an empty field is no
 * price
 */
export const VariantPriceFields = ({
  storePriceUsdCents,
  inGamePriceAuec,
  loading = false,
}: Props) => {
  if (loading)
    return (
      <>
        <PriceFieldSkeleton label={STORE_PRICE_LABEL} />
        <PriceFieldSkeleton label={IN_GAME_PRICE_LABEL} />
      </>
    );

  return (
    <>
      <NumberInput
        label={STORE_PRICE_LABEL}
        labelClassName="mt-6"
        name="storePriceUsd"
        min={0}
        step={0.01}
        defaultValue={
          storePriceUsdCents === null || storePriceUsdCents === undefined
            ? ""
            : storePriceUsdCents / 100
        }
        hint="optional, der aktuelle Preis im Star Citizen Store"
      />

      <NumberInput
        label={IN_GAME_PRICE_LABEL}
        labelClassName="mt-6"
        name="inGamePriceAuec"
        min={0}
        step={1}
        defaultValue={inGamePriceAuec ?? ""}
        hint="optional, der aktuelle Preis im Spiel"
      />
    </>
  );
};
