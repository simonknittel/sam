const isFilled = (value: FormDataEntryValue | null | undefined) =>
  typeof value === "string" && value.trim() !== "";

/**
 * An empty field is no price. A value that is not a number goes to the schema
 * of the use case, which rejects it.
 */
const parsePrice = (
  value: FormDataEntryValue | null,
  toStoredValue: (price: number) => number,
) => {
  if (!isFilled(value)) return null;

  const price = Number(value);
  return Number.isFinite(price) ? toStoredValue(price) : value;
};

/**
 * The forms send all tag rows and all link rows, thus a form without rows
 * removes the tags or the links.
 */
export const parseVariantFieldsFormData = (formData: FormData) => {
  const tagValues = formData.getAll("tagValues[]");
  const linkUrls = formData.getAll("linkUrls[]");

  return {
    store_price_usd_cents: parsePrice(
      formData.get("storePriceUsd"),
      (dollars) => Math.round(dollars * 100),
    ),
    // The schema rejects a fraction of an aUEC
    in_game_price_auec: parsePrice(
      formData.get("inGamePriceAuec"),
      (auec) => auec,
    ),
    wiki_page_id: formData.has("wikiPageId")
      ? formData.get("wikiPageId")
      : undefined,
    tags: formData
      .getAll("tagKeys[]")
      .map((key, index) => ({ key, value: tagValues[index] }))
      .filter(({ key, value }) => isFilled(key) && isFilled(value)),
    links: formData
      .getAll("linkServiceNames[]")
      .map((service, index) => ({ service, url: linkUrls[index] })),
  };
};
