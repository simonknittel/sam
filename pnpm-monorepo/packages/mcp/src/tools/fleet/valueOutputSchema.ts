import * as z from "zod";

const amountSchema = z.number().int().min(0);

const valuesBySourceSchema = z.strictObject({
  store: amountSchema,
  in_game: amountSchema,
  unknown: amountSchema.describe("The ships without an acquisition source."),
});

export const valueOutputSchema = z
  .strictObject({
    usd_cents: valuesBySourceSchema.describe(
      "The sums of the store prices, in USD cents.",
    ),
    auec: valuesBySourceSchema.describe(
      "The sums of the in-game prices, in aUEC.",
    ),
  })
  .describe(
    "The value of the ships that agree with the filters for each acquisition source: the sums of the prices of their variants. A variant without a price counts 0.",
  );
