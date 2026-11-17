const WHOLE_NUMBER_FORMAT = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

/**
 * A fleet value in whole dollars, with the dollar sign in front and the
 * German separators of the other numbers of the app, for example "$1.234".
 * The currency format of "de-DE" puts the sign after the number.
 */
export const formatUsdCents = (cents: number) =>
  `$${WHOLE_NUMBER_FORMAT.format(cents / 100)}`;

const DOLLAR_AND_CENTS_FORMAT = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A store price, with cents only when it has cents: "$975" or "$47,50" */
export const formatUsdPrice = (cents: number) =>
  cents % 100 === 0
    ? formatUsdCents(cents)
    : `$${DOLLAR_AND_CENTS_FORMAT.format(cents / 100)}`;

/** An in-game price or a fleet value, for example "26.400.000 aUEC" */
export const formatAuec = (auec: number) =>
  `${WHOLE_NUMBER_FORMAT.format(auec)} aUEC`;
