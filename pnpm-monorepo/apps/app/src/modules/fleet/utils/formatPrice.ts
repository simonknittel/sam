const WHOLE_NUMBER_FORMAT = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

/**
 * Whole dollars, for example "$1.234": the currency format of "de-DE" puts the
 * sign after the number.
 */
export const formatUsdCents = (cents: number) =>
  `$${WHOLE_NUMBER_FORMAT.format(cents / 100)}`;

const DOLLAR_AND_CENTS_FORMAT = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUsdPrice = (cents: number) =>
  cents % 100 === 0
    ? formatUsdCents(cents)
    : `$${DOLLAR_AND_CENTS_FORMAT.format(cents / 100)}`;

export const formatAuec = (auec: number) =>
  `${WHOLE_NUMBER_FORMAT.format(auec)} aUEC`;
