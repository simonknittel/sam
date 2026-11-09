const isFilled = (value: FormDataEntryValue | undefined) =>
  typeof value === "string" && value.trim() !== "";

/**
 * The fields of the variant forms that the create and the update share. The
 * forms send all tag rows and all link rows, thus a form without rows removes
 * the tags or the links. A tag row with an empty field is left out.
 */
export const parseVariantFieldsFormData = (formData: FormData) => {
  const tagValues = formData.getAll("tagValues[]");
  const linkUrls = formData.getAll("linkUrls[]");

  return {
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
